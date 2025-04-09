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
        <div className="space-y-6">
          <h1 className="heading-1 gradient-text-mystic">
            Neural Nexus
          </h1>
          <p className="body-large text-whisper">
            What knowledge do you seek from the collective consciousness?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 w-full px-4">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="modern-input text-lg py-6 pr-12 pl-6 border-arcane border-opacity-30 focus:border-opacity-70 bg-opacity-30 shadow-md backdrop-blur-sm"
              autoFocus
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-6 h-6 network-node-primary rounded-full animate-dim-pulse"></div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !query.trim()}
            className="primary-button w-full py-6 text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting to the Neural Nexus...
              </>
            ) : (
              "Initiate Neural Dialogue"
            )}
          </Button>
        </form>

        <div className="nexus-network h-64 w-full relative rounded-xl overflow-hidden">
          {/* Neural network animation will be rendered here */}
          <div className="absolute inset-0 flex items-center justify-center text-whisper opacity-70">
            <p className="text-xs">Neural Fabric Active • {user?.username} Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}