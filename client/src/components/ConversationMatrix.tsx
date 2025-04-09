import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Conversation, AgentPersonality } from '@/types';
import { BrainCircuit, MessageSquare, SparklesIcon, ClockIcon, Zap } from 'lucide-react';
import NeuralNetworkViz from './NeuralNetworkViz';

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageAnimationCompleted, setMessageAnimationCompleted] = useState<{[key: number]: boolean}>({});
  
  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Find agent by ID
  const getAgent = (agentId: number) => {
    return agents.find(agent => agent.id === agentId) || null;
  };
  
  // Mark message animation as completed
  const handleAnimationComplete = (messageId: number) => {
    setMessageAnimationCompleted(prev => ({
      ...prev,
      [messageId]: true
    }));
  };
  
  // Render timestamp in relative format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Neural network visualization */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <NeuralNetworkViz 
          nodeCount={25}
          edgeCount={35}
          animationSpeed={isOrchestrating ? 1 : 0.3}
        />
      </div>
      
      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-6 px-4 sm:px-6 space-y-6 z-10"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            {isOrchestrating ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center rounded-full bg-arcane bg-opacity-20 p-3">
                  <BrainCircuit className="h-6 w-6 text-arcane animate-pulse" />
                </div>
                <p className="text-whisper">Neural entities connecting...</p>
              </div>
            ) : null}
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => {
              const agent = getAgent(message.agentPersonalityId);
              const isThinking = message.messageType === 'thinking';
              const isSystem = message.messageType === 'system';
              
              if (!agent && !isSystem) return null;
              
              // System message style
              if (isSystem) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center"
                  >
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-void-black bg-opacity-40 border border-whisper border-opacity-20 text-xs text-whisper">
                      <Zap className="h-3 w-3" />
                      <span>{message.content}</span>
                    </div>
                  </motion.div>
                );
              }
              
              // Regular message or thinking
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  onAnimationComplete={() => handleAnimationComplete(message.id)}
                  className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                  <div className="max-w-[80%] sm:max-w-[70%]">
                    <div className="flex items-start space-x-3">
                      {/* Agent avatar */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: agent?.color || '#9D30A5' }}
                      >
                        <span className="text-xs font-bold text-white">
                          {agent?.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Message content */}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span 
                            className="font-bold text-sm"
                            style={{ color: agent?.color || '#9D30A5' }}
                          >
                            {agent?.name}
                          </span>
                          <span className="text-xs text-whisper opacity-60">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        <div 
                          className={`glass-panel p-4 rounded-lg overflow-hidden ${
                            isThinking ? 'border-dashed border-whisper border-opacity-20' : 'border-solid'
                          }`}
                          style={{ 
                            borderColor: isThinking ? undefined : `${agent?.color}30`
                          }}
                        >
                          {isThinking ? (
                            <div className="text-sm text-whisper opacity-70 italic">
                              <div className="flex items-center space-x-2 mb-2">
                                <BrainCircuit className="h-4 w-4" />
                                <span>Thinking Process:</span>
                              </div>
                              {message.content}
                            </div>
                          ) : (
                            <div className="text-sm text-whisper whitespace-pre-wrap">
                              {messageAnimationCompleted[message.id] ? (
                                message.content
                              ) : (
                                <TypewriterEffect 
                                  text={message.content} 
                                  speed={20} 
                                  onComplete={() => handleAnimationComplete(message.id)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Message metadata */}
                        <div className="flex items-center space-x-3 mt-1 text-xs text-whisper opacity-60">
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{message.tokenCount || '~'} tokens</span>
                          </div>
                          
                          {message.model && (
                            <div className="flex items-center space-x-1">
                              <SparklesIcon className="h-3 w-3" />
                              <span>{message.model.replace('llama3-', 'Llama 3 ')}</span>
                            </div>
                          )}
                          
                          {message.processTime && (
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-3 w-3" />
                              <span>{(message.processTime / 1000).toFixed(1)}s</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Typewriter effect component for messages
function TypewriterEffect({ 
  text, 
  speed = 30,
  onComplete
}: { 
  text: string; 
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, speed);
      
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);
  
  return (
    <>
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-cursor">|</span>
      )}
    </>
  );
}