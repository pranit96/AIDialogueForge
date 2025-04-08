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

// Agent personalities
export const agentPersonalities = pgTable("agent_personalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  model: text("model").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  color: text("color").notNull(),
  active: boolean("active").default(true),
});

export const insertAgentPersonalitySchema = createInsertSchema(agentPersonalities).omit({
  id: true,
});

export type InsertAgentPersonality = z.infer<typeof insertAgentPersonalitySchema>;
export type AgentPersonality = typeof agentPersonalities.$inferSelect;

// Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true),
  userId: integer("user_id").references(() => users.id),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  isActive: true,
  userId: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  agentPersonalityId: integer("agent_personality_id").notNull().references(() => agentPersonalities.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
