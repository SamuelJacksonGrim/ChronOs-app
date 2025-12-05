
import React, { useEffect, useRef } from 'react';
import { AIEvent, Emotion } from '../types';

interface SystemOverlayProps {
  activeApp: string | null;
  emotion: Emotion;
}

const SystemOverlay: React.FC<SystemOverlayProps> = ({ activeApp, emotion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use Ref for mutable event queue to avoid React render cycle overhead in animation loop
  const eventsRef = useRef<any[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    const handleAIEvent = (e: Event) => {
       const detail = (e as CustomEvent).detail as AIEvent;
       // Directly push to ref
       eventsRef.current.push({ ...detail, timestamp: Date.now() });
    };
    window.addEventListener('ai-event', handleAIEvent);
    return () => window.removeEventListener('ai-event', handleAIEvent);
  }, []);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      
      // Filter expired events in the ref directly
      eventsRef.current = eventsRef.current.filter((e: any) => now - e.timestamp < (e.duration || 1000));
      
      const activeEvents = eventsRef.current;

      // Draw Lines / Focus
      activeEvents.forEach((e: any) => {
         const progress = (now - e.timestamp) / (e.duration || 1000);
         const alpha = 1 - progress;

         // Get Color
         let color = '255, 255, 255';
         if (e.type === 'EXECUTE') color = '0, 255, 255'; // Cyan
         if (e.type === 'THINK') color = '168, 85, 247'; // Purple
         
         // If we have a target ID (rudimentary position finding)
         let tx = canvas.width / 2;
         let ty = canvas.height / 2;

         if (e.targetId === 'calculator') { tx = 200; ty = 400; }
         if (e.targetId === 'energy') { tx = canvas.width - 200; ty = 400; }
         if (e.targetId === 'files') { tx = 200; ty = 200; }

         // Draw Neural Line
         ctx.beginPath();
         ctx.moveTo(canvas.width / 2, canvas.height / 2); // Center Core
         ctx.lineTo(tx, ty);
         ctx.strokeStyle = `rgba(${color}, ${alpha * 0.5})`;
         ctx.lineWidth = 2;
         ctx.setLineDash([5, 5]);
         ctx.stroke();

         // Draw Traveling Packet
         const px = (canvas.width / 2) + (tx - canvas.width / 2) * progress;
         const py = (canvas.height / 2) + (ty - canvas.height / 2) * progress;
         
         ctx.beginPath();
         ctx.arc(px, py, 4, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(${color}, 1)`;
         ctx.shadowBlur = 10;
         ctx.shadowColor = `rgba(${color}, 1)`;
         ctx.fill();
         ctx.shadowBlur = 0;

         // Draw Target Reticle
         if (e.type === 'EXECUTE' || e.type === 'FOCUS') {
             ctx.strokeStyle = `rgba(${color}, ${alpha})`;
             ctx.lineWidth = 1;
             ctx.setLineDash([]);
             ctx.strokeRect(tx - 20, ty - 20, 40, 40);
             
             // Crosshair
             ctx.beginPath();
             ctx.moveTo(tx - 25, ty); ctx.lineTo(tx + 25, ty);
             ctx.moveTo(tx, ty - 25); ctx.lineTo(tx, ty + 25);
             ctx.stroke();
         }
      });

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[9999]" />
  );
};

export default SystemOverlay;
