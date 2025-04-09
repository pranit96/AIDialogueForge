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
  nodeCount = 40,
  edgeCount = 60,
  animationSpeed = 0.5
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
  
  // Animation loop
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const animate = () => {
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          // Update position with smoother, more mysterious movement
          let newX = node.x + node.vx;
          let newY = node.y + node.vy;
          
          // Occasionally change velocity slightly for more organic movement
          const velocityChange = Math.random() > 0.99;
          let newVx = velocityChange ? 
            node.vx + (Math.random() - 0.5) * 0.05 * animationSpeed : 
            node.vx;
          let newVy = velocityChange ? 
            node.vy + (Math.random() - 0.5) * 0.05 * animationSpeed : 
            node.vy;
          
          // Dampen speed if it gets too fast
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > animationSpeed * 0.8) {
            newVx = (newVx / speed) * animationSpeed * 0.8;
            newVy = (newVy / speed) * animationSpeed * 0.8;
          }
          
          // Bounce off edges
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
      
      {/* Edges */}
      {edges.map((edge, index) => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate edge dimensions
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Determine edge appearance based on type and hover state
        let opacity = edge.type === 'important' ? 0.35 : 
                      edge.type === 'normal' ? 0.2 : 0.1;
        
        // Enhance opacity if either connected node is hovered
        if (hoverNode === edge.source || hoverNode === edge.target) {
          opacity += 0.3;
        }
        
        // Edge style based on type
        let edgeStyles = {};
        if (edge.type === 'important') {
          edgeStyles = {
            background: 'linear-gradient(90deg, rgba(157, 48, 165, 0.5), rgba(207, 69, 32, 0.5))'
          };
        } else if (edge.type === 'normal') {
          edgeStyles = {
            background: 'linear-gradient(90deg, rgba(157, 48, 165, 0.3), rgba(68, 87, 125, 0.3))'
          };
        } else {
          edgeStyles = {
            background: 'linear-gradient(90deg, rgba(30, 30, 38, 0.3), rgba(68, 87, 125, 0.2))'
          };
        }
        
        return (
          <div
            key={`edge-${index}`}
            className="nexus-edge animate-fade-in-out"
            style={{
              left: `${sourceNode.x}px`,
              top: `${sourceNode.y}px`,
              width: `${length}px`,
              transform: `rotate(${angle}deg)`,
              animationDelay: `${edge.delay}s`,
              opacity,
              ...edgeStyles
            }}
          />
        );
      })}
      
      {/* Nodes */}
      {nodes.map(node => {
        // Determine node appearance based on type and hover state
        const isHovered = hoverNode === node.id;
        const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
        const isConnectedToHover = hoverNode !== null && 
          connectedEdges.some(e => e.source === hoverNode || e.target === hoverNode);
        
        let nodeColor = node.type === 'primary' ? 'bg-arcane' : 
                       node.type === 'secondary' ? 'bg-ember' : 'bg-celestial';
        
        let nodeSize = node.size;
        let nodeOpacity = node.type === 'primary' ? 0.5 : 
                         node.type === 'secondary' ? 0.7 : 0.9;
        
        // Enhance appearance when hovered or connected to hovered node
        if (isHovered) {
          nodeSize *= 1.8;
          nodeOpacity = 1;
        } else if (isConnectedToHover) {
          nodeSize *= 1.4;
          nodeOpacity = 0.9;
        }
        
        return (
          <div
            key={`node-${node.id}`}
            className={`nexus-node ${nodeColor} ${isHovered ? 'animate-dark-pulse' : ''}`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
              animationDelay: `${node.pulseDelay}s`,
              opacity: nodeOpacity,
              zIndex: isHovered ? 10 : 1,
              transition: 'transform 0.3s ease, opacity 0.3s ease, width 0.3s ease, height 0.3s ease',
              transform: isHovered ? 'scale(1.2)' : isConnectedToHover ? 'scale(1.1)' : 'scale(1)'
            }}
            onMouseEnter={() => handleNodeHover(node.id)}
            onMouseLeave={handleNodeLeave}
          />
        );
      })}
    </div>
  );
}