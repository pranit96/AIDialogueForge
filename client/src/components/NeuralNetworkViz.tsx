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
  type: 'primary' | 'secondary' | 'accent'; // Different node types for visual variety
  size: number; // Size variation
}

interface Edge {
  source: number;
  target: number;
  delay: number;
  type: 'normal' | 'important' | 'faded'; // Different edge types
}

export default function EnigmaNetworkViz({
  className = '',
  nodeCount = 65,
  edgeCount = 100,
  animationSpeed = 0.6
}: NeuralNetworkVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const animationRef = useRef<number>();
  
  // Initialize nodes and edges
  useEffect(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    
    // Create nodes with different types
    const newNodes: Node[] = [];
    for (let i = 0; i < nodeCount; i++) {
      // Determine node type based on frequency (mostly primary, some secondary and few accent)
      const typeRand = Math.random();
      let type: 'primary' | 'secondary' | 'accent';
      if (typeRand > 0.85) {
        type = 'accent';
      } else if (typeRand > 0.6) {
        type = 'secondary';
      } else {
        type = 'primary';
      }
      
      // Size variations
      const size = type === 'primary' ? 2 + Math.random() * 2 :
                   type === 'secondary' ? 3 + Math.random() * 3 :
                   4 + Math.random() * 4;
      
      newNodes.push({
        id: i,
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.5 * animationSpeed,
        vy: (Math.random() - 0.5) * 0.5 * animationSpeed,
        pulseDelay: Math.random() * 5,
        type,
        size
      });
    }
    setNodes(newNodes);
    
    // Create edges with different types
    const newEdges: Edge[] = [];
    for (let i = 0; i < edgeCount; i++) {
      const sourceIdx = Math.floor(Math.random() * nodeCount);
      const targetIdx = Math.floor(Math.random() * nodeCount);
      
      // Edge type varies based on connected nodes and random factors
      let type: 'normal' | 'important' | 'faded';
      if (newNodes[sourceIdx]?.type === 'accent' || newNodes[targetIdx]?.type === 'accent') {
        type = 'important';
      } else if (Math.random() > 0.7) {
        type = 'faded';
      } else {
        type = 'normal';
      }
      
      newEdges.push({
        source: sourceIdx,
        target: targetIdx,
        delay: Math.random() * 2,
        type
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
  
  // Optimized animation loop with frame throttling
  useEffect(() => {
    if (nodes.length === 0) return;
    
    let lastFrameTime = 0;
    const targetFPS = 24; // Limit to 24 FPS for better performance
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      // Skip frames to maintain target FPS
      if (timestamp - lastFrameTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastFrameTime = timestamp;
      
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          // More efficient movement calculations
          let newX = node.x + node.vx;
          let newY = node.y + node.vy;
          
          // Reduce random velocity changes for better performance
          const velocityChange = Math.random() > 0.995;
          let newVx = node.vx;
          let newVy = node.vy;
          
          if (velocityChange) {
            newVx = node.vx + (Math.random() - 0.5) * 0.03 * animationSpeed;
            newVy = node.vy + (Math.random() - 0.5) * 0.03 * animationSpeed;
          }
          
          // Simple boundary checks
          if (newX < 0 || newX > containerSize.width) {
            newVx = -newVx;
            newX = newX < 0 ? 0 : containerSize.width;
          }
          
          if (newY < 0 || newY > containerSize.height) {
            newVy = -newVy;
            newY = newY < 0 ? 0 : containerSize.height;
          }
          
          return {
            ...node,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
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
  }, [nodes, containerSize, animationSpeed]);
  
  // Handle node hover
  const handleNodeHover = (nodeId: number) => {
    setHoverNode(nodeId);
  };
  
  const handleNodeLeave = () => {
    setHoverNode(null);
  };
  
  return (
    <div 
      ref={containerRef}
      className={`nexus-network relative overflow-hidden ${className}`}
    >
      {/* Mysterious background atmosphere */}
      <div className="absolute inset-0 bg-gradient-radial from-shadow to-abyss opacity-40 pointer-events-none"></div>
      
      {/* Simplified Edges */}
      {edges.map((edge, index) => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate edge dimensions
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Simplified hover detection
        const isHoveredEdge = hoverNode !== null && (hoverNode === edge.source || hoverNode === edge.target);
        
        // Simplified styling
        let baseOpacity = edge.type === 'important' ? 0.4 : edge.type === 'normal' ? 0.25 : 0.15;
        let opacity = isHoveredEdge ? baseOpacity * 2 : baseOpacity;
        
        // Use a simpler gradient for better performance
        const gradient = edge.type === 'important' 
          ? 'linear-gradient(90deg, rgba(123, 43, 254, 0.6), rgba(226, 73, 190, 0.6))' 
          : 'linear-gradient(90deg, rgba(123, 43, 254, 0.4), rgba(61, 145, 255, 0.4))';
        
        // Simpler shadow
        const edgeShadow = isHoveredEdge 
          ? '0 0 8px rgba(123, 43, 254, 0.4)' 
          : 'none';
        
        return (
          <div
            key={`edge-${index}`}
            className="nexus-edge"
            style={{
              left: `${sourceNode.x}px`,
              top: `${sourceNode.y}px`,
              width: `${length}px`,
              height: isHoveredEdge ? '2px' : '1px',
              transform: `rotate(${angle}deg)`,
              background: gradient,
              boxShadow: edgeShadow,
              opacity,
              transformOrigin: 'left center',
            }}
          />
        );
      })}
      
      {/* Simplified Nodes */}
      {nodes.map(node => {
        // Simplified hover state
        const isHovered = hoverNode === node.id;
        
        // Simplified colors - reduced variety for better performance
        const nodeColor = node.type === 'primary' 
          ? 'rgba(123, 43, 254, 0.85)'  // Purple
          : 'rgba(226, 73, 190, 0.85)'; // Pink
        
        // Simplified shadow - only applied on hover
        const nodeShadow = isHovered 
          ? '0 0 15px rgba(123, 43, 254, 0.6)' 
          : 'none';
        
        // Simplified size adjustments
        const nodeSize = isHovered ? node.size * 2 : node.size;
        
        return (
          <div
            key={`node-${node.id}`}
            className="nexus-node"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
              backgroundColor: nodeColor,
              boxShadow: nodeShadow,
              opacity: 0.8,
              transform: isHovered ? 'scale(1.2)' : 'scale(1)'
            }}
            onMouseEnter={() => handleNodeHover(node.id)}
            onMouseLeave={handleNodeLeave}
          />
        );
      })}
    </div>
  );
}