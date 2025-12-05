import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TimeMode, Emotion } from '../types';
import { MODE_CONFIG, EMOTION_CONFIG } from '../constants';

interface SentientCoreProps {
  mode: TimeMode;
  emotion: Emotion;
  isActive: boolean;
  cognitiveDensity?: number; // 0.0 - 1.0
}

const SentientCore: React.FC<SentientCoreProps> = ({ mode, emotion, isActive, cognitiveDensity = 0.1 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    const modeConfig = MODE_CONFIG[mode];
    const emotionConfig = EMOTION_CONFIG[emotion];
    
    // Blend colors: Base mode color + Emotion color
    const baseColor = emotion === Emotion.NEUTRAL 
        ? modeConfig.color 
        : d3.interpolateRgb(modeConfig.color, emotionConfig.color)(0.7);

    // Core Radius Base - Grows with density
    const coreRadius = Math.min(width, height) * (0.15 + (cognitiveDensity * 0.15));

    // Gradient Definition
    const defs = svg.append("defs");
    const radialGradient = defs.append("radialGradient")
      .attr("id", "core-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    radialGradient.append("stop")
      .attr("offset", "30%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0.9);
    
    radialGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0.1);

    // Group for the core
    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // --- CRYSTAL STRUCTURE ---
    // High density = geometric interconnected nodes (Solid)
    // Low density = fluid circular rings (Gas/Liquid)
    
    if (cognitiveDensity > 0.4) {
        // Crystalline Structure
        const polyCount = 3 + Math.floor(cognitiveDensity * 5); // 3 to 8 sides
        const layers = 2 + Math.floor(cognitiveDensity * 3);
        
        for(let l=0; l<layers; l++) {
           const r = coreRadius * (1 + l * 0.5);
           const points: [number, number][] = [];
           for(let i=0; i<polyCount; i++) {
               const angle = (i / polyCount) * Math.PI * 2;
               points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
           }
           
           g.append("polygon")
            .attr("points", points.join(" "))
            .attr("fill", "none")
            .attr("stroke", baseColor)
            .attr("stroke-width", 1 + (l * 0.5))
            .attr("stroke-opacity", 0.3 + (cognitiveDensity * 0.3))
            .attr("class", `crystal-layer-${l}`);
        }
    } else {
        // Fluid Rings
        const ringCount = 3 + Math.floor(cognitiveDensity * 5); 
        const rings = Array.from({ length: ringCount }, (_, i) => i + 1);
        rings.forEach((r, i) => {
          g.append("circle")
            .attr("r", coreRadius * (1.5 + i * 0.3)) 
            .attr("fill", "none")
            .attr("stroke", baseColor)
            .attr("stroke-width", 1) 
            .attr("stroke-opacity", 0.3)
            .attr("class", `ring-${i}`);
        });
    }

    // The Inner Core (Sphere)
    const core = g.append("circle")
      .attr("r", coreRadius)
      .attr("fill", "url(#core-gradient)");

    // Animation Logic
    let pulseSpeed = 2000;
    let rotationSpeed = 20000 / (1 + cognitiveDensity); // Higher density = slower rotation (heavier)
    
    if (isActive) pulseSpeed /= 2;

    const pulse = () => {
      core.transition()
        .duration(pulseSpeed)
        .attr("r", coreRadius * (isActive ? 1.1 : 1.05))
        .attr("opacity", 0.8)
        .transition()
        .duration(pulseSpeed)
        .attr("r", coreRadius)
        .attr("opacity", 1)
        .on("end", pulse);
    };
    pulse();

    // Rotations
    if (cognitiveDensity > 0.4) {
        // Rotate polygons
        const layers = 2 + Math.floor(cognitiveDensity * 3);
        for(let l=0; l<layers; l++) {
             d3.select(`.crystal-layer-${l}`)
               .append("animateTransform")
               .attr("attributeName", "transform")
               .attr("type", "rotate")
               .attr("from", `0 0 0`)
               .attr("to", `${l % 2 === 0 ? 360 : -360} 0 0`)
               .attr("dur", `${rotationSpeed/1000 * (l+1)}s`)
               .attr("repeatCount", "indefinite");
        }
    } else {
        // Rotate rings
        const ringCount = 3 + Math.floor(cognitiveDensity * 5); 
        for(let i=0; i<ringCount; i++) {
            d3.select(`.ring-${i}`)
               .attr("stroke-dasharray", `${coreRadius} ${coreRadius/2}`)
               .append("animateTransform")
               .attr("attributeName", "transform")
               .attr("type", "rotate")
               .attr("from", `0 0 0`)
               .attr("to", `360 0 0`)
               .attr("dur", `${10 + i * 2}s`)
               .attr("repeatCount", "indefinite");
        }
    }

    // Particle System (Thoughts)
    const particleCount = 20 + Math.floor(cognitiveDensity * 80);
    const activeParticles = isActive || emotion !== Emotion.NEUTRAL;

    if (activeParticles) {
        for(let i=0; i<particleCount; i++) {
             g.append("circle")
              .attr("r", Math.random() * 2)
              .attr("fill", baseColor)
              .attr("opacity", 0)
              .transition()
              .delay(Math.random() * 2000)
              .duration(pulseSpeed)
              .on("start", function repeat() {
                  d3.select(this)
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("opacity", 1)
                    .transition()
                    .duration(1000 + Math.random() * 1000)
                    .attr("cx", (Math.random() - 0.5) * width * 0.8)
                    .attr("cy", (Math.random() - 0.5) * height * 0.8)
                    .attr("opacity", 0)
                    .on("end", repeat);
              });
        }
    }

  }, [mode, isActive, emotion, cognitiveDensity]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full absolute inset-0" style={{ filter: 'blur(0.5px) drop-shadow(0 0 15px rgba(255,255,255,0.1))' }}></svg>
      
      {/* Overlay Text */}
      <div className="absolute bottom-4 left-4 text-xs font-display tracking-widest opacity-50 uppercase pointer-events-none">
        <div className="flex flex-col gap-1">
            <span>SYS.MODE: {mode}</span>
            <span>DENSITY: {(cognitiveDensity * 100).toFixed(1)}%</span>
            <span>STRUCTURE: {cognitiveDensity > 0.4 ? 'CRYSTALLINE' : 'FLUID'}</span>
        </div>
      </div>
    </div>
  );
};

export default SentientCore;