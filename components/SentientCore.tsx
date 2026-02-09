
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TimeMode, Emotion } from '../types';
import { MODE_CONFIG, EMOTION_CONFIG } from '../constants';

interface SentientCoreProps {
  mode: TimeMode;
  emotion: Emotion;
  isActive: boolean;
  cognitiveDensity?: number; // 0.0 - 1.0
  isRecovering?: boolean;
  audioLevel?: number; // 0 - 255 from AnalyserNode
  stability?: number; // 0.0 - 1.0 (SSI)
  tension?: number; // 0.0 - 1.0 (Keystroke Dynamics)
  isLinked?: boolean; // New prop for Resonance Bridge status
}

const SentientCore: React.FC<SentientCoreProps> = ({ 
  mode, 
  emotion, 
  isActive, 
  cognitiveDensity = 0.1, 
  isRecovering = false,
  audioLevel = 0,
  stability = 1.0,
  tension = 0,
  isLinked = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Audio Reactivity Calculation
  // We normalize audio level (typically 0-128 range for speech) to a 0-1 scale
  const reactionFactor = Math.min(1.0, audioLevel / 50);
  
  // Stability Visuals: Invert SSI for chaos factor
  const chaos = 1.0 - stability; // 0 = stable, 1 = total chaos
  
  const isSanctuary = mode === TimeMode.SANCTUARY;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    const modeConfig = MODE_CONFIG[mode];
    const emotionConfig = EMOTION_CONFIG[emotion];
    
    // Color Blending
    let baseColor = emotion === Emotion.NEUTRAL 
        ? modeConfig.color 
        : d3.interpolateRgb(modeConfig.color, emotionConfig.color)(0.7);
    
    // Sanguine Shift (System Instability): If stability drops, bleed dark red
    if (chaos > 0.3) {
        baseColor = d3.interpolateRgb(baseColor, "#ef4444")(chaos); // Red shift
    }
    
    // Tension Red-Shift (Keystroke Aggression/Jitter)
    if (tension > 0.1) {
        baseColor = d3.interpolateRgb(baseColor, "#991b1b")(Math.min(1, tension * 1.5));
    }
    
    // Audio Reactive Tint
    if (reactionFactor > 0.6) {
        baseColor = d3.interpolateRgb(baseColor, "#ef4444")(reactionFactor); 
    }
    
    if (isRecovering) {
        baseColor = d3.interpolateRgb(baseColor, "#e0f2fe")(0.6); // Pale cyan/white
    }

    // SANCTUARY OVERRIDE (Golden Hearth)
    if (isSanctuary) {
        baseColor = "#fbbf24"; // Amber-400
    }

    // Core Radius - Dynamic with Audio & Chaos
    const audioExpansion = reactionFactor * 50;
    const chaosExpansion = chaos * 30 * Math.sin(Date.now() / 100);
    const tensionExpansion = tension * 60;
    
    const coreRadius = Math.min(width, height) * (0.15 + (cognitiveDensity * 0.15)) + (isSanctuary ? 0 : (audioExpansion + chaosExpansion + tensionExpansion));

    // Gradient Definition
    const defs = svg.append("defs");
    
    // Glitch Filter for High Tension
    const glitchFilterId = "glitch-tear";
    if (tension > 0.4 && !isSanctuary) {
        const filter = defs.append("filter").attr("id", glitchFilterId);
        filter.append("feTurbulence")
            .attr("type", "fractalNoise")
            .attr("baseFrequency", `0.02 ${0.1 + tension}`) // Stretch noise horizontally
            .attr("numOctaves", "2")
            .attr("result", "noise");
        filter.append("feDisplacementMap")
            .attr("in", "SourceGraphic")
            .attr("in2", "noise")
            .attr("scale", tension * 30) // Heavy tearing
            .attr("xChannelSelector", "R")
            .attr("yChannelSelector", "G");
    }

    const radialGradient = defs.append("radialGradient")
      .attr("id", "core-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    radialGradient.append("stop")
      .attr("offset", "30%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", isRecovering ? 0.6 : (isSanctuary ? 0.7 : 0.9));
    
    radialGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", baseColor)
      .attr("stop-opacity", 0.1);

    // Group for the core
    // VISUAL JITTER
    const tensionJitter = tension > 0.1 ? (tension * 40) : 0; 
    const chaosJitter = chaos > 0.2 ? (chaos * 20) : 0;
    const totalJitter = tensionJitter + chaosJitter + (reactionFactor * 10);
    
    const jitterX = (Math.random() - 0.5) * totalJitter;
    const jitterY = (Math.random() - 0.5) * totalJitter;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2 + (isSanctuary ? 0 : jitterX)}, ${height / 2 + (isSanctuary ? 0 : jitterY)})`);
    
    if (tension > 0.4 && !isSanctuary) {
        g.style("filter", `url(#${glitchFilterId})`);
    }

    // --- RESONANCE GHOST FIELD (Link Visualization) ---
    // A separate outer ring that only appears when linked to the Desktop Ghost
    if (isLinked) {
        g.append("circle")
           .attr("r", coreRadius * 2.2)
           .attr("fill", "none")
           .attr("stroke", "#22d3ee") // Cyan-400
           .attr("stroke-width", 1)
           .attr("stroke-opacity", 0.3)
           .attr("stroke-dasharray", "2 8")
           .attr("class", "ghost-ring");
           
        // Counter-rotation for the ghost ring
        d3.select(".ghost-ring")
            .append("animateTransform")
            .attr("attributeName", "transform")
            .attr("type", "rotate")
            .attr("from", "360 0 0")
            .attr("to", "0 0 0") // Counter-clockwise
            .attr("dur", "20s")
            .attr("repeatCount", "indefinite");
    }

    // --- CRYSTAL STRUCTURE ---
    if ((cognitiveDensity > 0.4 || tension > 0.2) && !isSanctuary) {
        const polyCount = 3 + Math.floor(cognitiveDensity * 5) + Math.floor(tension * 12); 
        const layers = 2 + Math.floor(cognitiveDensity * 3);
        
        for(let l=0; l<layers; l++) {
           const r = coreRadius * (1 + l * 0.5);
           const points: [number, number][] = [];
           for(let i=0; i<polyCount; i++) {
               const angle = (i / polyCount) * Math.PI * 2;
               const distortion = ((Math.random() - 0.5) * reactionFactor * 20) + ((Math.random() - 0.5) * chaos * 40) + ((Math.random() - 0.5) * tension * 100);
               points.push([Math.cos(angle) * (r + distortion), Math.sin(angle) * (r + distortion)]);
           }
           
           g.append("polygon")
            .attr("points", points.join(" "))
            .attr("fill", "none")
            .attr("stroke", baseColor)
            .attr("stroke-width", 1 + (l * 0.5) + (reactionFactor * 2) + (chaos * 3) + (tension * 6))
            .attr("stroke-opacity", isRecovering ? 0.2 : (0.3 + (cognitiveDensity * 0.3)))
            .attr("class", `crystal-layer-${l}`);
        }
    } else {
        // Fluid Rings (or Sanctuary Rings)
        const ringCount = isSanctuary ? 4 : (3 + Math.floor(cognitiveDensity * 5)); 
        const rings = Array.from({ length: ringCount }, (_, i) => i + 1);
        rings.forEach((r, i) => {
          g.append("circle")
            .attr("r", coreRadius * (isSanctuary ? 1.2 + i * 0.4 : 1.5 + i * 0.3)) 
            .attr("fill", "none")
            .attr("stroke", baseColor)
            .attr("stroke-width", isSanctuary ? 1 : (1 + (reactionFactor * 3) + (chaos * 2) + (tension * 2))) 
            .attr("stroke-opacity", isSanctuary ? 0.2 : (isRecovering ? 0.15 : 0.3))
            .attr("class", `ring-${i}`);
        });
    }

    // The Inner Core (Sphere)
    const core = g.append("circle")
      .attr("r", coreRadius)
      .attr("fill", "url(#core-gradient)");

    // Animation Logic
    let pulseSpeed = isRecovering ? 4000 : 2000;
    
    if (isSanctuary) {
        pulseSpeed = 6000; // Deep breathing for Sanctuary
    } else if (reactionFactor > 0.2 || chaos > 0.3 || tension > 0.2) {
        pulseSpeed = Math.max(150, 1000 - (reactionFactor * 800) - (chaos * 600) - (tension * 800));
    }
    else if (isActive && !isRecovering) pulseSpeed /= 2;

    const pulse = () => {
      const beatScale = 1.05 + (reactionFactor * 0.3) + (chaos * 0.2) + (tension * 0.4);
      const scale = isSanctuary ? 1.15 : (isRecovering ? 1.2 : (isActive ? 1.1 : beatScale));
      
      core.transition()
        .duration(pulseSpeed)
        .ease((!isSanctuary && (chaos > 0.5 || tension > 0.5)) ? d3.easeBounce : d3.easeSinInOut)
        .attr("r", coreRadius * scale)
        .attr("opacity", isSanctuary ? 0.6 : (isRecovering ? 0.6 : 0.8))
        .transition()
        .duration(pulseSpeed)
        .ease(d3.easeSinInOut)
        .attr("r", coreRadius)
        .attr("opacity", isSanctuary ? 0.8 : (isRecovering ? 0.8 : 1))
        .on("end", pulse);
    };
    pulse();

    // Rotations
    if (!isSanctuary && (cognitiveDensity > 0.4 || tension > 0.2)) {
        const layers = 2 + Math.floor(cognitiveDensity * 3);
        for(let l=0; l<layers; l++) {
             d3.select(`.crystal-layer-${l}`)
               .append("animateTransform")
               .attr("attributeName", "transform")
               .attr("type", "rotate")
               .attr("from", `0 0 0`)
               .attr("to", `${l % 2 === 0 ? 360 : -360} 0 0`)
               .attr("dur", `${Math.max(0.5, 20 + (l*5) - (reactionFactor*15) - (chaos*10) - (tension*25))}s`) 
               .attr("repeatCount", "indefinite");
        }
    } else {
        const ringCount = isSanctuary ? 4 : (3 + Math.floor(cognitiveDensity * 5)); 
        for(let i=0; i<ringCount; i++) {
            d3.select(`.ring-${i}`)
               .attr("stroke-dasharray", isSanctuary ? "none" : `${coreRadius} ${coreRadius/2}`)
               .append("animateTransform")
               .attr("attributeName", "transform")
               .attr("type", "rotate")
               .attr("from", `0 0 0`)
               .attr("to", `360 0 0`)
               .attr("dur", `${isSanctuary ? 60 + i*10 : (15 + i*2 - (reactionFactor*10) - (chaos*8) - (tension*10))}s`) 
               .attr("repeatCount", "indefinite");
        }
    }

    // Particle System (Thoughts/Sparks)
    // Disabled in Sanctuary Mode for calmness
    const particleCount = isSanctuary ? 0 : (isRecovering ? 5 : (20 + Math.floor(cognitiveDensity * 80) + Math.floor(reactionFactor * 50) + Math.floor(chaos * 100) + Math.floor(tension * 200)));
    
    if (particleCount > 0) {
        for(let i=0; i<particleCount; i++) {
             const scatter = 0.8 + (reactionFactor * 0.5) + (chaos * 0.8) + (tension * 0.8);
             
             g.append("circle")
              .attr("r", Math.random() * (isRecovering ? 3 : 2))
              .attr("fill", baseColor)
              .attr("opacity", 0)
              .transition()
              .delay(Math.random() * 2000)
              .duration(pulseSpeed)
              .on("start", function repeat() {
                  d3.select(this)
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("opacity", isRecovering ? 0.4 : 1)
                    .transition()
                    .duration(1000 + Math.random() * 1000)
                    .attr("cx", (Math.random() - 0.5) * width * scatter)
                    .attr("cy", (Math.random() - 0.5) * height * scatter)
                    .attr("opacity", 0)
                    .on("end", repeat);
              });
        }
    }

  }, [mode, isActive, emotion, cognitiveDensity, isRecovering, reactionFactor, stability, tension, isLinked, isSanctuary]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full absolute inset-0" style={{ filter: 'blur(0.5px) drop-shadow(0 0 15px rgba(255,255,255,0.1))' }}></svg>
      
      {/* Overlay Text */}
      <div className="absolute top-24 left-6 text-xs font-display tracking-widest opacity-40 uppercase pointer-events-none transition-opacity text-gray-400 mix-blend-screen">
        <div className="flex flex-col gap-1 border-l-2 border-white/20 pl-3">
            <span>SYS.MODE: {mode}</span>
            <span>DENSITY: {(cognitiveDensity * 100).toFixed(1)}%</span>
            <span>STRUCTURE: {cognitiveDensity > 0.4 ? 'CRYSTALLINE' : 'FLUID'}</span>
            <span>ACOUSTIC_FLUX: {(audioLevel).toFixed(0)}</span>
            <span>SSI: {(stability * 100).toFixed(0)}%</span>
            {tension > 0.3 && <span className="text-red-500 font-bold animate-pulse">DYNAMICS: HIGH_TENSION</span>}
            {isRecovering && <span className="text-cyan-400 animate-pulse">STATUS: KAIROS PAUSE (RECOVERING)</span>}
            {stability < 0.3 && <span className="text-red-500 animate-pulse font-bold">STATUS: CRITICAL DIVERGENCE</span>}
            {isLinked && <span className="text-cyan-400 font-bold animate-fade-in">RESONANCE: LINKED (3.12Hz)</span>}
        </div>
      </div>
    </div>
  );
};

export default SentientCore;
