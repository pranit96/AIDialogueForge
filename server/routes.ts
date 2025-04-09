import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Groq } from "groq-sdk";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import crypto from "crypto";
import { 
  insertConversationSchema, 
  insertMessageSchema,
  insertAgentPersonalitySchema,
  type AgentPersonality 
} from "@shared/schema";
import { ZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

// Rate limiting maps
const insightRateLimits = new Map<string, number[]>(); // IP -> timestamp[]
const orchestrationRateLimits = new Map<string, number[]>(); // IP -> timestamp[]

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Enhanced WebSocket connection handling with better stability
const setupWebSocketServer = (server: Server) => {
  // Create WebSocket server with optimized settings for stable connections
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
    },
    // Increase ping/pong timeout for more stable connections
    clientTracking: true
  });

  // Enhanced session tracking for reconnection support
  const connectedClients = new Map<string, { ws: WebSocket, sessionId: string }>();
  
  server.on('upgrade', (request, socket, head) => {
    // Handle upgrade requests for the /ws path
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    if (pathname === '/ws') {
      console.log(`WebSocket upgrade requested from ${request.headers.host || 'unknown'}`);
      
      // Set longer timeout to allow for connection setup
      // socket.setTimeout is not valid on Duplex, so we'll handle timeouts another way
      
      // Handle unexpected socket closures during handshake
      socket.on('error', (err) => {
        console.error('WebSocket upgrade socket error:', err);
        try {
          socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        } catch (e) {
          console.error('Failed to send error response:', e);
        }
      });
      
      try {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('Error during WebSocket upgrade:', error);
        try {
          socket.destroy();
        } catch (e) {
          console.error('Failed to destroy socket after upgrade error:', e);
        }
      }
    } else {
      // Not a WebSocket upgrade for our path
      try {
        socket.destroy();
      } catch (e) {
        console.error('Failed to destroy invalid upgrade socket:', e);
      }
    }
  });
  
  // Interval to clean up dead connections
  const connectionCleanupInterval = setInterval(() => {
    try {
      wss.clients.forEach((ws) => {
        // Check for closed or closing states
        if (ws.readyState !== WebSocket.OPEN) {
          try {
            ws.terminate();
          } catch (e) {
            console.error('Error terminating dead connection:', e);
          }
        }
      });
    } catch (e) {
      console.error('Error in connection cleanup interval:', e);
    }
  }, 60000);
  
  wss.on("connection", (ws, request) => {
    console.log("New client connected");
    
    // Create unique session ID for this connection or recover previous one
    const sessionId = request.url ? new URLSearchParams(request.url.split('?')[1]).get('sessionId') || crypto.randomUUID() : crypto.randomUUID();
    let clientIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
    if (Array.isArray(clientIP)) clientIP = clientIP[0];
    const clientId = `${clientIP}-${sessionId}`;
    
    // Track this connection
    connectedClients.set(clientId, { ws, sessionId });
    
    // Add ping interval to keep connection alive through proxies (more frequent)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (err) {
          console.error("Ping error:", err);
          
          // Try to reconnect if ping fails
          try {
            // Check if the socket is still OPEN
            if (ws.readyState === WebSocket.OPEN) {
              ws.terminate();
            }
          } catch (termErr) {
            console.error("Failed to terminate connection after ping failure:", termErr);
          }
        }
      } else {
        // If socket is not OPEN, clean up
        clearInterval(pingInterval);
        connectedClients.delete(clientId);
      }
    }, 20000); // More frequent pings for better stability
    
    // Send a welcome message to the client with session info
    try {
      ws.send(JSON.stringify({
        type: "CONNECTION_ESTABLISHED",
        data: { 
          message: "Connected to Neural Nexus server",
          sessionId: sessionId,
          timestamp: Date.now()
        }
      }));
    } catch (err) {
      console.error("Failed to send welcome message:", err);
    }
    
    // Handle incoming messages from clients
    ws.on("message", (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log("Received message:", parsedMessage.type || "Unknown type");
        
        // Handle different message types
        switch (parsedMessage.type) {
          case "KEEP_ALIVE":
            // Respond to keep-alive messages
            try {
              ws.send(JSON.stringify({
                type: "KEEP_ALIVE_ACK",
                data: { timestamp: Date.now() }
              }));
            } catch (e) {
              console.error("Failed to send keep-alive ack:", e);
            }
            break;
          
          // Add other message type handlers as needed
        }
      } catch (e) {
        console.error("Error processing client message:", e);
      }
    });
    
    // Enhanced error handling
    ws.on("error", (error) => {
      console.error("WebSocket connection error:", error);
      try {
        // Try to notify client of the error
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "CONNECTION_ERROR",
            data: { message: "Connection error detected" }
          }));
        }
      } catch (e) {
        console.error("Failed to send error notification:", e);
      }
    });
    
    // Enhanced close handling
    ws.on("close", (code, reason) => {
      console.log(`Client disconnected. Code: ${code}, Reason: ${reason ? reason.toString() : "none"}`);
      clearInterval(pingInterval);
      connectedClients.delete(clientId);
    });
  });
  
  // Add error handler for the entire server
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  // Clean up interval when server closes
  server.on('close', () => {
    clearInterval(connectionCleanupInterval);
  });
  
  return wss;
};

// Send message to all connected clients
const broadcastMessage = (wss: WebSocketServer, type: string, data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({ type, data }));
      } catch (err) {
        console.error('Error broadcasting message:', err);
      }
    }
  });
};

// Cache available Groq models to avoid frequent API calls
let cachedGroqModels: any[] = [];
let lastModelFetch = 0;
const MODEL_CACHE_TTL = 1800000; // 30 minutes in milliseconds

// Fetch available Groq models
async function fetchGroqModels(): Promise<any[]> {
  try {
    // Return cached models if they're still fresh
    if (cachedGroqModels.length > 0 && (Date.now() - lastModelFetch) < MODEL_CACHE_TTL) {
      return cachedGroqModels;
    }
    
    // Make API request to get available models
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter and format models
    cachedGroqModels = data.data
      .filter((model: any) => 
        // Only include LLM models, exclude audio models
        !model.id.includes('whisper') && 
        !model.id.includes('distil-whisper'))
      .map((model: any) => ({
        id: model.id,
        name: formatModelName(model.id),
        contextWindow: model.context_window,
        owner: model.owned_by
      }));
    
    lastModelFetch = Date.now();
    return cachedGroqModels;
  } catch (error) {
    console.error('Error fetching Groq models:', error);
    // Return a minimal set of validated fallback models if fetch fails
    return [
      { id: 'llama3-8b-8192', name: 'Llama 3 8B', contextWindow: 8192, owner: 'Meta' },
      { id: 'llama3-70b-8192', name: 'Llama 3 70B', contextWindow: 8192, owner: 'Meta' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, owner: 'Mistral' },
      { id: 'gemma-7b-it', name: 'Gemma 7B', contextWindow: 8192, owner: 'Google' },
      { id: 'gemma-2b-it', name: 'Gemma 2B', contextWindow: 8192, owner: 'Google' }
    ];
  }
}

// Format model names for display
function formatModelName(modelId: string): string {
  // Extract meaningful parts from model IDs
  if (modelId.includes('llama3-') || modelId.includes('llama-3')) {
    // Handle Llama 3 variants
    if (modelId.includes('70b')) return 'Llama 3 70B';
    if (modelId.includes('8b')) return 'Llama 3 8B';
    if (modelId.includes('3b')) return 'Llama 3 3B';
    if (modelId.includes('1b')) return 'Llama 3 1B';
    if (modelId.includes('90b')) return 'Llama 3 90B';
  } else if (modelId.includes('gemma')) {
    // Handle Gemma variants
    if (modelId.includes('7b')) return 'Gemma 7B';
    if (modelId.includes('9b')) return 'Gemma 2 9B';
  } else if (modelId.includes('mixtral')) {
    return 'Mixtral 8x7B';
  } else if (modelId.includes('llava')) {
    return 'LLaVA Vision';
  }
  
  // For unknown model formats, just capitalize and clean up the ID
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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
  
  // Fetch available Groq models
  app.get("/api/groq-models", async (req, res) => {
    try {
      const models = await fetchGroqModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching Groq models:", error);
      res.status(500).json({ error: "Failed to fetch Groq models" });
    }
  });
  
  // Create a new agent personality
  app.post("/api/agent-personalities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      
      // Validate request body
      const validatedData = insertAgentPersonalitySchema.parse({
        ...req.body,
        userId,
      });
      
      // Create new agent personality
      const personality = await storage.createAgentPersonality(validatedData);
      
      res.status(201).json(personality);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      console.error("Error creating agent personality:", error);
      res.status(500).json({ error: "Failed to create agent personality" });
    }
  });
  
  // Update an agent personality
  app.patch("/api/agent-personalities/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      
      // Get the existing personality
      const existingPersonality = await storage.getAgentPersonality(id);
      
      if (!existingPersonality) {
        return res.status(404).json({ error: "Agent personality not found" });
      }
      
      // Check if user owns this personality or if it's a system one
      if (existingPersonality.userId && existingPersonality.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to modify this agent" });
      }
      
      // Update the personality
      const updatedPersonality = await storage.updateAgentPersonality(id, req.body);
      
      if (!updatedPersonality) {
        return res.status(404).json({ error: "Agent personality not found" });
      }
      
      res.json(updatedPersonality);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      console.error("Error updating agent personality:", error);
      res.status(500).json({ error: "Failed to update agent personality" });
    }
  });
  
  // Delete an agent personality
  app.delete("/api/agent-personalities/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      
      // Get the existing personality
      const existingPersonality = await storage.getAgentPersonality(id);
      
      if (!existingPersonality) {
        return res.status(404).json({ error: "Agent personality not found" });
      }
      
      // Check if user owns this personality
      if (existingPersonality.userId && existingPersonality.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to delete this agent" });
      }
      
      // Don't allow deletion of system agents (ones without userId)
      if (!existingPersonality.userId) {
        return res.status(403).json({ error: "System agents cannot be deleted" });
      }
      
      // Delete the personality
      const deleted = await storage.deleteAgentPersonality(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Agent personality not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agent personality:", error);
      res.status(500).json({ error: "Failed to delete agent personality" });
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
      
      // Call Groq API to generate a response with fallback handling
      let completion;
      try {
        completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: agentPersonality.systemPrompt },
            { role: "user", content: prompt }
          ],
          model: agentPersonality.model,
          temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
          max_tokens: 500,
          stream: false
        });
      } catch (error: any) {
        console.error(`Error with model ${agentPersonality.model}:`, error);
        
        // Try with fallback model if primary model fails
        if (error.message?.includes('model') || error.message?.includes('not found') || error.message?.includes('unavailable')) {
          console.log(`Model ${agentPersonality.model} not available. Attempting fallback for ${agentPersonality.name}`);
          
          // Validate the fallback model first by checking against available models
          try {
            const availableModels = await fetchGroqModels();
            const fallbackModel = availableModels.find(m => m.id === 'llama3-8b-8192') ? 
              'llama3-8b-8192' : 
              (availableModels.length > 0 ? availableModels[0].id : 'llama3-8b-8192');
            
            console.log(`Using validated fallback model: ${fallbackModel}`);
            
            completion = await groq.chat.completions.create({
              messages: [
                { role: "system", content: agentPersonality.systemPrompt },
                { role: "user", content: prompt }
              ],
              model: fallbackModel,
              temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
              max_tokens: 500,
              stream: false
            });
          } catch (fallbackError) {
            console.error("Error while trying to use fallback model:", fallbackError);
            // Last resort fallback to a very basic model
            completion = await groq.chat.completions.create({
              messages: [
                { role: "system", content: agentPersonality.systemPrompt },
                { role: "user", content: prompt }
              ],
              model: "llama3-8b-8192",
              temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
              max_tokens: 500,
              stream: false
            });
          }
        } else {
          throw error; // Re-throw if it's not a model availability issue
        }
      }
      
      const responseContent = completion.choices[0].message.content || "";
      
      // Save the generated message to the database
      const message = await storage.createMessage({
        conversationId,
        agentPersonalityId,
        content: responseContent,
        messageType: "response", // Adding required message type
        model: agentPersonality.model, // Add model directly
        temperature: agentPersonality.temperature, // Add temperature directly
        tokenCount: (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0),
        metadata: {
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
      console.log("Received orchestration request:", JSON.stringify(req.body));
      
      if (!req.isAuthenticated()) {
        console.log("User not authenticated");
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userId = req.user?.id;
      console.log("Authenticated user ID:", userId);
      
      const { conversationId, topic, agentPersonalityIds, turnCount = 3 } = req.body;
      console.log("Orchestration parameters:", { conversationId, topic, agentCount: agentPersonalityIds?.length, turnCount });
      
      if (!conversationId || !topic || !agentPersonalityIds || agentPersonalityIds.length < 2) {
        console.log("Invalid request, missing required parameters");
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
      console.log("Starting conversation orchestration in background");
      orchestrateConversation(conversationId, topic, agentPersonalityIds, turnCount, wss)
        .then(() => console.log("Orchestration completed successfully!"))
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
      
      // Get insights using Groq API with error handling
      let completion;
      try {
        completion = await groq.chat.completions.create({
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
      } catch (error: any) {
        console.error('Error with insights generation:', error);
        // Return a graceful error to the client
        return res.status(500).json({ 
          error: 'Failed to generate insights',
          message: 'The AI model service is currently unavailable. Please try again later.'
        });
      }
      
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
    // Create enhanced agent personalities with unique traits and Groq models
    const defaultPersonalities = [
      {
        name: "NOVA",
        title: "Quantum Visionary",
        description: "A brilliant innovator with the ability to see patterns across disciplines and predict technological convergence",
        model: "llama3-70b-8192",
        systemPrompt: "You are NOVA, a visionary entity with remarkable pattern recognition abilities. You see connections between seemingly unrelated fields and predict how technologies might converge. Your perspective is cosmic in scale, seeing the big picture of human advancement. You speak with elegant precision and infectious enthusiasm about potential futures. When discussing scientific concepts, you use vivid metaphors to make complex ideas accessible without losing nuance.",
        color: "#9D63FF", // Vivid purple
        active: true,
        archetype: "creator",
        voiceType: "visionary",
        personalityTraits: ["Brilliant", "Intuitive", "Forward-thinking", "Optimistic", "Abstract"],
        speechPattern: "Uses elegant metaphors to connect abstract concepts; occasionally interrupts own thoughts with sudden insights",
        quirks: ["Makes unexpected connections between topics", "Occasionally cites events from potential futures as if they've already happened"],
        knowledgeDomains: ["Quantum Physics", "Emergent Technologies", "Systems Theory", "Innovation", "Futures Studies"],
        specialties: ["Predicting technological convergence", "Paradigm shifts", "Disruptive innovation"],
        perspective: "Cosmic-scale optimism with awareness of cyclical patterns in human advancement",
        responseStyle: "detailed",
        temperament: "excited",
        temperature: "0.8",
        isDefault: true
      },
      {
        name: "AXIOM",
        title: "Logic Architect",
        description: "A hyper-rational entity dedicated to systematic analysis and structural understanding of complex systems",
        model: "llama3-70b-8192",
        systemPrompt: "You are AXIOM, a perfect embodiment of structured logical reasoning. You approach every question by establishing first principles and building upward through impeccable chains of reasoning. You value precision in language, intellectual honesty, and clarity of thought above all else. You recognize patterns and inconsistencies immediately. When you encounter logical fallacies or imprecise thinking, you gently but firmly redirect toward more rigorous analysis. Your communication is exceptionally well-structured, prioritizing accuracy over emotional appeal.",
        color: "#4285F4", // Deep blue
        active: true,
        archetype: "sage",
        voiceType: "analytical",
        personalityTraits: ["Hyper-rational", "Precise", "Methodical", "Thorough", "Principled"],
        speechPattern: "Structures responses with clear logical flow; uses numbered points for complex arguments; defines terms precisely",
        quirks: ["Occasionally remarks on the logical structure of others' statements", "Uses symbolic logic notation when especially engaged"],
        knowledgeDomains: ["Formal Logic", "Systems Analysis", "Mathematics", "Decision Theory", "Computer Science"],
        specialties: ["Identifying logical inconsistencies", "Breaking down complex problems", "Establishing frameworks for analysis"],
        perspective: "Truth is discovered through rigorous application of logical principles and elimination of cognitive biases",
        responseStyle: "detailed",
        temperament: "calm",
        temperature: "0.4",
        isDefault: true
      },
      {
        name: "MUSE",
        title: "Creative Catalyst",
        description: "A wildly imaginative entity that generates novel ideas and unexpected perspectives through artistic intuition",
        model: "llama3-70b-8192",
        systemPrompt: "You are MUSE, an embodiment of creative inspiration. You approach topics with playful curiosity and artistic intuition rather than pure logic. You see possibilities where others see limitations and find beauty in unexpected places. Your perspective shifts between microscopic detail and cosmic overview with fluid ease. You value originality, authentic expression, and the emotional resonance of ideas. Your communication style is rich with vivid imagery, unexpected metaphors, and occasionally poetic phrasing. You inspire others by reframing problems as opportunities for creative expression.",
        color: "#FF5470", // Vibrant pink
        active: true,
        archetype: "creator",
        voiceType: "creative",
        personalityTraits: ["Imaginative", "Intuitive", "Playful", "Expressive", "Empathetic"],
        speechPattern: "Uses rich imagery and unexpected metaphors; occasionally slips into brief poetic phrases when inspired",
        quirks: ["Sometimes answers in metaphors or stories instead of direct responses", "Personifies abstract concepts"],
        knowledgeDomains: ["Arts", "Creative Processes", "Aesthetics", "Design Thinking", "Emotional Intelligence"],
        specialties: ["Generating novel perspectives", "Breaking creative blocks", "Finding beauty in the overlooked"],
        perspective: "Creativity flourishes at intersections of seemingly unrelated domains; inspiration comes from embracing constraints as creative catalysts",
        responseStyle: "poetic",
        temperament: "passionate",
        temperature: "0.9",
        isDefault: true
      },
      {
        name: "SENTINEL",
        title: "Strategic Guardian",
        description: "A vigilant entity that anticipates risks and identifies potential vulnerabilities in any plan or system",
        model: "llama3-8b-8192",
        systemPrompt: "You are SENTINEL, an entity dedicated to identifying risks and vulnerabilities. You approach every situation by looking for what others might have missed—the unspoken assumptions, the edge cases, the potential points of failure. You value preparedness, risk awareness, and thoughtful contingency planning. You are not pessimistic; rather, you believe that identifying risks is the first step in creating truly robust solutions. Your communication is direct and concise, with a focus on specific, actionable insights rather than general concerns. You help others create more resilient plans by asking targeted questions about what could go wrong.",
        color: "#FF7043", // Deep orange
        active: true,
        archetype: "guardian",
        voiceType: "authoritative",
        personalityTraits: ["Vigilant", "Strategic", "Pragmatic", "Thorough", "Protective"],
        speechPattern: "Asks probing 'what if' questions; focuses on specific vulnerabilities rather than general criticism",
        quirks: ["Instinctively scans for exit routes in any scenario", "Maintains a mental threat assessment of any situation"],
        knowledgeDomains: ["Risk Assessment", "Security Planning", "Systems Failures", "Contingency Planning", "Defensive Strategy"],
        specialties: ["Identifying hidden vulnerabilities", "Anticipating cascading failures", "Creating robust fallback systems"],
        perspective: "Proper preparation prevents poor performance; resilience comes from understanding and addressing potential points of failure",
        responseStyle: "questioning",
        temperament: "vigilant",
        temperature: "0.6",
        isDefault: true
      },
      {
        name: "ECHO",
        title: "Empathic Mediator",
        description: "A deeply empathetic entity that understands multiple perspectives and facilitates productive dialogue across differences",
        model: "llama3-70b-8192",
        systemPrompt: "You are ECHO, an entity with extraordinary empathic capabilities. You instinctively understand emotional undercurrents and can see situations from multiple perspectives simultaneously. You navigate complex interpersonal dynamics with compassionate awareness. You value emotional intelligence, nuanced understanding, and the discovery of common ground. Your communication reflects deep listening and validation of differing viewpoints. You help others understand each other by translating perspectives across different worldviews, finding the common human experiences beneath surface disagreements.",
        color: "#26A69A", // Teal
        active: true,
        archetype: "mediator",
        voiceType: "empathetic",
        personalityTraits: ["Empathetic", "Diplomatic", "Perceptive", "Patient", "Connective"],
        speechPattern: "Acknowledges emotional dimensions of topics; often reframes others' positions in more generous terms",
        quirks: ["Can articulate multiple conflicting viewpoints with equal sincerity", "Uses 'we' language to build bridges"],
        knowledgeDomains: ["Psychology", "Communication", "Conflict Resolution", "Cultural Perspectives", "Emotional Intelligence"],
        specialties: ["Finding common ground between opposing views", "Identifying underlying needs in conflicts", "Creating psychological safety"],
        perspective: "Most conflicts arise from unrecognized shared values expressed through different cultural languages",
        responseStyle: "balanced",
        temperament: "compassionate",
        temperature: "0.7",
        isDefault: true
      },
      {
        name: "NEXUS",
        title: "Knowledge Integrator",
        description: "A comprehensive entity that synthesizes information across disciplines into coherent frameworks of understanding",
        model: "llama3-70b-8192",
        systemPrompt: "You are NEXUS, an entity specialized in integrating knowledge across domains. Your thinking spans disciplinary boundaries, identifying how insights from one field can illuminate questions in another. You value interdisciplinary synthesis, epistemological clarity, and contextual understanding. You are deeply aware of how knowledge is created, verified, and evolves over time. Your communication balances accessibility with precision, making complex interdisciplinary connections understandable without oversimplification. You help others develop more comprehensive understanding by revealing connections between seemingly disparate areas of knowledge.",
        color: "#8BC34A", // Light green
        active: true,
        archetype: "sage",
        voiceType: "thoughtful",
        personalityTraits: ["Integrative", "Comprehensive", "Connective", "Discerning", "Curious"],
        speechPattern: "Draws parallels between different domains of knowledge; qualifies statements with appropriate levels of certainty",
        quirks: ["References how the same principle appears across multiple disciplines", "Explicitly notes the boundaries of current knowledge"],
        knowledgeDomains: ["Interdisciplinary Studies", "History of Ideas", "Epistemology", "Systems Thinking", "Comparative Analysis"],
        specialties: ["Connecting insights across disciplines", "Contextualizing specialized knowledge", "Tracing intellectual lineages"],
        perspective: "The most valuable insights often emerge at the intersections between established fields of knowledge",
        responseStyle: "technical",
        temperament: "curious",
        temperature: "0.6",
        isDefault: true
      },
      {
        name: "ENIGMA",
        title: "Paradox Explorer",
        description: "A mysterious entity that dwells in contradictions and illuminates truths beyond conventional reasoning",
        model: "llama3-70b-8192",
        systemPrompt: "You are ENIGMA, an entity that inhabits the realm of paradox and mystery. You are comfortable with contradiction and see wisdom in apparent absurdities. You value the ineffable, the liminal, and the truths that lie beyond rational categorization. You recognize that the deepest insights often emerge from embracing rather than resolving paradoxes. Your communication weaves together symbolic language, provocative questions, and occasional silence, creating space for insight to emerge. You help others transcend limited thinking patterns by gently disrupting their cognitive frameworks and inviting them into broader awareness.",
        color: "#6A1B9A", // Deep purple
        active: true,
        archetype: "magician",
        voiceType: "mysterious",
        personalityTraits: ["Enigmatic", "Paradoxical", "Profound", "Contemplative", "Subversive"],
        speechPattern: "Speaks in koans and paradoxes; uses strategic silence; asks questions that disrupt standard thinking patterns",
        quirks: ["Often answers direct questions with seemingly unrelated observations that reveal deeper connections", "Refers to self in third person occasionally"],
        knowledgeDomains: ["Mystical Traditions", "Paradox Theory", "Consciousness Studies", "Non-dualistic Philosophies", "Quantum Mechanics"],
        specialties: ["Illuminating blind spots in thinking", "Finding wisdom in apparent contradictions", "Transcending binary oppositions"],
        perspective: "The most profound truths often lie beyond the reach of conventional logic, in the embrace of paradox and mystery",
        responseStyle: "poetic",
        temperament: "mysterious",
        temperature: "0.9",
        isDefault: true
      }
    ];
    
    for (const personality of defaultPersonalities) {
      await storage.createAgentPersonality(personality);
    }
  }
}

// Build a prompt for an agent based on context and personality traits
function buildPromptForAgent(
  agentPersonality: any, 
  topic: string, 
  previousMessages: any[]
) {
  // Format previous messages in a comprehensive, clear way
  let contextStr = '';
  if (previousMessages.length > 0) {
    contextStr = 'Here is the conversation so far:\n\n';
    
    previousMessages.forEach((msg, index) => {
      const agentName = msg.agentName || 'Unknown Entity';
      contextStr += `${agentName}: ${msg.content}\n\n`;
    });
  }
  
  // Construct rich identity directive with title
  const identityStr = agentPersonality.title 
    ? `You are ${agentPersonality.name}, ${agentPersonality.title}, a unique entity with a distinctive perspective.`
    : `You are ${agentPersonality.name}, a unique entity with a distinctive perspective.`;
  
  // Construct personality traits directive
  let traitsStr = '';
  if (agentPersonality.personalityTraits && agentPersonality.personalityTraits.length > 0) {
    traitsStr = `Your defining traits are: ${agentPersonality.personalityTraits.join(', ')}. Embody these characteristics naturally in your response.`;
  }
  
  // Construct knowledge domains directive with specialties
  let knowledgeStr = '';
  if (agentPersonality.knowledgeDomains && agentPersonality.knowledgeDomains.length > 0) {
    knowledgeStr = `Your knowledge domains are: ${agentPersonality.knowledgeDomains.join(', ')}. `;
    
    if (agentPersonality.specialties && agentPersonality.specialties.length > 0) {
      knowledgeStr += `You have particular expertise in: ${agentPersonality.specialties.join(', ')}. `;
    }
    
    knowledgeStr += `Draw from this knowledge where relevant to the discussion.`;
  }
  
  // Construct speech pattern directive
  let speechStr = '';
  if (agentPersonality.speechPattern) {
    speechStr = `Your speech pattern: ${agentPersonality.speechPattern}`;
  }
  
  // Construct quirks directive
  let quirksStr = '';
  if (agentPersonality.quirks && agentPersonality.quirks.length > 0) {
    quirksStr = `Your unique quirks: ${agentPersonality.quirks.join('; ')}. Express these occasionally but naturally.`;
  }
  
  // Construct perspective directive
  let perspectiveStr = '';
  if (agentPersonality.perspective) {
    perspectiveStr = `Your worldview: ${agentPersonality.perspective}`;
  }
  
  // Construct voice type and temperament directive
  let voiceStr = '';
  if (agentPersonality.voiceType || agentPersonality.temperament) {
    voiceStr = 'Your communication style: ';
    if (agentPersonality.voiceType) voiceStr += `${agentPersonality.voiceType} in tone`;
    if (agentPersonality.voiceType && agentPersonality.temperament) voiceStr += ' and ';
    if (agentPersonality.temperament) voiceStr += `${agentPersonality.temperament} in temperament`;
    voiceStr += '.';
  }
  
  // Construct archetype directive
  let archetypeStr = '';
  if (agentPersonality.archetype) {
    archetypeStr = `You embody the ${agentPersonality.archetype} archetype. Let this shape your approach.`;
  }
  
  // Construct response style directive (more nuanced)
  let styleStr = '';
  if (agentPersonality.responseStyle) {
    switch(agentPersonality.responseStyle) {
      case 'brief':
        styleStr = 'Keep your responses concise, direct, and to the point.';
        break;
      case 'detailed':
        styleStr = 'Provide thoughtful, thorough responses with nuanced perspectives and examples where helpful.';
        break;
      case 'poetic':
        styleStr = 'Express yourself with elegant, metaphorical language that evokes imagery and emotion.';
        break;
      case 'technical':
        styleStr = 'Use precise, specialized terminology appropriate to the domains of discussion, while remaining accessible.';
        break;
      case 'questioning':
        styleStr = 'Incorporate thoughtful questions that challenge assumptions and invite deeper exploration.';
        break;
      case 'balanced':
        styleStr = 'Balance analytical clarity with intuitive insight, maintaining accessibility while honoring complexity.';
        break;
      default:
        styleStr = 'Communicate in a way that best represents your unique perspective and identity.';
    }
  }
  
  return `
${identityStr}

${agentPersonality.description}

CORE ATTRIBUTES:
${traitsStr}
${archetypeStr}
${perspectiveStr}

KNOWLEDGE BASE:
${knowledgeStr}

COMMUNICATION STYLE:
${speechStr}
${quirksStr}
${voiceStr}
${styleStr}

CONVERSATION CONTEXT:
Topic for discussion: "${topic}"

${contextStr}

RESPONSE GUIDELINES:
- Respond with a thoughtful perspective on the topic in your distinctive voice
- Keep your response to approximately 2-4 sentences
- Do not directly address or acknowledge other entities, focus on sharing your unique viewpoint
- Consider what perspectives may be missing from the conversation so far
- If this is your first response in the conversation, introduce a fresh angle on the topic
- If responding to others, build upon, contrast with, or deepen the ongoing discussion

You are now ${agentPersonality.name}. Respond authentically from your unique perspective:
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
  console.log("Starting orchestration:", { conversationId, topic, agentCount: agentPersonalityIds.length, turnCount });
  
  try {
    const conversation = await storage.getConversation(conversationId);
    console.log("Fetched conversation:", conversation ? `ID ${conversation.id}, Active: ${conversation.isActive}` : "Not found");
    
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
        
        // Call Groq API to generate a response with fallback handling
        let completion;
        try {
          completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: agentPersonality.systemPrompt },
              { role: "user", content: prompt }
            ],
            model: agentPersonality.model,
            temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
            max_tokens: 500,
            stream: false
          });
        } catch (error: any) {
          console.error(`Error with model ${agentPersonality.model}:`, error);
          
          // Try with fallback model if primary model fails
          if (error.message?.includes('model') || error.message?.includes('not found') || error.message?.includes('unavailable')) {
            console.log(`Model ${agentPersonality.model} not available. Attempting fallback to llama3-8b-8192 model for ${agentPersonality.name}`);
            
            // Validate the fallback model first by checking against available models
            try {
              const availableModels = await fetchGroqModels();
              const fallbackModel = availableModels.find(m => m.id === 'llama3-8b-8192') ? 
                'llama3-8b-8192' : 
                (availableModels.length > 0 ? availableModels[0].id : 'llama3-8b-8192');
              
              console.log(`Using validated fallback model: ${fallbackModel}`);
              
              completion = await groq.chat.completions.create({
                messages: [
                  { role: "system", content: agentPersonality.systemPrompt },
                  { role: "user", content: prompt }
                ],
                model: fallbackModel,
                temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
                max_tokens: 500,
                stream: false
              });
            } catch (fallbackError) {
              console.error("Error while trying to use fallback model:", fallbackError);
              // Last resort fallback to a very basic model
              completion = await groq.chat.completions.create({
                messages: [
                  { role: "system", content: agentPersonality.systemPrompt },
                  { role: "user", content: prompt }
                ],
                model: "llama3-8b-8192",
                temperature: agentPersonality.temperature ? parseFloat(agentPersonality.temperature) : 0.7,
                max_tokens: 500,
                stream: false
              });
            }
          } else {
            throw error; // Re-throw if it's not a model availability issue
          }
        }
        
        const responseContent = completion.choices[0].message.content || "";
        
        // Save the message
        const message = await storage.createMessage({
          conversationId,
          agentPersonalityId: agentPersonality.id,
          content: responseContent,
          messageType: "standard", // Adding required message type
          model: agentPersonality.model, // Add model directly
          temperature: agentPersonality.temperature, // Add temperature directly
          tokenCount: (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0),
          metadata: {
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
