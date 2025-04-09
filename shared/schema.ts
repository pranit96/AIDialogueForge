import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agent personalities with enhanced traits and characteristics
export const agentPersonalities = pgTable("agent_personalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").default("Agent"), // Professional title or role of the agent
  description: text("description").notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  color: text("color").notNull(),
  active: boolean("active").default(true),
  avatar: text("avatar"), // Optional avatar image URL or icon identifier
  
  // Personality characteristics
  archetype: text("archetype").default("balanced"), // sage, explorer, creator, ruler, etc.
  voiceType: text("voice_type").default("neutral"), // analytical, creative, dramatic, etc.
  personalityTraits: text("personality_traits").array(), // logical, emotional, creative, etc.
  speechPattern: text("speech_pattern"), // Distinctive way of speaking
  quirks: text("quirks").array(), // Unique characteristics or behaviors
  
  // Knowledge and expertise 
  knowledgeDomains: text("knowledge_domains").array(), // Areas of expertise
  specialties: text("specialties").array(), // Specific topics of deep expertise
  perspective: text("perspective"), // Philosophical or ideological viewpoint
  
  // Response characteristics
  responseStyle: text("response_style").default("balanced"), // brief, detailed, poetic, technical, etc.
  temperament: text("temperament").default("neutral"), // calm, excitable, cautious, bold, etc.
  temperature: text("temperature").default("0.7"), // Model temperature for varied responses
  maxTokens: integer("max_tokens"), // Maximum response length
  
  // Meta information
  userId: integer("user_id").references(() => users.id), // Creator of the custom agent  
  isPublic: boolean("is_public").default(false), // Whether other users can use this agent
  isDefault: boolean("is_default").default(false), // Whether this is a system-defined preset
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentPersonalitySchema = createInsertSchema(agentPersonalities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDefault: true,
}).extend({
  // Enhanced validations for key fields
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  
  // Enhanced model selection with latest Groq models
  model: z.string().describe("The Groq LLM model to use for this agent"),
  
  // Temperature validation
  temperature: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 1;
    },
    {
      message: "Temperature must be a number between 0 and 1",
      path: ["temperature"]
    }
  ).default("0.7"),
  
  // System prompt validation and defaults
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters"),
  
  // Expanded list of archetypes including new neural entity types
  archetype: z.string().default('balanced'),
  
  // Default color if not provided
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").default("#9D30A5")
});

export type InsertAgentPersonality = z.infer<typeof insertAgentPersonalitySchema>;
export type AgentPersonality = typeof agentPersonalities.$inferSelect;

// Conversations with enhanced session management
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  summary: text("summary"), // AI-generated summary of the conversation
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true),
  
  // Session management
  sessionId: text("session_id").notNull().unique(), // Unique identifier for the conversational session
  lastActivity: timestamp("last_activity").defaultNow(), // Timestamp of the last interaction
  status: text("status").default("active"), // active, paused, completed, archived
  
  // Conversation settings
  maxTurns: integer("max_turns"), // Maximum number of back-and-forth exchanges
  currentTurn: integer("current_turn").default(0), // Current exchange number
  
  // Conversation configuration
  visibility: text("visibility").default("private"), // private, public, shared
  conversationMode: text("conversation_mode").default("standard"), // standard, debate, brainstorm, etc.
  conversationSettings: jsonb("conversation_settings"), // Additional configuration parameters
  
  // User and agent relationships
  userId: integer("user_id").references(() => users.id),
  participatingAgents: integer("participating_agents").array(), // Array of agent IDs participating in the conversation
  
  // Tagging and categorization
  tags: text("tags").array(), // User-defined or automatically generated tags
  category: text("category"), // General category of conversation
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  lastActivity: true,
  isActive: true,
  currentTurn: true,
  userId: true,
}).extend({
  // Add validation for sessionId to ensure it's generated properly
  sessionId: z.string().uuid().describe("Unique identifier for the conversation session"),
  // Add reasonable defaults for optional fields
  conversationMode: z.enum(['standard', 'debate', 'brainstorm', 'interview', 'roleplay']).optional().default('standard'),
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages with enhanced content and tracking
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  agentPersonalityId: integer("agent_personality_id").notNull().references(() => agentPersonalities.id),
  
  // Content fields
  content: text("content").notNull(), // The actual message text
  richContent: jsonb("rich_content"), // Additional structured content (code, formulas, etc.)
  
  // Message characteristics
  messageType: text("message_type").default("standard"), // standard, question, response, summary, system
  emotionalTone: text("emotional_tone"), // detected emotional tone of the message
  
  // Context and relationships
  replyToMessageId: integer("reply_to_message_id"), // For threaded conversations
  mentionedAgentIds: integer("mentioned_agent_ids").array(), // Agents referenced in the message
  
  // Tracking and analytics
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  processTime: integer("process_time"), // Time taken to generate the response in ms
  tokenCount: integer("token_count"), // Number of tokens used
  
  // AI generation metadata
  model: text("model"), // The specific model used to generate this message
  temperature: text("temperature"), // The temperature used for this specific message
  thinking: text("thinking"), // Optional chain-of-thought or reasoning process
  
  // Extended metadata
  metadata: jsonb("metadata"), // Any additional data about the message
  isEdited: boolean("is_edited").default(false), // Whether the message was edited
  reactions: jsonb("reactions"), // User/agent reactions to the message
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
  isEdited: true,
}).extend({
  // Add validations for specific message types
  messageType: z.enum(['standard', 'question', 'response', 'summary', 'system', 'thinking', 'error'])
    .default('standard'),
  
  // Make content required and validate
  content: z.string().min(1, "Message content cannot be empty"),
  
  // Add default empty object for richContent
  richContent: z.any().optional().default({}),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
