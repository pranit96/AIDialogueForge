import { motion } from 'framer-motion';

export default function Header() {
  return (
    <header className="mb-10 text-center relative">
      <motion.div 
        className="animate-float"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-cyber text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyber-mint to-neon-pink text-transparent bg-clip-text animate-text-glow mb-2">
          NEXUSMINDS
        </h1>
        <p className="text-xl text-ghost-blue">Multi-Agent AI Orchestration System</p>
      </motion.div>
      
      <div className="flex justify-center mt-4">
        <div className="h-0.5 w-24 bg-neon-pink"></div>
        <div className="h-0.5 w-24 bg-cyber-mint"></div>
        <div className="h-0.5 w-24 bg-matrix-green"></div>
      </div>
    </header>
  );
}
