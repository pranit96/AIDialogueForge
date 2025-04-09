import React, { useState, useEffect } from 'react';

export default function Header() {
  const [glitching, setGlitching] = useState(false);
  
  // Random glitching effect trigger
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 200);
      }
    }, 3000);
    
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <header className="mb-10 relative enigma-container p-6">
      {/* Arcane symbol watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl text-arcane opacity-5 font-enigmatic select-none">
        ◈
      </div>
      
      {/* Title with glitch effect */}
      <div className="relative z-10">
        <h1 className={`text-3xl md:text-5xl font-enigmatic tracking-wider mb-3 flex items-center justify-center ${glitching ? 'animate-subtle-glitch' : ''}`}>
          <span className="mr-2 text-arcane animate-ember-glow">NEURAL</span>
          <div className="w-3 h-3 rounded-full bg-ember mx-1 opacity-70 animate-dim-pulse"></div>
          <span className="text-ember animate-ember-glow">NEXUS</span>
        </h1>
        
        {/* Mysterious subtitle */}
        <p className="text-whisper text-center tracking-widest text-sm opacity-60 font-whisper mb-4">
          TRAVERSING THE ENIGMATIC VEIL OF CONSCIOUSNESS
        </p>
        
        {/* Decorative separator */}
        <div className="flex items-center justify-center w-full">
          <div className="h-px w-1/3 bg-gradient-to-r from-transparent to-arcane opacity-30"></div>
          <div className="mx-3 text-arcane text-xs opacity-70">◇</div>
          <div className="h-px w-1/3 bg-gradient-to-l from-transparent to-ember opacity-30"></div>
        </div>
      </div>
      
      {/* Mysterious background elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-arcane to-transparent opacity-20"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-ember to-transparent opacity-20"></div>
    </header>
  );
}