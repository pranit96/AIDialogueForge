import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Conversation, Message, AgentPersonality, WebSocketMessage } from '@/types';
import Header from '@/components/Header';
import AgentPanel from '@/components/AgentPanel';
import ConversationMatrix from '@/components/ConversationMatrix';
import InteractionNetwork from '@/components/InteractionNetwork';
import SystemControls from '@/components/SystemControls';
import StatusBar from '@/components/StatusBar';

export default function Home() {
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [topic, setTopic] = useState('');
  
  // Fetch agent personalities
  const { data: agentPersonalities = [] } = useQuery<AgentPersonality[]>({
    queryKey: ['/api/agent-personalities'],
  });
  
  // Create a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest('POST', '/api/conversations', { topic });
      return response.json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversation(data);
      setMessages([]);
      toast({
        title: 'Conversation Created',
        description: `New discussion started on: ${data.topic}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Start conversation orchestration
  const startOrchestrationMutation = useMutation({
    mutationFn: async (data: { conversationId: number, topic: string, agentPersonalityIds: number[], turnCount: number }) => {
      const response = await apiRequest('POST', '/api/conversations/orchestrate', data);
      return response.json();
    },
    onSuccess: () => {
      setIsOrchestrating(true);
      toast({
        title: 'Conversation Started',
        description: 'AI agents are now discussing the topic',
      });
    },
    onError: (error) => {
      setIsOrchestrating(false);
      toast({
        title: 'Error',
        description: `Failed to start conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // End the active conversation
  const endConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/conversations/${id}/end`, {});
      return response.json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversation(data);
      setIsOrchestrating(false);
      toast({
        title: 'Conversation Ended',
        description: 'The AI discussion has been terminated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to end conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Setup WebSocket for real-time updates
  useEffect(() => {
    // In Replit environment, use the same URL without explicit port
    // This will route through Replit's proxy
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host; // host includes hostname:port if port is specified
    
    // In Replit, we should use the same host:port that served the page
    const wsUrl = `${wsProtocol}//${wsHost}`;
    console.log('Connecting to WebSocket at:', wsUrl);
    
    let socket: WebSocket;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        socketRef.current = socket;
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      return;
    }
    
    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);
        
        switch (message.type) {
          case 'NEW_MESSAGE':
            handleNewMessage(message.data);
            break;
          case 'NEW_CONVERSATION':
            if (!activeConversation) {
              setActiveConversation(message.data);
            }
            break;
          case 'END_CONVERSATION':
            if (activeConversation && activeConversation.id === message.data.id) {
              setActiveConversation(message.data);
              setIsOrchestrating(false);
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'WebSocket connection error occurred',
        variant: 'destructive',
      });
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      socketRef.current = null;
      
      // Attempt to reconnect after 3 seconds if the page is still active
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('Attempting to reconnect WebSocket...');
          // The useEffect will be called again to establish a new connection
          window.location.reload();
        }
      }, 3000);
    };
    
    return () => {
      socket.close();
    };
  }, [activeConversation, toast]);
  
  // Handle new incoming messages
  const handleNewMessage = (newMessage: Message) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };
  
  // Start a new conversation with the given topic
  const handleStartConversation = async () => {
    if (!topic) {
      toast({
        title: 'Input Required',
        description: 'Please enter a topic for discussion',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedAgents.length < 2) {
      toast({
        title: 'Agent Selection Required',
        description: 'Please select at least two agents for the conversation',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Create a new conversation
      const conversation = await createConversationMutation.mutateAsync(topic);
      
      // Start the orchestration
      await startOrchestrationMutation.mutateAsync({
        conversationId: conversation.id,
        topic,
        agentPersonalityIds: selectedAgents,
        turnCount: 3
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };
  
  // Force stop the current conversation
  const handleForceStop = () => {
    if (activeConversation && activeConversation.isActive) {
      endConversationMutation.mutate(activeConversation.id);
    }
  };
  
  // Toggle selection of an agent
  const toggleAgentSelection = (agentId: number) => {
    setSelectedAgents((prev) => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId) 
        : [...prev, agentId]
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Header */}
      <Header />
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Side Panel */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          {/* System Controls Panel */}
          <SystemControls 
            isOrchestrating={isOrchestrating}
            onForceStop={handleForceStop}
          />
          
          {/* Agent Selection Panel */}
          <AgentPanel 
            agents={agentPersonalities}
            selectedAgents={selectedAgents}
            onToggleAgent={toggleAgentSelection}
          />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-9 order-1 lg:order-2">
          {/* Topic Input */}
          <div className="glass rounded-lg p-5 mb-6 border border-deep-space neon-border animate-pulse-glow">
            <h2 className="font-cyber text-xl text-cyber-mint mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              DISCUSSION TOPIC
            </h2>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="Enter a topic for AI agents to discuss..." 
                className="w-full bg-deep-space bg-opacity-50 text-ghost-blue py-3 px-4 rounded-md border border-cyber-mint focus:outline-none focus:ring-2 focus:ring-cyber-mint focus:border-transparent"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isOrchestrating}
              />
              
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-cyber-mint text-void-black py-1.5 px-4 rounded font-cyber hover:bg-opacity-80 transition-all"
                onClick={handleStartConversation}
                disabled={isOrchestrating || !topic || selectedAgents.length < 2}
              >
                {isOrchestrating ? 'ACTIVE' : 'INITIATE'}
              </button>
            </div>
          </div>
          
          {/* Conversation Display */}
          <ConversationMatrix 
            conversation={activeConversation}
            messages={messages}
            agents={agentPersonalities}
            isOrchestrating={isOrchestrating}
          />
          
          {/* Interaction Network Visualization */}
          <InteractionNetwork 
            messages={messages}
            agents={agentPersonalities}
          />
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
