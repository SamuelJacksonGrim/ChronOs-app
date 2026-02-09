import React, { useRef, useCallback } from 'react';

export const useKeystrokeDynamics = (onTensionUpdate: (score: number) => void) => {
  const history = useRef<{t: number, type: 'down'|'up', key: string}[]>([]);
  const dwells = useRef<{t: number, dur: number}[]>([]);
  const pending = useRef<Record<string, number>>({});
  const lastUpdate = useRef<number>(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    history.current.push({ t: now, type: 'down', key: e.key });
    pending.current[e.code] = now;
    analyze(now);
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    history.current.push({ t: now, type: 'up', key: e.key });
    
    if (pending.current[e.code]) {
        const dur = now - pending.current[e.code];
        dwells.current.push({ t: now, dur });
        delete pending.current[e.code];
    }
    analyze(now);
  }, []);

  const analyze = (now: number) => {
    // Throttle analysis to 2Hz to prevent render thrashing
    if (now - lastUpdate.current < 500) return;
    lastUpdate.current = now;

    const windowMs = 5000;
    const start = now - windowMs;

    // Prune old data
    history.current = history.current.filter(e => e.t > start);
    dwells.current = dwells.current.filter(d => d.t > start);

    if (history.current.length < 5) {
        onTensionUpdate(0);
        return;
    }

    // 1. Erasure (Frustration)
    const downs = history.current.filter(e => e.type === 'down');
    const backspaces = downs.filter(e => e.key === 'Backspace' || e.key === 'Delete').length;
    const erasureRatio = downs.length ? backspaces / downs.length : 0;
    // >20% erasure is high frustration
    const erasureScore = Math.min(1, erasureRatio * 5); 

    // 2. Jitter (Flow vs Anxiety)
    let intervals: number[] = [];
    for (let i = 1; i < downs.length; i++) {
        intervals.push(downs[i].t - downs[i-1].t);
    }
    let jitterScore = 0;
    if (intervals.length > 1) {
        const mean = intervals.reduce((a,b)=>a+b, 0) / intervals.length;
        const variance = intervals.reduce((a,b)=>a+Math.pow(b-mean,2), 0) / intervals.length;
        const sd = Math.sqrt(variance);
        // SD > 120ms implies erratic typing (Anxiety/Urgency)
        // SD < 40ms implies Flow
        jitterScore = Math.min(1, Math.max(0, (sd - 40) / 80));
    }

    // 3. Dwell (Pressure vs Hesitation)
    let dwellScore = 0;
    if (dwells.current.length > 0) {
        const avgDwell = dwells.current.reduce((a,b)=>a+b.dur, 0) / dwells.current.length;
        // < 50ms (Aggressive/Fast) -> High Tension contribution
        // > 120ms (Hesitation/Pondering) -> Moderate Tension
        if (avgDwell < 50) dwellScore = 0.8;
        else if (avgDwell > 120) dwellScore = 0.4;
        else dwellScore = 0.1; // Normal range
    }

    // Weighted Composite Score
    // Erasure is the strongest signal of friction.
    const tension = (erasureScore * 0.5) + (jitterScore * 0.3) + (dwellScore * 0.2);
    onTensionUpdate(tension);
  };

  return { handleKeyDown, handleKeyUp };
};