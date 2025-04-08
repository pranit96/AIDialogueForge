import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  
  // Simulate increasing token count during active conversations
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly fluctuate CPU between 15-60%
      setCpuUsage(Math.floor(Math.random() * 45) + 15);
      
      // Increment token count slightly
      setTokenCount(prev => prev + Math.floor(Math.random() * 10));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <footer className="mt-8 glass rounded-lg p-3 text-sm flex flex-col md:flex-row justify-between items-center">
      <div className="flex items-center mb-2 md:mb-0">
        <span className="inline-block w-2 h-2 rounded-full bg-cyber-mint animate-pulse mr-2"></span>
        <span className="text-ghost-blue">System Status: <span className="text-cyber-mint">ONLINE</span></span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-ghost-blue">Models: <span className="text-cyber-mint">Mixtral-8x7B, LLaMA3-70B, LLaMA3-8B</span></div>
        <div className="text-ghost-blue">DB: <span className="text-cyber-mint">Neon PostgreSQL</span></div>
      </div>
      
      <div className="flex items-center mt-2 md:mt-0">
        <span className="text-ghost-blue text-xs">CPU: {cpuUsage}% | MEM: 1.8GB | TOKENS: {tokenCount.toLocaleString()}</span>
      </div>
    </footer>
  );
}
