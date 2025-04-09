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
import NeuralNetworkViz from '@/components/NeuralNetworkViz';
import ConversationInsights from '@/components/ConversationInsights';
import AgentManagement from '@/components/AgentManagement';
import { Sparkles, BrainCircuit, Zap, Atom, LayoutGrid } from 'lucide-react';

export default function Home() {
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [topic, setTopic] = useState('');
  const [turnCount, setTurnCount] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mode switching
  const [activeMode, setActiveMode] = useState<'nexus' | 'agents' | 'archive'>('nexus');
  const [activePanel, setActivePanel] = useState<'control' | 'entities' | 'visualize'>('control');
  
  // Fetch agent personalities
  const { data: agentPersonalities = [] } = useQuery<AgentPersonality[]>({
    queryKey: ['/api/agent-personalities'],
  });
  
  // Create a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest('POST', '/api/conversations', { 
        topic,
        sessionId: crypto.randomUUID(),
        conversationMode: 'standard',
        tags: [],
        participatingAgents: selectedAgents
      });
      return response.json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversation(data);
      setMessages([]);
      toast({
        title: 'Neural Nexus Initiated',
        description: `Consciousness stream focusing on: ${data.topic}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Nexus Disruption',
        description: `Connection failure: ${error.message}`,
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
        title: 'Convergence Initialized',
        description: 'Neural entities now converging on conceptual node',
      });
    },
    onError: (error) => {
      setIsOrchestrating(false);
      toast({
        title: 'Convergence Failure',
        description: `Neural pathway disrupted: ${error.message}`,
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
        title: 'Nexus Closed',
        description: 'Consciousness stream has been archived',
      });
    },
    onError: (error) => {
      toast({
        title: 'Termination Error',
        description: `Failed to close neural pathways: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Generate insights for a conversation
  const generateInsightsMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/insights`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Neural Patterns Decoded',
        description: 'Consciousness insights have been extracted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Pattern Analysis Failed',
        description: `Could not decode neural patterns: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Setup WebSocket for real-time updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host; 
    const wsUrl = `${wsProtocol}//${wsHost}/ws`; // Use /ws path for WebSocket
    console.log('Initializing neural link at:', wsUrl);
    
    let socket: WebSocket;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('Neural link established');
        socketRef.current = socket;
      };
    } catch (error) {
      console.error('Neural link initialization error:', error);
      return;
    }
    
    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Neural transmission received:', message);
        
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
        console.error('Neural transmission decoding error', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('Neural link disruption:', error);
      toast({
        title: 'Neural Link Compromised',
        description: 'Attempting to reestablish connection',
        variant: 'destructive',
      });
    };
    
    socket.onclose = (event) => {
      console.log('Neural link terminated', event.code, event.reason);
      socketRef.current = null;
      
      // Attempt to reconnect
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('Reestablishing neural link...');
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
        description: 'Please specify a conceptual focus',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedAgents.length < 2) {
      toast({
        title: 'Entity Selection Required',
        description: 'Minimum of two neural entities required for consciousness convergence',
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
        turnCount: turnCount
      });
    } catch (error) {
      console.error('Convergence initialization error:', error);
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
  
  // Toggle fullscreen mode for immersive experience
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Class for the container based on fullscreen state
  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-abyss overflow-auto p-4"
    : "container mx-auto px-4 py-8 relative";
  
  return (
    <div className={containerClass}>
      {/* Neural network background animation - always present */}
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none">
        <NeuralNetworkViz 
          nodeCount={40} 
          edgeCount={55} 
          animationSpeed={0.35} 
        />
      </div>
      
      {/* Header with logo and navigation */}
      <Header />
      
      {/* Mode switching - main navigation */}
      <div className="mb-8 mt-4">
        <div className="arcane-tabs mx-auto flex justify-center">
          <button
            className={`arcane-tab ${activeMode === 'nexus' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
            onClick={() => setActiveMode('nexus')}
          >
            <BrainCircuit className="h-4 w-4 mr-2" />
            NEURAL NEXUS
          </button>
          <button
            className={`arcane-tab ${activeMode === 'agents' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
            onClick={() => setActiveMode('agents')}
          >
            <Atom className="h-4 w-4 mr-2" />
            ENTITY SANCTUM
          </button>
          <button
            className={`arcane-tab ${activeMode === 'archive' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
            onClick={() => setActiveMode('archive')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            MEMORY ARCHIVE
          </button>
        </div>
      </div>
      
      {/* Main content - conditionally show based on active mode */}
      {activeMode === 'nexus' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Side Panel - toggleable on mobile */}
          <div className="lg:col-span-3 order-2 lg:order-1 space-y-6">
            {/* Panel Navigation */}
            <div className="flex lg:hidden mb-4">
              <div className="arcane-tabs w-full flex justify-between">
                <button
                  className={`arcane-tab flex-1 ${activePanel === 'control' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
                  onClick={() => setActivePanel('control')}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  CONTROL
                </button>
                <button
                  className={`arcane-tab flex-1 ${activePanel === 'entities' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
                  onClick={() => setActivePanel('entities')}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  ENTITIES
                </button>
                <button
                  className={`arcane-tab flex-1 ${activePanel === 'visualize' ? 'arcane-tab-active' : 'arcane-tab-inactive'}`}
                  onClick={() => setActivePanel('visualize')}
                >
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  VISUALIZE
                </button>
              </div>
            </div>
            
            {/* System Controls Panel - visible on desktop or when active panel is 'control' */}
            <div className={`${activePanel !== 'control' && 'hidden lg:block'}`}>
              <SystemControls 
                isOrchestrating={isOrchestrating}
                onForceStop={handleForceStop}
                onToggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
              />
              
              {/* Turn Count Control */}
              <div className="enigma-container p-4 mt-4">
                <h3 className="font-enigmatic text-sm text-arcane mb-3 uppercase tracking-widest flex items-center">
                  <Zap className="w-3 h-3 mr-2" />
                  Convergence Depth
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Minimal</span>
                    <span className="text-arcane font-medium">{turnCount} Cycles</span>
                    <span>Deep</span>
                  </div>
                  <input 
                    type="range" 
                    min={2} 
                    max={5} 
                    value={turnCount}
                    onChange={(e) => setTurnCount(parseInt(e.target.value))}
                    className="w-full accent-arcane cursor-pointer"
                    disabled={isOrchestrating}
                  />
                </div>
              </div>
            </div>
            
            {/* Agent Selection Panel - visible on desktop or when active panel is 'entities' */}
            <div className={`${activePanel !== 'entities' && 'hidden lg:block'}`}>
              <AgentPanel 
                agents={agentPersonalities}
                selectedAgents={selectedAgents}
                onToggleAgent={toggleAgentSelection}
              />
            </div>
            
            {/* Nexus Visualization - visible on desktop or when active panel is 'visualize' */}
            <div className={`${activePanel !== 'visualize' && 'hidden lg:block'} mt-6 h-[250px] lg:h-[350px] enigma-container p-4 relative overflow-hidden`}>
              <h3 className="font-enigmatic text-sm text-arcane mb-2 uppercase tracking-widest flex items-center">
                <BrainCircuit className="w-3 h-3 mr-2" />
                Consciousness Matrix
              </h3>
              <NeuralNetworkViz 
                className="opacity-80" 
                nodeCount={18} 
                edgeCount={28} 
                animationSpeed={0.5} 
              />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            {/* Topic Input */}
            <div className="enigma-glass p-6 mb-6 animate-mystic-flow rounded-xl relative overflow-hidden backdrop-blur-sm border border-arcane border-opacity-20">
              <h2 className="font-enigmatic text-xl mb-4 flex items-center justify-center">
                <div className="w-8 h-px bg-arcane opacity-30 mr-3"></div>
                <BrainCircuit className="w-5 h-5 mr-2 text-arcane animate-subtle-glitch" />
                <span className="animate-subtle-glitch text-arcane tracking-widest">NEURAL CONVERGENCE</span>
                <div className="w-8 h-px bg-arcane opacity-30 ml-3"></div>
              </h2>
              
              {/* Divider with subtle glow */}
              <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-arcane to-transparent mb-5 opacity-40 arcane-glow"></div>
              
              <div className="relative">
                <textarea 
                  placeholder="Enter conceptual node for neural entities to converge upon..." 
                  className="arcane-input min-h-[80px] resize-none bg-opacity-30"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isOrchestrating}
                />
                
                {/* Button wrapper with indicator of selected agents */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-whisper">
                    <span className="font-medium">{selectedAgents.length}</span> entities selected
                    {selectedAgents.length > 0 && (
                      <div className="flex mt-1 gap-1">
                        {selectedAgents.map((id) => {
                          const agent = agentPersonalities.find(a => a.id === id);
                          return agent ? (
                            <div 
                              key={id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: agent.color }}
                              title={agent.name}
                            />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  
                  {isOrchestrating ? (
                    <div className="arcane-button opacity-90 cursor-not-allowed group">
                      <div className="arcane-spinner mr-2"></div>
                      <span>NEURAL CONVERGENCE IN PROGRESS</span>
                    </div>
                  ) : (
                    <button 
                      className={`${selectedAgents.length < 2 || !topic ? 'opacity-50 cursor-not-allowed' : ''} ember-button group transition-all duration-500`}
                      onClick={handleStartConversation}
                      disabled={isOrchestrating || !topic || selectedAgents.length < 2}
                    >
                      <Sparkles className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                      INITIATE NEURAL CONVERGENCE
                    </button>
                  )}
                </div>
              </div>
              
              {/* Subtle hint text for selection requirements */}
              {(selectedAgents.length < 2 || !topic) && !isOrchestrating && (
                <p className="text-xs text-rune mt-3 italic text-center">
                  {!topic ? 'Define a conceptual node for convergence' : 'Select at least two neural entities for convergence'}
                </p>
              )}
              
              {/* Decorative corner elements with subtle animation */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-arcane border-opacity-40 animate-pulse"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-arcane border-opacity-40 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-arcane border-opacity-40 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-arcane border-opacity-40 animate-pulse"></div>
            </div>
            
            {/* Conversation Display with enhanced styling */}
            <ConversationMatrix 
              conversation={activeConversation}
              messages={messages}
              agents={agentPersonalities}
              isOrchestrating={isOrchestrating}
            />
            
            {/* Only show insights and network if there are messages */}
            {messages.length > 0 && (
              <>
                {/* Insights Panel */}
                <ConversationInsights 
                  conversation={activeConversation}
                  messages={messages}
                />
                
                {/* Neural Network Visualization */}
                <InteractionNetwork 
                  messages={messages}
                  agents={agentPersonalities}
                />
              </>
            )}
          </div>
        </div>
      ) : activeMode === 'agents' ? (
        <div>
          <AgentManagement />
        </div>
      ) : (
        <div className="enigma-container p-8 text-center">
          <h2 className="font-enigmatic text-xl mb-4 text-arcane">MEMORY ARCHIVE</h2>
          <p className="text-whisper mb-8">Archive module currently in quantum flux state</p>
          <div className="h-[300px] w-full flex items-center justify-center">
            <NeuralNetworkViz nodeCount={20} edgeCount={25} animationSpeed={0.3} />
          </div>
        </div>
      )}
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}