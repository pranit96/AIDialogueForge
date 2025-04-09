import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Maximize2, Minimize2, Square, Sparkles, FilmIcon, Gauge } from 'lucide-react';

interface SystemControlsProps {
  isOrchestrating: boolean;
  onForceStop: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export default function SystemControls({ 
  isOrchestrating, 
  onForceStop, 
  onToggleFullscreen, 
  isFullscreen = false 
}: SystemControlsProps) {
  const [conversationSpeed, setConversationSpeed] = useState(70);
  const [verbosityLevel, setVerbosityLevel] = useState(50);
  const [creativityLevel, setCreativityLevel] = useState<'LOW' | 'MID' | 'HIGH'>('HIGH');
  const [systemStatusPulse, setSystemStatusPulse] = useState(false);
  
  // Pulse the system status indicator when orchestrating
  if (isOrchestrating && !systemStatusPulse) {
    setSystemStatusPulse(true);
  } else if (!isOrchestrating && systemStatusPulse) {
    setSystemStatusPulse(false);
  }
  
  const handleForceStop = () => {
    // Add visual feedback when stop is clicked
    const button = document.getElementById('force-stop');
    if (button) {
      button.classList.add('bg-ember');
      button.classList.add('text-abyss');
      
      setTimeout(() => {
        button.classList.remove('bg-ember');
        button.classList.remove('text-abyss');
        
        // Call the actual stop function
        onForceStop();
      }, 300);
    } else {
      onForceStop();
    }
  };
  
  return (
    <div className="enigma-container p-5 mb-6 relative overflow-hidden group">
      {/* Status indicator - pulsing when active */}
      <div className={`absolute top-3 right-3 flex items-center ${systemStatusPulse ? 'animate-pulse' : ''}`}>
        <div className={`w-2 h-2 rounded-full mr-1.5 ${isOrchestrating ? 'bg-ember' : 'bg-arcane'}`}></div>
        <span className="text-xs font-enigmatic text-whisper">
          {isOrchestrating ? 'ACTIVE' : 'IDLE'}
        </span>
      </div>
      
      <h2 className="font-enigmatic text-sm text-arcane mb-6 uppercase tracking-widest flex items-center">
        <Zap className="w-4 h-4 mr-2 text-arcane" />
        Neural Convergence Controls
      </h2>
      
      {/* Control buttons row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Force stop button */}
        <motion.button 
          id="force-stop" 
          className="py-2.5 px-3 rounded-md bg-opacity-80 border border-ember border-opacity-40 text-ember hover:bg-ember hover:bg-opacity-20 transition-all duration-300 flex justify-center items-center font-enigmatic text-xs tracking-wider group"
          onClick={handleForceStop}
          disabled={!isOrchestrating}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: isOrchestrating ? 1 : 0.6 }}
        >
          <Square className="w-3.5 h-3.5 mr-2 group-hover:animate-pulse" />
          TERMINATE
        </motion.button>
        
        {/* Fullscreen toggle button */}
        {onToggleFullscreen && (
          <motion.button 
            className="py-2.5 px-3 rounded-md bg-opacity-80 border border-arcane border-opacity-40 text-arcane hover:bg-arcane hover:bg-opacity-20 transition-all duration-300 flex justify-center items-center font-enigmatic text-xs tracking-wider group"
            onClick={onToggleFullscreen}
            whileTap={{ scale: 0.95 }}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 mr-2 group-hover:animate-pulse" />
                COLLAPSE
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 mr-2 group-hover:animate-pulse" />
                EXPAND
              </>
            )}
          </motion.button>
        )}
      </div>
      
      {/* Advanced Controls */}
      <div className="space-y-5 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
        {/* Conversation Speed */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-whisper text-xs font-enigmatic flex items-center">
              <Gauge className="w-3 h-3 mr-1.5 text-arcane" />
              NEURAL TEMPO
            </label>
            <span className="text-xs text-arcane font-medium">{conversationSpeed}%</span>
          </div>
          <div className="h-1 w-full bg-abyss rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-arcane to-ember rounded-full transition-all duration-300"
              style={{ width: `${conversationSpeed}%` }}
            ></div>
          </div>
          <input 
            type="range" 
            className="w-full h-1 appearance-none cursor-pointer opacity-0 -mt-1"
            value={conversationSpeed}
            onChange={(e) => setConversationSpeed(parseInt(e.target.value))}
            min="30"
            max="100"
          />
        </div>
        
        {/* Verbosity Level */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-whisper text-xs font-enigmatic flex items-center">
              <FilmIcon className="w-3 h-3 mr-1.5 text-arcane" />
              RESPONSE DEPTH
            </label>
            <span className="text-xs text-arcane font-medium">{verbosityLevel}%</span>
          </div>
          <div className="h-1 w-full bg-abyss rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-arcane to-ember rounded-full transition-all duration-300"
              style={{ width: `${verbosityLevel}%` }}
            ></div>
          </div>
          <input 
            type="range" 
            className="w-full h-1 appearance-none cursor-pointer opacity-0 -mt-1"
            value={verbosityLevel}
            onChange={(e) => setVerbosityLevel(parseInt(e.target.value))}
            min="30"
            max="100"
          />
        </div>
        
        {/* Response Creativity */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-whisper text-xs font-enigmatic flex items-center">
              <Sparkles className="w-3 h-3 mr-1.5 text-arcane" />
              REALITY DIFFUSION
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button 
              className={`py-1 px-2 rounded-sm text-xs font-enigmatic tracking-wider transition-all duration-300 ${
                creativityLevel === 'LOW' 
                  ? 'bg-arcane bg-opacity-30 text-whisper border border-arcane border-opacity-40' 
                  : 'bg-abyss bg-opacity-50 text-whisper text-opacity-60 border border-arcane border-opacity-20 hover:border-opacity-30'
              }`}
              onClick={() => setCreativityLevel('LOW')}
            >
              BOUND
            </button>
            <button 
              className={`py-1 px-2 rounded-sm text-xs font-enigmatic tracking-wider transition-all duration-300 ${
                creativityLevel === 'MID' 
                  ? 'bg-arcane bg-opacity-30 text-whisper border border-arcane border-opacity-40' 
                  : 'bg-abyss bg-opacity-50 text-whisper text-opacity-60 border border-arcane border-opacity-20 hover:border-opacity-30'
              }`}
              onClick={() => setCreativityLevel('MID')}
            >
              FLUID
            </button>
            <button 
              className={`py-1 px-2 rounded-sm text-xs font-enigmatic tracking-wider transition-all duration-300 ${
                creativityLevel === 'HIGH' 
                  ? 'bg-arcane bg-opacity-30 text-whisper border border-arcane border-opacity-40' 
                  : 'bg-abyss bg-opacity-50 text-whisper text-opacity-60 border border-arcane border-opacity-20 hover:border-opacity-30'
              }`}
              onClick={() => setCreativityLevel('HIGH')}
            >
              UNBOUND
            </button>
          </div>
        </div>
      </div>
      
      {/* Ambient decoration */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-arcane to-transparent opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-arcane via-transparent to-arcane opacity-20"></div>
    </div>
  );
}
