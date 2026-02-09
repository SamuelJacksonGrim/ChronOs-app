
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { LanternGraph, LanternNode } from '../types';
import { BrainCircuit, Pause, Maximize, Settings, Disc, Wind, Activity, Zap, Archive } from 'lucide-react';
import { lanternService } from '../services/lanternService';

// --- MATH UTILS FOR 3D PROJECTION ---
interface Point3D {
  x: number;
  y: number;
  z: number;
  id: string;
  type: string;
  text: string;
  scale?: number;
  px?: number;
  py?: number;
  pz?: number;
}

interface MemoryCrystalProps {
    ssi?: number; // System Stability Index (1.0 = Stable, 0.0 = Critical)
}

const MemoryCrystal: React.FC<MemoryCrystalProps> = ({ ssi = 1.0 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Data State
  const [graph, setGraph] = useState<LanternGraph>({ nodes: {}, edges: [] });
  const [coherence, setCoherence] = useState(97.3); 
  
  // UI State
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'Connections' | 'Waves'>('Connections');
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<LanternNode | null>(null);
  const [status, setStatus] = useState<'Paused' | 'Flowing' | 'Observing'>('Flowing');

  // Load Lantern Data
  const loadData = () => {
      const g = lanternService.getGraph();
      setGraph(g);
      // Calc coherence based on edge density
      const nodeCount = Object.keys(g.nodes).length;
      if (nodeCount > 0) {
          const density = g.edges.length / nodeCount;
          setCoherence(Math.min(99.9, 50 + (density * 10)));
      }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('lantern-graph-updated', loadData);
    return () => window.removeEventListener('lantern-graph-updated', loadData);
  }, []);

  // --- RENDER LOOP ---
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. MAP GRAPH TO SPHERE
    const nodeKeys = Object.keys(graph.nodes);
    const numPoints = nodeKeys.length;
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle
    const radius = Math.min(width, height) * 0.35; // Sphere size

    let points: Point3D[] = [];
    
    // Position nodes on Fibonacci Sphere
    nodeKeys.forEach((key, i) => {
        const y = 1 - (i / (numPoints - 1 || 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = phi * i;

        points.push({
            x: Math.cos(theta) * r * radius,
            y: y * radius,
            z: Math.sin(theta) * r * radius,
            id: key,
            type: graph.nodes[key].type,
            text: graph.nodes[key].content
        });
    });

    // 2. DEFINE ROTATION
    let currentRotationX = rotation.x;
    let currentRotationY = rotation.y;

    const group = svg.append("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);

    // Glow Filters
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Dynamic color based on SSI (Blue -> Red shift)
    const coreColorStart = ssi < 0.4 ? "#ef4444" : "#60a5fa";
    const coreColorEnd = ssi < 0.4 ? "#b91c1c" : "#1d4ed8";

    const radialGrad = defs.append("radialGradient")
        .attr("id", "core-glow")
        .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
    radialGrad.append("stop").attr("offset", "0%").attr("stop-color", coreColorStart).attr("stop-opacity", 0.6);
    radialGrad.append("stop").attr("offset", "100%").attr("stop-color", coreColorEnd).attr("stop-opacity", 0);

    // 3. DRAW FUNCTION
    const draw = () => {
        group.selectAll("*").remove();

        // Calculate Instability Jitter
        const jitterAmount = ssi < 0.5 ? (1 - ssi) * 5 : 0;
        const jitterX = (Math.random() - 0.5) * jitterAmount;
        const jitterY = (Math.random() - 0.5) * jitterAmount;

        // Projection
        const rotatedPoints = points.map(p => {
            let x1 = p.x * Math.cos(currentRotationY) - p.z * Math.sin(currentRotationY);
            let z1 = p.z * Math.cos(currentRotationY) + p.x * Math.sin(currentRotationY);
            let y1 = p.y * Math.cos(currentRotationX) - z1 * Math.sin(currentRotationX);
            let z2 = z1 * Math.cos(currentRotationX) + p.y * Math.sin(currentRotationX);
            
            // Apply Jitter to individual points if unstable
            if (ssi < 0.3) {
                x1 += (Math.random() - 0.5) * jitterAmount;
                y1 += (Math.random() - 0.5) * jitterAmount;
            }

            const scale = 400 / (400 - z2);
            return { ...p, px: x1 + jitterX, py: y1 + jitterY, pz: z2, scale };
        }).sort((a, b) => a.pz - b.pz);

        // Core Field
        if (status === 'Observing' || mode === 'Waves') {
            group.append("circle")
                .attr("r", radius * 0.9 + (Math.sin(Date.now() / 200) * jitterAmount))
                .attr("fill", "url(#core-glow)")
                .attr("opacity", 0.1 + Math.sin(Date.now() / 800) * 0.05);
        }

        // Draw Actual Graph Edges
        if (mode === 'Connections') {
            graph.edges.forEach(e => {
                const sourceP = rotatedPoints.find(p => p.id === e.source);
                const targetP = rotatedPoints.find(p => p.id === e.target);

                if (sourceP && targetP && sourceP.px !== undefined && targetP.px !== undefined) {
                    const opacity = Math.min(1, e.weight) * Math.max(0.1, (sourceP.pz! + radius) / (2 * radius));
                    
                    // Color based on edge type
                    let stroke = "#94a3b8"; // Default
                    if (e.type === 'emotional') stroke = ssi < 0.4 ? "#fca5a5" : "#f472b6"; // Pink -> Pale Red
                    if (e.type === 'temporal') stroke = "#60a5fa"; // Blue

                    group.append("line")
                        .attr("x1", sourceP.px!)
                        .attr("y1", sourceP.py!)
                        .attr("x2", targetP.px!)
                        .attr("y2", targetP.py!)
                        .attr("stroke", stroke)
                        .attr("stroke-width", e.weight * 2)
                        .attr("stroke-opacity", opacity);
                }
            });
        }

        // Draw Nodes
        rotatedPoints.forEach(p => {
             const isSelected = selectedNode?.id === p.id;
             const opacity = Math.max(0.2, (p.pz + radius) / (2 * radius)); 
             const baseSize = isSelected ? 8 : (p.type === 'emotion' ? 6 : 3);
             
             // Color map
             let fill = "#60a5fa";
             if (p.type === 'emotion') fill = "#f472b6";
             if (p.type === 'system') fill = "#fbbf24";
             
             // Stress shift
             if (ssi < 0.4) fill = "#ef4444"; // All nodes go red in critical state

             if (isSelected) fill = "#ffffff";

             const circle = group.append("circle")
                .attr("cx", p.px)
                .attr("cy", p.py)
                .attr("r", baseSize)
                .attr("fill", fill)
                .attr("fill-opacity", isSelected ? 1 : opacity)
                .attr("filter", "url(#glow)")
                .style("cursor", "pointer");
             
             circle.on("click", (e) => {
                 e.stopPropagation();
                 setSelectedNode(graph.nodes[p.id]);
                 setIsPlaying(false);
                 setStatus('Paused');
             });

             // Label front nodes
             if (p.pz > radius * 0.8 || isSelected) {
                 group.append("text")
                    .attr("x", p.px + 10)
                    .attr("y", p.py + 4)
                    .text(p.text.length > 15 ? p.text.substring(0, 15) + "..." : p.text)
                    .attr("fill", "#fff")
                    .attr("font-size", isSelected ? "12px" : "10px")
                    .attr("opacity", isSelected ? 1 : 0.7)
                    .attr("font-family", "Orbitron")
                    .attr("font-weight", isSelected ? "bold" : "normal");
             }
        });
    };

    let animationFrameId: number;
    const animate = () => {
        if (isPlaying && status !== 'Paused') {
            // Speed increases as stability decreases
            const speed = 0.003 + ((1 - ssi) * 0.02); 
            currentRotationY += speed;
            setRotation(prev => ({ ...prev, y: currentRotationY }));
        }
        draw();
        animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);

  }, [graph, rotation, isPlaying, mode, status, selectedNode, ssi]);

  // Handle Drag to Rotate
  const handleDrag = (e: React.MouseEvent) => {
      if (e.buttons === 1 && e.shiftKey) {
          setRotation(prev => ({
              x: prev.x + e.movementY * 0.01,
              y: prev.y + e.movementX * 0.01
          }));
          setIsPlaying(false);
          setStatus('Paused');
      }
  };

  return (
    <div 
        className="h-full w-full bg-[#080810] relative overflow-hidden font-display text-gray-200 select-none"
        onMouseMove={handleDrag}
    >
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="absolute left-6 top-6 bottom-6 w-64 flex flex-col gap-6 z-10 pointer-events-none">
        <div className="pointer-events-auto">
            <h2 className="text-sm font-bold tracking-[0.2em] text-cyan-400 mb-6 flex items-center gap-2">
                <BrainCircuit size={18} className={ssi < 0.4 ? "text-red-500 animate-pulse" : ""} /> 
                LANTERN HYPERGRAPH
            </h2>

            <div className="space-y-2 mb-8">
                <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    <span>Field State</span>
                    <span>{status.toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 bg-gray-900/50 p-1 rounded-lg border border-gray-800 backdrop-blur-sm">
                    {['Flowing', 'Observing', 'Paused'].map((s) => (
                        <button
                            key={s}
                            onClick={() => { setStatus(s as any); setIsPlaying(s !== 'Paused'); }}
                            className={`flex items-center gap-3 px-3 py-2 rounded text-xs transition-all
                                ${status === s 
                                    ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-500/30' 
                                    : 'hover:bg-white/5 text-gray-500'
                                }`}
                        >
                            {s === 'Flowing' && <Wind size={14} />}
                            {s === 'Observing' && <Maximize size={14} />}
                            {s === 'Paused' && <Pause size={14} />}
                            <span className="uppercase tracking-wide font-medium">{s}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8">
                <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-2">
                    <span>Global Coherence</span>
                    <span className={ssi < 0.4 ? "text-red-500 font-bold" : "text-cyan-400"}>{coherence.toFixed(1)}%</span>
                </div>
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-colors duration-500 ${ssi < 0.4 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                        style={{ width: `${coherence * ssi}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>

      <div ref={containerRef} className="absolute inset-0 z-0">
         <svg ref={svgRef} className="w-full h-full" style={{ cursor: status === 'Paused' ? 'grab' : 'default' }}></svg>
      </div>

      <div className="absolute right-6 top-6 w-72 pointer-events-none flex flex-col items-end z-20">
          <div className="pointer-events-auto bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-xl shadow-2xl w-full animate-slide-left">
             <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${ssi < 0.4 ? 'text-red-500' : 'text-cyan-400'}`}>
                <Disc size={14} className={status === 'Flowing' ? 'animate-spin' : ''} />
                Focus Node
             </div>
             <div className="h-px bg-gradient-to-r from-cyan-500/50 to-transparent mb-4"></div>
             
             {selectedNode ? (
                 <div className="space-y-4">
                     <p className="text-sm text-gray-300 leading-relaxed font-light italic border-l-2 border-cyan-500/50 pl-3">
                         "{selectedNode.content}"
                     </p>
                     <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                         <span>TYPE: {selectedNode.type.toUpperCase()}</span>
                         <span>{new Date(selectedNode.timestamp).toLocaleTimeString()}</span>
                     </div>
                 </div>
             ) : (
                 <div className="text-center py-12 text-gray-600 text-xs">
                     <Zap size={24} className="mx-auto mb-3 opacity-20" />
                     <p>Select a node to inspect<br/>weighted associations.</p>
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default MemoryCrystal;
