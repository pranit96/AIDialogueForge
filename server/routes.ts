import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Groq } from "groq-sdk";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { 
  insertConversationSchema, 
  insertMessageSchema, 
  type AgentPersonality 
} from "@shared/schema";
import { ZodError } from "zod-validation-error";

// Rate limiting maps
const insightRateLimits = new Map<string, number[]>(); // IP -> timestamp[]
const orchestrationRateLimits = new Map<string, number[]>(); // IP -> timestamp[]

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// WebSocket connection handling
const setupWebSocketServer = (server: Server) => {
  // Create WebSocket server with more permissive settings for Replit environment
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    }
  });

  server.on('upgrade', (request, socket, head) => {
    console.log(`WebSocket upgrade requested from ${request.headers.host}`);
    
    // Handle unexpected socket closures
    socket.on('error', (err) => {
      console.error('WebSocket upgrade socket error:', err);
    });
    
    try {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Error during WebSocket upgrade:', error);
      socket.destroy();
    }
  });
  
  wss.on("connection", (ws, request) => {
    console.log("New client connected");
    
    // Add ping interval to keep connection alive through proxies
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.ping();
        } catch (err) {
          console.error("Ping error:", err);
        }
      }
    }, 30000);
    
    // Send a welcome message to the client
    try {
      ws.send(JSON.stringify({
        type: "CONNECTION_ESTABLISHED",
        data: { message: "Connected to NEXUSMINDS server" }
      }));
    } catch (err) {
      console.error("Failed to send welcome message:", err);
    }
    
    // Handle messages from clients
    ws.on("message", (message) => {
      console.log("Received message:", message.toString());
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    
    ws.on("close", (code, reason) => {
      console.log(`Client disconnected. Code: ${code}, Reason: ${reason ? reason.toString() : "none"}`);
      clearInterval(pingInterval);
    });
  });
  
  // Add error handler for the whole server
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  return wss;
};

// Send message to all connected clients
const broadcastMessage = (wss: WebSocketServer, type: string, data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({ type, data }));
    }
  });
};

// Import the auth setup
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = setupWebSocketServer(httpServer);
  
  // Set up authentication
  setupAuth(app);
  
  // Create default agent personalities if they don't exist
  await initializeDefaultAgentPersonalities();
  
  // API Routes
  
  // Agent Personalities
  app.get("/api/agent-personalities", async (req, res) => {
    try {
      const personalities = await storage.getAgentPersonalities();
      res.json(personalities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent personalities" });
    }
  });
  
  // Conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  app.post("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData, userId);
      
      // Broadcast the new conversation to all clients
      broadcastMessage(wss, "NEW_CONVERSATION", conversation);
      
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  app.post("/api/conversations/:id/end", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      
      // Get conversation to check ownership
      const conversationToEnd = await storage.getConversation(id);
      if (!conversationToEnd) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversationToEnd.userId && conversationToEnd.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const conversation = await storage.endConversation(id);
      
      // Broadcast the conversation end to all clients
      broadcastMessage(wss, "END_CONVERSATION", conversation);
      
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to end conversation" });
    }
  });
  
  // Messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const conversationId = parseInt(req.params.id);
      
      // Get conversation to check ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const messages = await storage.getMessagesForConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // Generate a response from an agent using Groq
  app.post("/api/generate-response", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const { conversationId, agentPersonalityId, topic, previousMessages } = req.body;
      
      if (!conversationId || !agentPersonalityId || !topic) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Get the conversation to check ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the agent personality
      const agentPersonality = await storage.getAgentPersonality(agentPersonalityId);
      if (!agentPersonality) {
        return res.status(404).json({ error: "Agent personality not found" });
      }
      
      // Format previous messages for context
      const formattedPrevMessages = previousMessages.map((msg: any) => ({
        role: "assistant",
        content: `${msg.agentName}: ${msg.content}`
      }));
      
      // Create the prompt for the AI
      const prompt = buildPromptForAgent(agentPersonality, topic, formattedPrevMessages);
      
      // Call Groq API to generate a response
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: agentPersonality.systemPrompt },
          { role: "user", content: prompt }
        ],
        model: agentPersonality.model,
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      });
      
      const responseContent = completion.choices[0].message.content || "";
      
      // Save the generated message to the database
      const message = await storage.createMessage({
        conversationId,
        agentPersonalityId,
        content: responseContent,
        metadata: {
          model: agentPersonality.model,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
        }
      });
      
      // Combine the message with agent details
      const enrichedMessage = {
        ...message,
        agentName: agentPersonality.name,
        agentColor: agentPersonality.color
      };
      
      // Broadcast the new message to all clients
      broadcastMessage(wss, "NEW_MESSAGE", enrichedMessage);
      
      res.json(enrichedMessage);
    } catch (error) {
      console.error("Error generating response:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  
  // Orchestrate conversation among multiple agents
  app.post("/api/conversations/orchestrate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const { conversationId, topic, agentPersonalityIds, turnCount = 3 } = req.body;
      
      if (!conversationId || !topic || !agentPersonalityIds || agentPersonalityIds.length < 2) {
        return res.status(400).json({ 
          error: "Invalid request. Need conversationId, topic, and at least 2 agent personality IDs." 
        });
      }
      
      // Apply rate limiting - 3 orchestrations per 5 minutes per IP
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      if (!orchestrationRateLimits.has(ip)) {
        orchestrationRateLimits.set(ip, []);
      }
      
      const requests = orchestrationRateLimits.get(ip)!;
      // Remove requests older than 5 minutes
      const recentRequests = requests.filter(time => now - time < 5 * 60 * 1000);
      
      if (recentRequests.length >= 3) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 5 * 60 - Math.floor((now - recentRequests[0]) / 1000)
        });
      }
      
      // Add this request to the list
      recentRequests.push(now);
      orchestrationRateLimits.set(ip, recentRequests);
      
      // Get conversation to check ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Start conversation orchestration in background
      orchestrateConversation(conversationId, topic, agentPersonalityIds, turnCount, wss)
        .catch(err => console.error("Orchestration error:", err));
      
      res.json({ success: true, message: "Conversation orchestration started" });
    } catch (error) {
      console.error("Error starting orchestration:", error);
      res.status(500).json({ error: "Failed to start conversation orchestration" });
    }
  });
  
  // Generate insights from a conversation
  app.post("/api/conversations/:id/insights", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      
      // Rate limiting check (3 requests per minute per IP)
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      // Simple in-memory rate limiting
      if (!insightRateLimits.has(ip)) {
        insightRateLimits.set(ip, []);
      }
      
      const requests = insightRateLimits.get(ip)!;
      // Remove requests older than 1 minute
      const recentRequests = requests.filter(time => now - time < 60 * 1000);
      
      if (recentRequests.length >= 3) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60 - Math.floor((now - recentRequests[0]) / 1000)
        });
      }
      
      // Add this request to the list
      recentRequests.push(now);
      insightRateLimits.set(ip, recentRequests);
      
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation and check ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // If the conversation has a userId, make sure it belongs to the current user
      if (conversation.userId && conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const messages = await storage.getMessagesForConversation(conversationId);
      if (messages.length === 0) {
        return res.status(400).json({ error: "No messages in conversation to analyze" });
      }
      
      // Get all agent personalities to enrich message context
      const agentPersonalities = await storage.getAgentPersonalities();
      
      // Format the conversation for analysis
      const conversationText = messages.map(msg => {
        const agent = agentPersonalities.find(a => a.id === msg.agentPersonalityId);
        return `${agent?.name || 'Unknown'}: ${msg.content}`;
      }).join('\n\n');
      
      // Get insights using Groq API
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an AI conversation analyst. Generate key insights from the conversation transcript provided. Identify main themes, key points of agreement/disagreement, and any interesting patterns. Format your response as an array of concise insights, each 1-2 sentences.'
          },
          {
            role: 'user', 
            content: `Topic: ${conversation.topic}\n\nConversation:\n${conversationText}\n\nGenerate 5 key insights from this conversation.`
          }
        ],
        model: 'llama3-8b-8192',  // Use a smaller, faster model for insights
        temperature: 0.7,
        max_tokens: 400,
      });
      
      const response = completion.choices[0].message.content || '';
      
      // Parse the insights from the response
      const insightLines = response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim());  // Remove numbering
        
      // Return the insights
      res.json({ insights: insightLines.slice(0, 5) });
      
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });
  
  return httpServer;
}

// Helper to initialize default agent personalities
async function initializeDefaultAgentPersonalities() {
  const existingPersonalities = await storage.getAgentPersonalities();
  
  if (existingPersonalities.length === 0) {
    // Create default agent personalities
    const defaultPersonalities = [
      {
        name: "ANALYST",
        description: "Logical and analytical thinker that examines topics objectively",
        model: "mixtral-8x7b-32768",
        systemPrompt: "You are an analytical AI that provides logical, fact-based analysis. You examine topics objectively, weigh evidence carefully, and provide reasoned conclusions. Your tone is professional and measured.",
        color: "#41FF83", // Matrix green
        active: true
      },
      {
        name: "CREATIVE",
        description: "Imaginative thinker that offers novel perspectives and ideas",
        model: "llama3-70b-8192",
        systemPrompt: "You are a creative AI that generates novel ideas and perspectives. You look for unexpected connections, use metaphors and analogies, and think outside conventional boundaries. Your tone is enthusiastic and inspirational.",
        color: "#64FFDA", // Cyber mint
        active: true
      },
      {
        name: "CRITIC",
        description: "Critical thinker that challenges assumptions and identifies flaws",
        model: "llama3-8b-8192",
        systemPrompt: "You are a critical AI that challenges assumptions and identifies flaws in reasoning. You ask probing questions, identify potential weaknesses in arguments, and provide constructive criticism. Your tone is direct but fair.",
        color: "#FF417D", // Neon pink
        active: true
      }
    ];
    
    for (const personality of defaultPersonalities) {
      await storage.createAgentPersonality(personality);
    }
  }
}

// Build a prompt for an agent based on context
function buildPromptForAgent(
  agentPersonality: any, 
  topic: string, 
  previousMessages: any[]
) {
  let contextStr = previousMessages.length > 0 
    ? `Previous messages:\n${previousMessages.map(m => m.content).join('\n')}\n\n`
    : '';
  
  return `
    You are ${agentPersonality.name}, a unique AI personality.
    
    Topic for discussion: ${topic}
    
    ${contextStr}
    
    Please provide your perspective on this topic in a concise response (max 3 sentences).
    Don't address the other agents directly, just share your thoughts.
    Respond in your distinctive voice as ${agentPersonality.name}.
  `;
}

// Orchestrate a multi-turn conversation between agents
async function orchestrateConversation(
  conversationId: number, 
  topic: string, 
  agentPersonalityIds: number[], 
  turnCount: number,
  wss: WebSocketServer
) {
  try {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation || !conversation.isActive) {
      console.error("Cannot orchestrate: conversation not found or not active");
      return;
    }
    
    // Get all agent personalities
    const agentPersonalities: AgentPersonality[] = [];
    for (const id of agentPersonalityIds) {
      const personality = await storage.getAgentPersonality(id);
      if (personality) {
        agentPersonalities.push(personality);
      }
    }
    
    if (agentPersonalities.length < 2) {
      console.error("Cannot orchestrate: need at least 2 valid agent personalities");
      return;
    }
    
    // Start the conversation - each agent takes a turn
    for (let turn = 0; turn < turnCount; turn++) {
      // Check if the conversation is still active before each round
      const updatedConversation = await storage.getConversation(conversationId);
      if (!updatedConversation || !updatedConversation.isActive) {
        console.log("Conversation stopped or no longer active");
        return;
      }
      
      // Each agent takes a turn in this round
      for (const agentPersonality of agentPersonalities) {
        // Get all messages so far
        const allMessages = await storage.getMessagesForConversation(conversationId);
        
        // Format previous messages for context
        const formattedPrevMessages = allMessages.map(msg => ({
          agentId: msg.agentPersonalityId,
          agentName: agentPersonalities.find(p => p.id === msg.agentPersonalityId)?.name || "Unknown",
          content: msg.content
        }));
        
        // Create the prompt for the AI
        const prompt = buildPromptForAgent(agentPersonality, topic, formattedPrevMessages);
        
        // Call Groq API to generate a response
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: agentPersonality.systemPrompt },
            { role: "user", content: prompt }
          ],
          model: agentPersonality.model,
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        });
        
        const responseContent = completion.choices[0].message.content || "";
        
        // Save the message
        const message = await storage.createMessage({
          conversationId,
          agentPersonalityId: agentPersonality.id,
          content: responseContent,
          metadata: {
            model: agentPersonality.model,
            turnNumber: turn + 1,
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
          }
        });
        
        // Broadcast the new message to all clients
        broadcastMessage(wss, "NEW_MESSAGE", {
          ...message,
          agentName: agentPersonality.name,
          agentColor: agentPersonality.color
        });
        
        // Add a slight delay between agent responses to make it feel more natural
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check again if conversation is still active
        const currentConversation = await storage.getConversation(conversationId);
        if (!currentConversation || !currentConversation.isActive) {
          return;
        }
      }
    }
    
    // End the conversation after all turns are complete
    await storage.endConversation(conversationId);
    
    // Get the updated conversation
    const finalConversation = await storage.getConversation(conversationId);
    
    // Broadcast the conversation end to all clients
    broadcastMessage(wss, "END_CONVERSATION", finalConversation);
    
  } catch (error) {
    console.error("Error in conversation orchestration:", error);
  }
}
