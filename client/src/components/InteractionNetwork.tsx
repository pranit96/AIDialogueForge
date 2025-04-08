import { useEffect, useRef } from 'react';
import { Message, AgentPersonality } from '@/types';
import * as d3 from 'd3';

interface InteractionNetworkProps {
  messages: Message[];
  agents: AgentPersonality[];
}

export default function InteractionNetwork({ messages, agents }: InteractionNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Create and update the visualization when messages or agents change
  useEffect(() => {
    if (!svgRef.current || agents.length === 0) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    
    // Generate nodes and links based on agents and messages
    const nodes = [
      // Agent nodes
      ...agents.map((agent, i) => ({
        id: `agent-${agent.id}`,
        name: agent.name,
        color: agent.color,
        type: 'agent',
        messageCount: messages.filter(m => m.agentPersonalityId === agent.id).length,
        x: (width / (agents.length + 1)) * (i + 1),
        y: height / 3
      })),
      // Topic node (center bottom)
      {
        id: 'topic',
        name: 'Topic',
        color: '#8892B0',
        type: 'topic',
        x: width / 2,
        y: height * 0.75
      }
    ];
    
    // Create links between agents based on conversation flow
    const links: any[] = [];
    
    // Add links from each agent to the topic
    nodes.filter(n => n.type === 'agent').forEach(agent => {
      links.push({
        source: agent.id,
        target: 'topic',
        value: 1,
        color: '#8892B0'
      });
    });
    
    // Add links between agents based on message sequence
    if (messages.length >= 2) {
      for (let i = 1; i < messages.length; i++) {
        const sourceId = messages[i-1].agentPersonalityId;
        const targetId = messages[i].agentPersonalityId;
        
        if (sourceId !== targetId) {
          const sourceAgent = agents.find(a => a.id === sourceId);
          const targetAgent = agents.find(a => a.id === targetId);
          
          if (sourceAgent && targetAgent) {
            links.push({
              source: `agent-${sourceId}`,
              target: `agent-${targetId}`,
              value: 2,
              color: sourceAgent.color
            });
          }
        }
      }
    }
    
    // Create a force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX().x((d: any) => d.x).strength(0.1))
      .force('y', d3.forceY().y((d: any) => d.y).strength(0.1));
    
    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.value)
      .attr('stroke-dasharray', d => d.source === 'topic' || d.target === 'topic' ? '3,3' : null);
    
    // Add flow indicators on links
    const flowIndicator = svg.append('g')
      .selectAll('circle')
      .data(links)
      .enter()
      .append('circle')
      .attr('r', 3)
      .attr('fill', d => d.color)
      .style('opacity', 0.7);
    
    // Animate flow indicators
    flowIndicator.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.3;1;0.3')
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinite');
    
    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g');
    
    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.type === 'agent' ? 15 : 10)
      .attr('fill', d => d.color);
    
    // Add text labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#020A13')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', d => d.type === 'agent' ? 10 : 8)
      .text(d => d.type === 'agent' ? `${d.name.charAt(0)}${d.id.split('-')[1]}` : 'Topic');
    
    // Update positions on each simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);
      
      flowIndicator
        .attr('cx', d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('cy', d => ((d.source as any).y + (d.target as any).y) / 2);
      
      node.attr('transform', d => `translate(${(d as any).x},${(d as any).y})`);
    });
    
  }, [messages, agents]);
  
  return (
    <div className="glass rounded-lg p-5 border border-deep-space">
      <h2 className="font-cyber text-xl text-cyber-mint mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        </svg>
        INTERACTION NETWORK
      </h2>
      
      <div className="h-48 md:h-64 bg-deep-space bg-opacity-50 rounded-md border border-ghost-blue p-4 flex items-center justify-center">
        {messages.length > 0 ? (
          <svg ref={svgRef} width="100%" height="100%"></svg>
        ) : (
          <div className="text-center">
            <p className="text-ghost-blue">
              Conversation visualization will appear here.
            </p>
            <p className="text-xs text-ghost-blue mt-2">
              Start a conversation to see agent interaction patterns
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
