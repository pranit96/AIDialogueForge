import React from 'react';

export default function Header() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl md:text-5xl font-cyber tracking-wider mb-2 flex items-center">
        <span className="mr-2 text-cyber-mint glitch-text">NEURAL</span>
        <span className="text-neon-pink glitch-text">NEXUS</span>
        <div className="ml-2 animate-pulse text-matrix-green text-2xl">∞</div>
      </h1>
      <p className="text-ghost-blue italic tracking-wide">Consciousness Synthesis in the Algorithmic Void</p>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyber-mint to-transparent mt-4 opacity-60"></div>
    </header>
  );
}