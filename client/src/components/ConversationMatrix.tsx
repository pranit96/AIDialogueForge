import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Conversation, AgentPersonality } from '@/types';

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
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Find agent name and color by id
  const getAgentDetails = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    return {
      name: agent?.name || 'UNKNOWN',
      color: agent?.color || '#8892B0'
    };
  };
  
  return (
    <div className="glass rounded-lg p-5 mb-6 border border-deep-space">
      <h2 className="font-cyber text-xl text-cyber-mint mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        CONVERSATION MATRIX
      </h2>
      
      {/* Topic Display */}
      <div className="mb-4 p-3 bg-deep-space rounded-md border border-ghost-blue">
        <p className="text-sm text-ghost-blue">CURRENT TOPIC:</p>
        <p className="text-cyber-mint terminal-text animate-typing animate-blink-caret">
          {conversation?.topic || 'No active discussion'}
        </p>
      </div>
      
      {/* Conversation Flow */}
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
          {messages.map((message, index) => {
            const { name, color } = message.agentName && message.agentColor
              ? { name: message.agentName, color: message.agentColor }
              : getAgentDetails(message.agentPersonalityId);
            
            const isEven = index % 2 === 0;
            
            return (
              <motion.div 
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start ${isEven ? '' : 'justify-end'}`}
              >
                {isEven && (
                  <div 
                    className="hexagon h-10 w-10 flex items-center justify-center text-void-black font-bold mr-3 flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {name.charAt(0)}{message.agentPersonalityId}
                  </div>
                )}
                
                <div className={`glass rounded-lg p-3 relative ${isEven ? 'chat-bubble-left' : 'chat-bubble-right'} max-w-[85%]`}>
                  <div className="text-xs mb-1 font-cyber" style={{ color }}>
                    {name}
                  </div>
                  <p className="text-ghost-blue">{message.content}</p>
                </div>
                
                {!isEven && (
                  <div 
                    className="hexagon h-10 w-10 flex items-center justify-center text-void-black font-bold ml-3 flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {name.charAt(0)}{message.agentPersonalityId}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Typing indicator when conversation is active */}
        {isOrchestrating && messages.length > 0 && (
          <div className="flex items-start">
            <div 
              className="hexagon h-10 w-10 flex items-center justify-center text-void-black font-bold mr-3 flex-shrink-0"
              style={{ backgroundColor: agents[messages.length % agents.length]?.color || '#41FF83' }}
            >
              {agents[messages.length % agents.length]?.name.charAt(0) || 'A'}
              {agents[messages.length % agents.length]?.id || '?'}
            </div>
            <div className="glass rounded-lg p-3 relative chat-bubble-left">
              <div 
                className="text-xs mb-1 font-cyber"
                style={{ color: agents[messages.length % agents.length]?.color || '#41FF83' }}
              >
                {agents[messages.length % agents.length]?.name || 'AGENT'}
              </div>
              <p className="text-ghost-blue loading-dots">Thinking</p>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {messages.length === 0 && !isOrchestrating && (
          <div className="text-center py-10">
            <p className="text-ghost-blue">
              Enter a topic and initiate a conversation to begin.
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
