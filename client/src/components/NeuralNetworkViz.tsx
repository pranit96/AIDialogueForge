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
      
      {/* Enhanced Edges with animation and glow */}
      {edges.map((edge, index) => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        if (!sourceNode || !targetNode) return null;
        
        // Calculate edge dimensions
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Determine if this edge is connected to the hovered node
        const isHoveredEdge = hoverNode !== null && (hoverNode === edge.source || hoverNode === edge.target);
        
        // Enhanced opacity calculation
        let opacity = edge.type === 'important' ? 0.4 : 
                      edge.type === 'normal' ? 0.25 : 0.15;
        
        // Enhance opacity if either connected node is hovered
        if (isHoveredEdge) {
          opacity = edge.type === 'important' ? 0.8 : 
                    edge.type === 'normal' ? 0.6 : 0.4;
        }
        
        // Ethereal energy gradient styles for edges
        let gradient;
        let edgeShadow;
        let filter = 'none';
        let backgroundSize = '100% 100%';
        
        if (edge.type === 'important') {
          gradient = 'linear-gradient(90deg, rgba(123, 43, 254, 0.7), rgba(226, 73, 190, 0.7), rgba(123, 43, 254, 0.7))';
          edgeShadow = '0 0 10px rgba(123, 43, 254, 0.4), 0 0 20px rgba(123, 43, 254, 0.2)';
          backgroundSize = '200% 100%';
        } else if (edge.type === 'normal') {
          gradient = 'linear-gradient(90deg, rgba(123, 43, 254, 0.5), rgba(61, 145, 255, 0.5), rgba(123, 43, 254, 0.5))';
          edgeShadow = '0 0 8px rgba(123, 43, 254, 0.25), 0 0 15px rgba(123, 43, 254, 0.1)';
          backgroundSize = '200% 100%';
        } else {
          gradient = 'linear-gradient(90deg, rgba(30, 30, 38, 0.4), rgba(61, 145, 255, 0.4), rgba(30, 30, 38, 0.4))';
          edgeShadow = '0 0 5px rgba(61, 145, 255, 0.15), 0 0 10px rgba(61, 145, 255, 0.05)';
          backgroundSize = '200% 100%';
        }
        
        // Enhance effects for hovered edges with mysterious glow
        if (isHoveredEdge) {
          filter = 'saturate(1.5) brightness(1.2)';
          
          edgeShadow = edge.type === 'important' ? 
            '0 0 15px rgba(123, 43, 254, 0.6), 0 0 25px rgba(226, 73, 190, 0.4), 0 0 40px rgba(123, 43, 254, 0.2)' : 
            edge.type === 'normal' ? 
            '0 0 12px rgba(123, 43, 254, 0.5), 0 0 20px rgba(61, 145, 255, 0.3), 0 0 35px rgba(123, 43, 254, 0.15)' : 
            '0 0 10px rgba(61, 145, 255, 0.4), 0 0 20px rgba(30, 30, 38, 0.2), 0 0 30px rgba(61, 145, 255, 0.1)';
        }
        
        // Animation classes for energy flow effect
        const animationClass = isHoveredEdge ? 'animate-energy-flow' : '';
        
        return (
          <div
            key={`edge-${index}`}
            className={`nexus-edge ${animationClass}`}
            style={{
              left: `${sourceNode.x}px`,
              top: `${sourceNode.y}px`,
              width: `${length}px`,
              height: isHoveredEdge ? '2px' : '1px',
              transform: `rotate(${angle}deg)`,
              background: gradient,
              backgroundSize: backgroundSize,
              boxShadow: edgeShadow,
              filter: filter,
              animationDelay: `${edge.delay}s`,
              opacity,
              transformOrigin: 'left center',
              transition: 'opacity 0.3s ease, box-shadow 0.3s ease, height 0.3s ease, filter 0.3s ease'
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
        
        let nodeColor;
        let nodeShadow;
        
        // Cosmic ethereal color settings based on node type
        if (node.type === 'primary') {
          nodeColor = 'rgba(123, 43, 254, 0.85)'; // Vivid purple
          nodeShadow = '0 0 12px rgba(123, 43, 254, 0.6)';
        } else if (node.type === 'secondary') {
          nodeColor = 'rgba(226, 73, 190, 0.85)'; // Vivid pink
          nodeShadow = '0 0 12px rgba(226, 73, 190, 0.6)';
        } else {
          nodeColor = 'rgba(61, 145, 255, 0.85)'; // Vivid blue
          nodeShadow = '0 0 12px rgba(61, 145, 255, 0.6)';
        }
        
        let nodeSize = node.size;
        let nodeOpacity = node.type === 'primary' ? 0.75 : 
                         node.type === 'secondary' ? 0.8 : 0.9;
        
        // Mysterious filter effects
        let nodeFilter = 'blur(0.5px)';
        
        // Enhance appearance when hovered or connected to hovered node
        if (isHovered) {
          nodeSize *= 2.5;
          nodeOpacity = 1;
          nodeFilter = 'blur(0px) contrast(1.2)';
          
          // Cosmic glow for hovered nodes
          nodeShadow = node.type === 'primary' ? 
            '0 0 20px rgba(123, 43, 254, 0.9), 0 0 40px rgba(123, 43, 254, 0.4), 0 0 60px rgba(123, 43, 254, 0.2)' : 
            node.type === 'secondary' ? 
            '0 0 20px rgba(226, 73, 190, 0.9), 0 0 40px rgba(226, 73, 190, 0.4), 0 0 60px rgba(226, 73, 190, 0.2)' : 
            '0 0 20px rgba(61, 145, 255, 0.9), 0 0 40px rgba(61, 145, 255, 0.4), 0 0 60px rgba(61, 145, 255, 0.2)';
        } else if (isConnectedToHover) {
          nodeSize *= 1.8;
          nodeOpacity = 0.95;
          nodeFilter = 'blur(0px) contrast(1.1)';
          
          // Enhanced ethereal glow for connected nodes
          nodeShadow = node.type === 'primary' ? 
            '0 0 15px rgba(123, 43, 254, 0.8), 0 0 30px rgba(123, 43, 254, 0.3), 0 0 45px rgba(123, 43, 254, 0.1)' : 
            node.type === 'secondary' ? 
            '0 0 15px rgba(226, 73, 190, 0.8), 0 0 30px rgba(226, 73, 190, 0.3), 0 0 45px rgba(226, 73, 190, 0.1)' : 
            '0 0 15px rgba(61, 145, 255, 0.8), 0 0 30px rgba(61, 145, 255, 0.3), 0 0 45px rgba(61, 145, 255, 0.1)';
        }
        
        // Determine animation class
        const animationClass = isHovered ? 'animate-neuron-pulse' : '';
        
        return (
          <div
            key={`node-${node.id}`}
            className={`nexus-node ${animationClass}`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
              backgroundColor: nodeColor,
              boxShadow: nodeShadow,
              filter: nodeFilter,
              animationDelay: `${node.pulseDelay}s`,
              opacity: nodeOpacity,
              zIndex: isHovered ? 10 : 1,
              transition: 'transform 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67), opacity 0.3s ease, width 0.3s ease, height 0.3s ease, box-shadow 0.3s ease, filter 0.5s ease',
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