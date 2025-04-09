import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Conversation, AgentPersonality } from '@/types';
import { BrainCircuit, MessageSquare, SparklesIcon, ClockIcon } from 'lucide-react';

interface ConversationMatrixProps {
  conversation: Conversation | null;
  messages: Message[];
  agents: AgentPersonality[];
  isOrchestrating: boolean;
}

export default function ConversationMatrix({ 
  conversation, 
  messages, 
  agents,
  isOrchestrating 
}: ConversationMatrixProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTimestamp, setShowTimestamp] = useState<number | null>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Find agent name, color, and additional details by id
  const getAgentDetails = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    return {
      name: agent?.name || 'UNKNOWN',
      title: agent?.title || 'Neural Entity',
      color: agent?.color || '#9D30A5',
      archetype: agent?.archetype || 'unknown'
    };
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Generate random angles for the message shapes
  const getShapeStyle = (seed: number) => {
    const baseAngle = (seed * 17) % 12 - 6; // Range: -6 to 6 degrees
    return {
      transform: `rotate(${baseAngle}deg)`,
    };
  };
  
  return (
    <div className="enigma-container p-5 mb-6 relative overflow-hidden group">
      {/* Ambient decoration */}
      <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-arcane opacity-5 blur-xl"></div>
      <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-ember opacity-5 blur-xl"></div>
      
      <h2 className="font-enigmatic text-lg text-arcane mb-6 uppercase tracking-widest flex items-center justify-between">
        <div className="flex items-center">
          <BrainCircuit className="w-4 h-4 mr-2 text-arcane" />
          Neural Consciousness Stream
        </div>
        
        {/* Active conversation info */}
        {conversation && (
          <div className="flex items-center text-xs">
            <MessageSquare className="w-3 h-3 mr-1 text-whisper opacity-60" />
            <span className="text-whisper opacity-60">{messages.length}</span>
          </div>
        )}
      </h2>
      
      {/* Topic Display - Show mysterious visualization when active */}
      <div className="mb-6">
        {conversation ? (
          <div 
            className="enigma-glass p-4 rounded-lg border border-arcane border-opacity-20 backdrop-blur-sm relative overflow-hidden"
          >
            <h3 className="font-enigmatic text-xs text-arcane uppercase tracking-wider mb-1.5 flex items-center">
              <SparklesIcon className="w-3 h-3 mr-1.5" />
              Conceptual Node:
            </h3>
            <p className="text-whisper text-sm font-medium animate-subtle-glitch relative z-10">
              {conversation.topic}
            </p>
            
            {/* Create a subtle glow based on the agents in the conversation */}
            {agents.filter(a => conversation.participatingAgents?.includes(a.id)).map((agent, i) => (
              <div 
                key={agent.id}
                className="absolute opacity-10 blur-md"
                style={{
                  backgroundColor: agent.color,
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  left: `${(i * 80) % 100}%`,
                  bottom: '-20px',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="enigma-glass p-4 rounded-lg border border-arcane border-opacity-10 backdrop-blur-sm bg-opacity-20">
            <p className="text-whisper opacity-60 text-sm text-center">
              No active neural convergence
            </p>
          </div>
        )}
      </div>
      
      {/* Conversation Flow */}
      <div className="space-y-5 max-h-[500px] overflow-y-auto px-1 py-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => {
            const { name, title, color, archetype } = message.agentName && message.agentColor
              ? { 
                  name: message.agentName, 
                  color: message.agentColor,
                  title: 'Neural Entity',
                  archetype: 'unknown'
                }
              : getAgentDetails(message.agentPersonalityId);
            
            const isAlternate = index % 2 === 1;
            const shapeStyle = getShapeStyle(message.agentPersonalityId * 100 + index);
            
            return (
              <motion.div 
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  type: 'spring',
                  stiffness: 120,
                  damping: 20
                }}
                className={`flex ${isAlternate ? 'justify-end' : 'justify-start'} items-start group/message`}
              >
                {!isAlternate && (
                  <div className="mr-3 relative">
                    <div 
                      className="rune-circle h-10 w-10 flex items-center justify-center text-abyss font-bold flex-shrink-0 overflow-hidden"
                      style={{ 
                        background: `linear-gradient(45deg, ${color}, ${color}dd)`,
                        boxShadow: `0 0 10px ${color}44`
                      }}
                    >
                      <span className="font-enigmatic text-sm">{name.charAt(0)}</span>
                    </div>
                    <div 
                      className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-abyss"
                      style={{ backgroundColor: color }}
                    ></div>
                  </div>
                )}
                
                <div 
                  className={`enigma-glass relative p-4 max-w-[85%] backdrop-blur-sm overflow-hidden
                    ${isAlternate ? 'message-mystic' : 'message-oracle'} 
                    group-hover/message:border-opacity-40 transition-all duration-300`}
                  style={shapeStyle}
                >
                  {/* Agent name and timestamp */}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-xs font-enigmatic tracking-wide flex items-center" style={{ color }}>
                        {name}
                        <span className="ml-1.5 text-whisper opacity-50 text-xxs">
                          // {title}
                        </span>
                      </div>
                    </div>
                    
                    {/* Timestamp on hover */}
                    <div 
                      className="ml-2 text-xxs text-whisper opacity-0 group-hover/message:opacity-40 transition-opacity duration-300 cursor-default flex items-center"
                      onMouseEnter={() => setShowTimestamp(message.id)}
                      onMouseLeave={() => setShowTimestamp(null)}
                    >
                      <ClockIcon className="w-2.5 h-2.5 mr-1" />
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                  
                  {/* Message content */}
                  <div 
                    className="text-whisper relative"
                    style={{
                      textShadow: showTimestamp === message.id ? `0 0 10px ${color}22` : 'none'
                    }}
                  >
                    {message.content}
                  </div>
                  
                  {/* Subtle model info */}
                  {message.model && (
                    <div className="text-xxs text-whisper opacity-0 group-hover/message:opacity-30 transition-opacity duration-300 mt-2">
                      Neural pattern: {message.model}
                    </div>
                  )}
                  
                  {/* Animated border glow on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover/message:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(45deg, transparent, ${color}22, transparent, ${color}11, transparent)`,
                      backgroundSize: '200% 200%',
                      animation: 'shimmer 3s linear infinite'
                    }}
                  ></div>
                </div>
                
                {isAlternate && (
                  <div className="ml-3 relative">
                    <div 
                      className="rune-diamond h-10 w-10 flex items-center justify-center text-abyss font-bold flex-shrink-0 overflow-hidden"
                      style={{ 
                        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                        boxShadow: `0 0 10px ${color}44`
                      }}
                    >
                      <span className="font-enigmatic text-sm">{name.charAt(0)}</span>
                    </div>
                    <div 
                      className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full border border-abyss"
                      style={{ backgroundColor: color }}
                    ></div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Thinking indicator when orchestrating */}
        {isOrchestrating && messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start"
          >
            <div className="mr-3 relative">
              <div 
                className="rune-circle h-10 w-10 flex items-center justify-center text-abyss font-bold flex-shrink-0 overflow-hidden animate-pulse"
                style={{ 
                  background: `linear-gradient(45deg, ${agents[messages.length % agents.length]?.color || '#9D30A5'}, ${agents[messages.length % agents.length]?.color || '#9D30A5'}cc)`,
                  boxShadow: `0 0 12px ${agents[messages.length % agents.length]?.color || '#9D30A5'}55`,
                }}
              >
                <span className="font-enigmatic text-sm animate-ping opacity-75">
                  {agents[messages.length % agents.length]?.name.charAt(0) || '?'}
                </span>
              </div>
            </div>
            
            <div className="enigma-glass p-3 max-w-[85%] backdrop-blur-sm message-oracle">
              <div 
                className="text-xs font-enigmatic tracking-wide mb-1"
                style={{ color: agents[messages.length % agents.length]?.color || '#9D30A5' }}
              >
                {agents[messages.length % agents.length]?.name || 'NEURAL ENTITY'}
              </div>
              <div className="text-whisper opacity-70 flex items-center space-x-2">
                <span>Neural processing</span>
                <span className="flex space-x-1">
                  <span className="w-1 h-1 bg-arcane rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1 h-1 bg-arcane rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1 h-1 bg-arcane rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Empty state */}
        {messages.length === 0 && !isOrchestrating && (
          <div className="text-center py-12 opacity-70">
            <div className="w-16 h-16 mx-auto mb-4 opacity-30">
              <BrainCircuit className="w-full h-full text-arcane" />
            </div>
            <p className="text-whisper mb-2 font-enigmatic tracking-wide">
              No consciousness convergence initiated
            </p>
            <p className="text-sm text-whisper opacity-60">
              Enter a conceptual node and select neural entities above
            </p>
          </div>
        )}
        
        {/* Anchor for auto-scrolling */}
        <div ref={messagesEndRef} className="h-0" />
      </div>
    </div>
  );
}
