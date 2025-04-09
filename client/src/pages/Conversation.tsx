import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Conversation, Message, AgentPersonality } from "@/types";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Loader2, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConversationMatrix from "@/components/ConversationMatrix";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // Fetch conversation
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    error: conversationError,
  } = useQuery<Conversation>({
    queryKey: ["/api/conversations", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  // Fetch messages
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery<Message[]>({
    queryKey: ["/api/conversations", id, "messages"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
    refetchInterval: isOrchestrating ? 2000 : false,
  });

  // Fetch agents
  const {
    data: agents = [],
    isLoading: isLoadingAgents,
    error: agentsError,
  } = useQuery<AgentPersonality[]>({
    queryKey: ["/api/agent-personalities"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Handle WebSocket messages
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const sessionId = localStorage.getItem("nexus_session_id") || crypto.randomUUID();
    localStorage.setItem("nexus_session_id", sessionId);
    
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
    const socket = new WebSocket(wsUrl);
    
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle new message in current conversation
        if (message.type === "NEW_MESSAGE" && message.data.conversationId === parseInt(id)) {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", id, "messages"] });
        }
        
        // Handle conversation end
        if (message.type === "END_CONVERSATION" && message.data.id === parseInt(id)) {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", id] });
          setIsOrchestrating(false);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });
    
    // Clean up on unmount
    return () => {
      socket.close();
    };
  }, [id, queryClient]);

  // Handle orchestration start
  const startOrchestration = async () => {
    if (!conversation) return;
    
    setIsOrchestrating(true);
    
    try {
      // Get active agents
      const activeAgents = agents.filter(agent => agent.active);
      
      if (activeAgents.length < 2) {
        toast({
          title: "Not enough agents",
          description: "Please activate at least 2 agents in settings.",
          variant: "destructive",
        });
        setIsOrchestrating(false);
        return;
      }
      
      // Start orchestration via API
      const response = await apiRequest("POST", "/api/orchestrate", {
        conversationId: parseInt(id),
        topic: conversation.topic,
        agentIds: activeAgents.map(agent => agent.id),
      });
      
      if (!response.ok) {
        throw new Error("Failed to start orchestration");
      }
      
    } catch (error) {
      console.error("Orchestration error:", error);
      toast({
        title: "Orchestration Error",
        description: "Failed to start agent dialogue. Please try again.",
        variant: "destructive",
      });
      setIsOrchestrating(false);
    }
  };

  // Handle force stop
  const handleForceStop = async () => {
    if (!conversation) return;
    
    try {
      const response = await apiRequest("POST", `/api/conversations/${id}/end`);
      
      if (!response.ok) {
        throw new Error("Failed to end conversation");
      }
      
      setIsOrchestrating(false);
      toast({
        title: "Dialogue Ended",
        description: "The neural dialogue has been terminated.",
      });
      
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast({
        title: "Error",
        description: "Failed to end the dialogue. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle go to query screen
  const goToQuery = () => {
    navigate("/query");
  };

  // Handle go to settings
  const goToSettings = () => {
    navigate("/settings");
  };

  // Loading state
  if (isLoadingConversation || isLoadingMessages || isLoadingAgents) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-arcane" />
        <p className="mt-4 text-whisper">Establishing Neural Connection...</p>
      </div>
    );
  }

  // Error state
  if (conversationError || messagesError || agentsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h2 className="heading-2 text-ember mb-4">Neural Link Disrupted</h2>
        <p className="body-base text-whisper mb-8">
          Connection to the Neural Nexus failed. Please try again.
        </p>
        <Button onClick={goToQuery} className="primary-button">
          Return to Neural Gateway
        </Button>
      </div>
    );
  }

  // Conversation not found
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h2 className="heading-2 text-ember mb-4">Neural Thread Not Found</h2>
        <p className="body-base text-whisper mb-8">
          The requested neural dialogue does not exist or has been terminated.
        </p>
        <Button onClick={goToQuery} className="primary-button">
          Return to Neural Gateway
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full py-4 px-6 glass-panel z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToQuery}
              className="mr-2"
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="heading-3 gradient-text-cosmic truncate max-w-[200px] sm:max-w-md">
              {conversation.topic}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!isOrchestrating && messages.length === 0 && (
              <Button 
                onClick={startOrchestration}
                className="primary-button"
              >
                Initiate Dialogue
              </Button>
            )}
            
            {isOrchestrating && (
              <Button 
                onClick={handleForceStop}
                variant="outline"
                className="secondary-button"
              >
                Terminate Dialogue
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={goToSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        <ConversationMatrix 
          conversation={conversation}
          messages={messages}
          agents={agents}
          isOrchestrating={isOrchestrating}
        />
        
        {!isOrchestrating && messages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6 max-w-2xl">
              <h2 className="heading-2 gradient-text mb-6">Neural Fabric Ready</h2>
              <p className="body-large text-whisper mb-8">
                The agents are prepared to discuss: <span className="text-arcane">{conversation.topic}</span>
              </p>
              <Button 
                onClick={startOrchestration}
                className="primary-button pulse-glow"
                size="lg"
              >
                Initiate Neural Dialogue
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}