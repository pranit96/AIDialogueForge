import { motion } from 'framer-motion';
import { AgentPersonality } from '@/types';
import { useState } from 'react';

interface AgentPanelProps {
  agents: AgentPersonality[];
  selectedAgents: number[];
  onToggleAgent: (agentId: number) => void;
}

export default function AgentPanel({ agents, selectedAgents, onToggleAgent }: AgentPanelProps) {
  const [showAddAgent, setShowAddAgent] = useState(false);
  
  return (
    <div className="glass rounded-lg p-5 border border-deep-space">
      <h2 className="font-cyber text-xl text-cyber-mint mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        ACTIVE AGENTS
      </h2>
      
      <div className="space-y-3">
        {agents.map((agent) => (
          <motion.div 
            key={agent.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center p-2 rounded bg-deep-space cursor-pointer hover:bg-opacity-70 transition-all ${
              selectedAgents.includes(agent.id) 
                ? `border border-${agent.color.substring(1)}`
                : 'border border-ghost-blue border-opacity-30'
            }`}
            onClick={() => onToggleAgent(agent.id)}
          >
            <div 
              className="hexagon h-10 w-10 flex items-center justify-center text-void-black font-bold mr-3"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name.charAt(0)}{agent.id}
            </div>
            <div>
              <h3 className="font-cyber" style={{ color: agent.color }}>{agent.name}</h3>
              <p className="text-xs text-ghost-blue">LLM: {agent.model}</p>
            </div>
            <div className="ml-auto">
              <span 
                className={`inline-block w-2 h-2 rounded-full animate-pulse`}
                style={{ backgroundColor: selectedAgents.includes(agent.id) ? agent.color : '#8892B0' }}
              ></span>
            </div>
          </motion.div>
        ))}
        
        {/* Add Agent Button - Currently just a UI element as adding custom agents is beyond the scope */}
        <button 
          className="w-full py-2 px-4 rounded bg-void-black border border-ghost-blue text-ghost-blue hover:text-cyber-mint hover:border-cyber-mint transition-colors duration-300 flex items-center justify-center"
          onClick={() => setShowAddAgent(!showAddAgent)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ADD AGENT
        </button>
      </div>
    </div>
  );
}
