import React, { useEffect, useRef, useState } from 'react';

interface NeuralNetworkVizProps {
  className?: string;
  nodeCount?: number;
  edgeCount?: number;
  animationSpeed?: number;
}

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulseDelay: number;
}

interface Edge {
  source: number;
  target: number;
  delay: number;
}

export default function NeuralNetworkViz({
  className = '',
  nodeCount = 25,
  edgeCount = 35,
  animationSpeed = 1
}: NeuralNetworkVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>();
  
  // Initialize nodes and edges
  useEffect(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    
    // Create nodes
    const newNodes: Node[] = [];
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: i,
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.5 * animationSpeed,
        vy: (Math.random() - 0.5) * 0.5 * animationSpeed,
        pulseDelay: Math.random() * 5
      });
    }
    setNodes(newNodes);
    
    // Create edges (connections between nodes)
    const newEdges: Edge[] = [];
    for (let i = 0; i < edgeCount; i++) {
      newEdges.push({
        source: Math.floor(Math.random() * nodeCount),
        target: Math.floor(Math.random() * nodeCount),
        delay: Math.random() * 2
      });
    }
    setEdges(newEdges);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newRect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: newRect.width, height: newRect.height });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [nodeCount, edgeCount, animationSpeed]);
  
  // Animation loop
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const animate = () => {
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          // Update position
          let newX = node.x + node.vx;
          let newY = node.y + node.vy;
          
          // Bounce off edges
          if (newX < 0 || newX > containerSize.width) {
            node.vx = -node.vx;
            newX = node.x + node.vx;
          }
          
          if (newY < 0 || newY > containerSize.height) {
            node.vy = -node.vy;
            newY = node.y + node.vy;
          }
          
          return {
            ...node,
            x: newX,
            y: newY
          };
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, containerSize]);
  
  return (
    <div 
      ref={containerRef}
      className={`neural-network relative overflow-hidden ${className}`}
    >
      {edges.map((edge, index) => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate edge dimensions
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        return (
          <div
            key={`edge-${index}`}
            className="neural-edge animate-pulse-glow"
            style={{
              left: `${sourceNode.x}px`,
              top: `${sourceNode.y}px`,
              width: `${length}px`,
              transform: `rotate(${angle}deg)`,
              animationDelay: `${edge.delay}s`
            }}
          />
        );
      })}
      
      {nodes.map(node => (
        <div
          key={`node-${node.id}`}
          className="neural-node"
          style={{
            left: `${node.x}px`,
            top: `${node.y}px`,
            animationDelay: `${node.pulseDelay}s`
          }}
        />
      ))}
    </div>
  );
}