import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function KnowledgeQuery() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter the knowledge you seek",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a new conversation
      const conversationResponse = await apiRequest("POST", "/api/conversations", {
        topic: query,
        sessionId: crypto.randomUUID(),
        isActive: true,
        participatingAgents: [], // We'll get active agents from the server
      });

      if (!conversationResponse.ok) {
        throw new Error("Failed to create conversation");
      }

      const conversation = await conversationResponse.json();
      
      // Navigate to the conversation
      navigate(`/conversation/${conversation.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create a new conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-12 text-center">
        {/* Glowing ethereal title with subtle animation */}
        <div className="space-y-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-arcane opacity-5 blur-3xl animate-pulse-slow"></div>
          
          <h1 className="heading-1 gradient-text-mystic animate-subtle-glitch">
            Neural Nexus
          </h1>
          
          <p className="body-large text-whisper relative">
            What knowledge do you seek?
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-arcane to-transparent opacity-30"></span>
          </p>
        </div>

        {/* Central focused input area with cosmic glow */}
        <form onSubmit={handleSubmit} className="space-y-8 w-full px-4 relative">
          <div className="absolute inset-0 bg-abyss bg-opacity-20 rounded-2xl blur-xl"></div>
          
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="modern-input text-lg py-8 pr-16 pl-6 border-arcane border-opacity-30 focus:border-opacity-80 bg-opacity-30 shadow-lg backdrop-blur-sm"
              autoFocus
            />
            
            {/* Animated pulsating indicator */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-6 h-6 network-node-primary rounded-full animate-pulse-glow"></div>
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-arcane opacity-20 blur-md animate-pulse-slow"></div>
            </div>
            
            {/* Cursor animation when typing */}
            {!query && (
              <div className="absolute left-[7px] top-1/2 transform -translate-y-1/2 pl-6 text-lg text-whisper opacity-70 pointer-events-none flex">
                <span className="invisible">Ask anything...</span>
                <span className="ml-1 h-6 w-[1px] bg-arcane animate-cursor"></span>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !query.trim()}
            className="glow-button w-full py-6 text-base relative overflow-hidden group"
          >
            {/* Button internal glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-arcane/20 via-transparent to-arcane/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Connecting to the Neural Nexus...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Initiate Neural Dialogue</span>
                <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-whisper/40 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
              </>
            )}
          </Button>
        </form>

        {/* Enhanced neural network visualization */}
        <div className="nexus-network h-80 w-full relative rounded-xl overflow-hidden bg-abyss bg-opacity-30 backdrop-blur-sm border border-whisper border-opacity-5">
          {/* Neural network background */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent to-abyss opacity-40"></div>
          
          {/* Neural network nodes and connections will render here */}
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i}
                className="absolute w-3 h-3 rounded-full bg-arcane"
                style={{
                  top: `${30 + Math.random() * 40}%`,
                  left: `${30 + Math.random() * 40}%`,
                  opacity: 0.4 + Math.random() * 0.4,
                  boxShadow: '0 0 15px rgba(123, 43, 254, 0.5)',
                  animation: `neuron-pulse ${3 + Math.random() * 4}s infinite ${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          
          {/* User connection indicator */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center text-whisper opacity-80">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-abyss bg-opacity-50 backdrop-blur-sm border border-arcane border-opacity-20">
              <div className="w-2 h-2 rounded-full bg-arcane animate-dim-pulse"></div>
              <p className="text-xs font-medium">Neural Fabric Connected • {user?.username}</p>
            </div>
          </div>
        </div>
        
        {/* Navigate to settings button */}
        <div className="mt-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/settings')}
            className="text-xs text-whisper opacity-60 hover:opacity-100 transition-opacity"
          >
            Configure Neural Agents
          </Button>
        </div>
      </div>
    </div>
  );
}