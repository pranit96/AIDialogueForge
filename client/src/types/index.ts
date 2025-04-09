// Agent personality types
export interface AgentPersonality {
  id: number;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  color: string;
  active: boolean;
  archetype: string; // Personality archetype (sage, explorer, etc.)
  title?: string;     // Title or role descriptor
  avatar?: string;
  voiceType?: string;
  personalityTraits?: string[];
  knowledgeDomains?: string[];
  responseStyle?: string;
  temperature?: string;
  speechPattern?: string;
  userId?: number;
  isPublic?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Conversation types
export interface Conversation {
  id: number;
  topic: string;
  summary?: string;            // AI-generated summary
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  sessionId: string;           // Unique identifier for conversation session
  lastActivity?: string;       // Timestamp of the last interaction
  status?: string;             // active, paused, completed, archived
  maxTurns?: number;           // Maximum number of turns
  currentTurn?: number;        // Current turn number
  visibility?: string;         // private, public, shared
  conversationMode?: string;   // standard, debate, brainstorm, etc.
  conversationSettings?: any;  // Additional configuration parameters
  participatingAgents?: number[]; // Array of agent IDs in the conversation
  tags?: string[];             // User-defined or auto-generated tags
  category?: string;           // General category
}

// Message types
export interface Message {
  id: number;
  conversationId: number;
  agentPersonalityId: number;
  content: string;
  richContent?: any;            // Enhanced content (code, formulas, etc.)
  messageType?: string;         // standard, question, response, summary, system
  emotionalTone?: string;       // Detected emotional tone
  replyToMessageId?: number;    // For threaded conversations
  mentionedAgentIds?: number[]; // References to other agents
  timestamp: string;
  processTime?: number;         // Time taken to generate in ms
  tokenCount?: number;          // Number of tokens used
  model?: string;               // Model used to generate this message
  temperature?: string;         // Temperature used for this message
  thinking?: string;            // Chain-of-thought reasoning
  metadata?: any;
  isEdited?: boolean;
  reactions?: any;
  // Additional client-side properties
  agentName?: string;
  agentColor?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'NEW_MESSAGE' | 'NEW_CONVERSATION' | 'END_CONVERSATION';
  data: any;
}

// Conversation control settings
export interface ConversationSettings {
  speed: number;
  verbosity: number;
  creativity: 'LOW' | 'MID' | 'HIGH';
}

// System stats
export interface SystemStats {
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  models: string[];
  cpu: number;
  memory: string;
  tokens: number;
}
