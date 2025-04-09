import { 
  users, type User, type InsertUser,
  agentPersonalities, type AgentPersonality, type InsertAgentPersonality,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { neon } from "@neondatabase/serverless";

// Create a PostgreSQL session store
const PgSession = connectPgSimple(session);

// Define the enhanced interface for all storage operations
export interface IStorage {
  // Session store for express-session
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent personality operations
  getAgentPersonalities(): Promise<AgentPersonality[]>;
  getAgentPersonality(id: number): Promise<AgentPersonality | undefined>;
  createAgentPersonality(personality: InsertAgentPersonality): Promise<AgentPersonality>;
  updateAgentPersonality(id: number, personality: Partial<AgentPersonality>): Promise<AgentPersonality | undefined>;
  deleteAgentPersonality(id: number): Promise<boolean>;
  
  // Enhanced conversation operations
  getConversations(userId?: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationBySessionId(sessionId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation, userId?: number): Promise<Conversation>;
  endConversation(id: number): Promise<Conversation | undefined>;
  updateConversationActivity(id: number): Promise<Conversation | undefined>;
  updateConversationStatus(id: number, status: string): Promise<Conversation | undefined>;
  updateConversationTurn(id: number): Promise<Conversation | undefined>;
  
  // Enhanced message operations
  getMessagesForConversation(conversationId: number): Promise<Message[]>;
  getMessagesByType(conversationId: number, messageType: string): Promise<Message[]>;
  getMessagesByAgentId(conversationId: number, agentPersonalityId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined>;
  getLatestMessageForAgent(conversationId: number, agentPersonalityId: number): Promise<Message | undefined>;
}

// Database implementation of the storage interface
export class DatabaseStorage implements IStorage {
  // Session store for express-session
  sessionStore: session.Store;
  
  constructor() {
    // Initialize session store with connect-pg-simple
    this.sessionStore = new PgSession({
      conString: process.env.DATABASE_URL || "",
      tableName: 'session', // Default table name
      createTableIfMissing: true
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Agent personality operations
  async getAgentPersonalities(): Promise<AgentPersonality[]> {
    return await db.select().from(agentPersonalities);
  }
  
  async getAgentPersonality(id: number): Promise<AgentPersonality | undefined> {
    const [personality] = await db.select().from(agentPersonalities).where(eq(agentPersonalities.id, id));
    return personality;
  }
  
  async createAgentPersonality(personality: InsertAgentPersonality): Promise<AgentPersonality> {
    const [newPersonality] = await db.insert(agentPersonalities).values(personality).returning();
    return newPersonality;
  }
  
  async updateAgentPersonality(id: number, personality: Partial<AgentPersonality>): Promise<AgentPersonality | undefined> {
    const [updatedPersonality] = await db
      .update(agentPersonalities)
      .set(personality)
      .where(eq(agentPersonalities.id, id))
      .returning();
    return updatedPersonality;
  }
  
  async deleteAgentPersonality(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(agentPersonalities)
        .where(eq(agentPersonalities.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting agent personality:', error);
      return false;
    }
  }
  
  // Conversation operations with enhanced session management
  async getConversations(userId?: number): Promise<Conversation[]> {
    if (userId) {
      return await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.startedAt));
    }
    return await db.select().from(conversations).orderBy(desc(conversations.startedAt));
  }
  
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }
  
  async getConversationBySessionId(sessionId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.sessionId, sessionId));
    return conversation;
  }
  
  async createConversation(conversation: InsertConversation, userId?: number): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({ 
        ...conversation, 
        userId,
        lastActivity: new Date(), 
        status: 'active'
      })
      .returning();
    return newConversation;
  }
  
  async updateConversationActivity(id: number): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        lastActivity: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  async updateConversationStatus(id: number, status: string): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        status,
        lastActivity: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  async endConversation(id: number): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        endedAt: new Date(),
        isActive: false,
        status: 'completed',
        lastActivity: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  async updateConversationTurn(id: number): Promise<Conversation | undefined> {
    // First get the current conversation to access the currentTurn value
    const currentConversation = await this.getConversation(id);
    if (!currentConversation) return undefined;
    
    // Then update with the incremented value
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        currentTurn: (currentConversation.currentTurn || 0) + 1,
        lastActivity: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  // Enhanced message operations
  async getMessagesForConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }
  
  async getMessagesByType(conversationId: number, messageType: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.messageType, messageType)
        )
      )
      .orderBy(messages.timestamp);
  }
  
  async getMessagesByAgentId(conversationId: number, agentPersonalityId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.agentPersonalityId, agentPersonalityId)
        )
      )
      .orderBy(messages.timestamp);
  }
  
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values({
      ...message,
      // Set defaults for tracking fields if not provided
      processTime: message.processTime || 0,
      tokenCount: message.tokenCount || 0
    }).returning();
    
    // Update the conversation's last activity timestamp
    if (newMessage.conversationId) {
      await this.updateConversationActivity(newMessage.conversationId);
      await this.updateConversationTurn(newMessage.conversationId);
    }
    
    return newMessage;
  }
  
  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ 
        ...updates,
        isEdited: true 
      })
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }
  
  async getLatestMessageForAgent(conversationId: number, agentPersonalityId: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.agentPersonalityId, agentPersonalityId)
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(1);
    return message;
  }
}

// Export a singleton instance of the storage implementation
export const storage = new DatabaseStorage();
