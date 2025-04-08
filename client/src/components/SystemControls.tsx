import { useState } from 'react';
import { motion } from 'framer-motion';

interface SystemControlsProps {
  isOrchestrating: boolean;
  onForceStop: () => void;
}

export default function SystemControls({ isOrchestrating, onForceStop }: SystemControlsProps) {
  const [conversationSpeed, setConversationSpeed] = useState(50);
  const [verbosityLevel, setVerbosityLevel] = useState(50);
  const [creativityLevel, setCreativityLevel] = useState<'LOW' | 'MID' | 'HIGH'>('MID');
  
  // Note: These controls are mostly for UI demonstration as they don't actually
  // affect the conversation in the current implementation
  
  const handleForceStop = () => {
    // Add visual feedback when stop is clicked
    const button = document.getElementById('force-stop');
    if (button) {
      button.classList.add('bg-neon-pink');
      button.classList.add('text-void-black');
      
      setTimeout(() => {
        button.classList.remove('bg-neon-pink');
        button.classList.remove('text-void-black');
        
        // Call the actual stop function
        onForceStop();
      }, 500);
    } else {
      onForceStop();
    }
  };
  
  return (
    <div className="glass rounded-lg p-5 mb-6 border border-deep-space">
      <h2 className="font-cyber text-xl text-cyber-mint mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        SYSTEM CONTROLS
      </h2>
      
      {/* Force stop button */}
      <motion.button 
        id="force-stop" 
        className="w-full mb-4 py-3 px-4 rounded bg-void-black border border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-void-black transition-all duration-300 flex justify-center items-center font-cyber"
        onClick={handleForceStop}
        disabled={!isOrchestrating}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
        </svg>
        FORCE STOP
      </motion.button>
      
      {/* Controls */}
      <div className="space-y-3">
        <div>
          <label className="block text-ghost-blue text-sm mb-1">Conversation Speed</label>
          <input 
            type="range" 
            className="w-full h-2 bg-deep-space rounded-lg appearance-none cursor-pointer accent-cyber-mint"
            value={conversationSpeed}
            onChange={(e) => setConversationSpeed(parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-ghost-blue text-sm mb-1">Verbosity Level</label>
          <input 
            type="range" 
            className="w-full h-2 bg-deep-space rounded-lg appearance-none cursor-pointer accent-cyber-mint"
            value={verbosityLevel}
            onChange={(e) => setVerbosityLevel(parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-ghost-blue text-sm mb-1">Response Creativity</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              className={`py-1 px-2 rounded text-xs ${
                creativityLevel === 'LOW' 
                  ? 'bg-cyber-mint text-void-black' 
                  : 'bg-deep-space border border-cyber-mint text-cyber-mint'
              }`}
              onClick={() => setCreativityLevel('LOW')}
            >
              LOW
            </button>
            <button 
              className={`py-1 px-2 rounded text-xs ${
                creativityLevel === 'MID' 
                  ? 'bg-cyber-mint text-void-black' 
                  : 'bg-deep-space border border-cyber-mint text-cyber-mint'
              }`}
              onClick={() => setCreativityLevel('MID')}
            >
              MID
            </button>
            <button 
              className={`py-1 px-2 rounded text-xs ${
                creativityLevel === 'HIGH' 
                  ? 'bg-cyber-mint text-void-black' 
                  : 'bg-deep-space border border-cyber-mint text-cyber-mint'
              }`}
              onClick={() => setCreativityLevel('HIGH')}
            >
              HIGH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
