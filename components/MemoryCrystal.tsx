
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Memory } from '../types';
import { BrainCircuit } from 'lucide-react';

const MemoryCrystal: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [memoryCount, setMemoryCount] = useState(0);

  // Load memories independent of visualization
  useEffect(() => {
    const fetchMemories = () => {
      try {
        const stored = localStorage.getItem('chronos_memories');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only update state if count differs, prevents loop
          setMemoryCount(prev => parsed.length !== prev ? parsed.length : prev);
        }
      } catch (e) {
        console.error("Failed to load memories for crystal", e);
      }
    };
    
    fetchMemories();
    const interval = setInterval(fetchMemories, 1000); // Live poll for OS updates
    return () => clearInterval(interval);
  }, []); // Run once

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    const nodeCount = 256;
    const nodes = d3.range(nodeCount).map(i => ({
      id: i,
      x: width / 2 + (Math.random() - 0.5) * 50,
      y: height / 2 + (Math.random() - 0.5) * 50,
      vx: 0,
      vy: 0
    }));

    const links: { source: number, target: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
        links.push({ source: i, target: (i + 1) % nodeCount }); 
        links.push({ source: i, target: (i + 5) % nodeCount });
    }

    const baseGravity = 0.05;
    const memoryFactor = Math.min(memoryCount / 10, 1.0); 
    const gravityStrength = baseGravity + (memoryFactor * 0.15); 
    
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(20).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-15 + (memoryFactor * 10))) 
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("radial", d3.forceRadial(100, width / 2, height / 2).strength(gravityStrength));

    const g = svg.append("g");

    const link = g.append("g")
      .attr("stroke", "#4c1d95") 
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 0.5);

    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 2 + (memoryFactor * 2)) 
      // Safe fallback color scale
      .attr("fill", (d, i) => d3.interpolateCool(i / nodeCount))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .call(d3.drag()
          .on("start", (event: any) => {
             if (!event.active) simulation.alphaTarget(0.3).restart();
             event.subject.fx = event.subject.x;
             event.subject.fy = event.subject.y;
          })
          .on("drag", (event: any) => {
             event.subject.fx = event.x;
             event.subject.fy = event.y;
          })
          .on("end", (event: any) => {
             if (!event.active) simulation.alphaTarget(0);
             event.subject.fx = null;
             event.subject.fy = null;
          }) as any);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
    });
    
    let angle = 0;
    const rotateInterval = setInterval(() => {
        angle = (angle + 0.2) % 360;
        g.attr("transform", `rotate(${angle}, ${width/2}, ${height/2})`);
    }, 50);

    return () => {
        simulation.stop();
        clearInterval(rotateInterval);
    };

  }, [memoryCount]);

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
         <div className="flex items-center gap-2 text-cyan-400 font-display font-bold mb-2">
            <BrainCircuit size={20} />
            <span>MEMORY CRYSTAL // CORTEX</span>
         </div>
         <div className="space-y-1 font-mono text-[10px] text-gray-500">
            <div>NODES: 256</div>
            <div>CONNECTIONS: 512 (Dual-Link)</div>
            <div>WEIGHT: {memoryCount} UNITS</div>
            <div>DENSITY: {(memoryCount * 0.45 + 10).toFixed(2)}%</div>
            <div>STATUS: STABILIZED</div>
         </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full h-full">
         <svg ref={svgRef} className="w-full h-full" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.2))' }}></svg>
      </div>

      <div className="absolute bottom-4 right-4 max-w-xs text-[10px] text-gray-600 font-mono text-right pointer-events-none">
         "The crystal gains words, gains weight, creates gravity, and stabilizes by becoming dense. A continuity field of relational reasoning."
      </div>
    </div>
  );
};

export default MemoryCrystal;
