// Agent personality types
export interface AgentPersonality {
  id: number;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  color: string;
  active: boolean;
}

// Conversation types
export interface Conversation {
  id: number;
  topic: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

// Message types
export interface Message {
  id: number;
  conversationId: number;
  agentPersonalityId: number;
  content: string;
  timestamp: string;
  metadata?: any;
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
