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

// Define the interface for all storage operations
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
  
  // Conversation operations
  getConversations(userId?: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation, userId?: number): Promise<Conversation>;
  endConversation(id: number): Promise<Conversation | undefined>;
  
  // Message operations
  getMessagesForConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
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
  
  // Conversation operations
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
  
  async createConversation(conversation: InsertConversation, userId?: number): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({ ...conversation, userId })
      .returning();
    return newConversation;
  }
  
  async endConversation(id: number): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        endedAt: new Date(),
        isActive: false 
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  // Message operations
  async getMessagesForConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
}

// Export a singleton instance of the storage implementation
export const storage = new DatabaseStorage();
