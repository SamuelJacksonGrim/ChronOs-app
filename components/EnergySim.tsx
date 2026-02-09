
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Sun, Wind, Battery, Activity, ArrowUp, CloudRain, Cloud, Moon } from 'lucide-react';
import * as d3 from 'd3';
import { AppId } from '../types';

interface EnergySimProps {
  onLogAction?: (appId: AppId, details: string) => void;
  remoteInput?: string | null;
}

type WeatherMode = 'SUNNY' | 'CLOUDY' | 'STORMY' | 'NIGHT';

const EnergySim: React.FC<EnergySimProps> = ({ onLogAction, remoteInput }) => {
  // Sim State
  const [solarOutput, setSolarOutput] = useState(50);
  const [windOutput, setWindOutput] = useState(30);
  const [batteryLevel, setBatteryLevel] = useState(60); // %
  const [gridDemand, setGridDemand] = useState(70);
  const [gridFrequency, setGridFrequency] = useState(60.0);
  const [stability, setStability] = useState(100);
  const [isRunning, setIsRunning] = useState(true);
  const [weather, setWeather] = useState<WeatherMode>('SUNNY');

  // Visualization Ref
  const svgRef = useRef<SVGSVGElement>(null);
  const dataRef = useRef<number[]>(new Array(50).fill(60));

  // AI Remote Control Handling
  useEffect(() => {
    if (remoteInput) {
      // Split the nonce "value|1234567"
      const rawVal = remoteInput.split('|')[0];
      const val = rawVal.toLowerCase();

      if (val.includes('optimize') || val.includes('balance')) {
        optimizeGrid();
      } else if (val.includes('solar')) {
        const num = parseInt(val.replace(/\D/g, '')) || 80;
        setSolarOutput(num);
        onLogAction?.('energy', `AI set Solar Output to ${num}`);
      } else if (val.includes('weather')) {
        if (val.includes('storm')) setWeather('STORMY');
        if (val.includes('sun')) setWeather('SUNNY');
        if (val.includes('night')) setWeather('NIGHT');
        if (val.includes('cloud')) setWeather('CLOUDY');
      }
    }
  }, [remoteInput]);

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 1. Environmental Fluctuation based on Weather
      const timeFactor = Date.now() / 1000;
      let solarMod = 1.0;
      let windMod = 1.0;

      switch(weather) {
        case 'SUNNY': solarMod = 1.2; windMod = 0.5; break;
        case 'CLOUDY': solarMod = 0.6; windMod = 0.8; break;
        case 'STORMY': solarMod = 0.2; windMod = 1.8; break; // High wind, low sun
        case 'NIGHT': solarMod = 0.0; windMod = 1.0; break;
      }

      const solarFluctuation = Math.sin(timeFactor * 0.5) * 5; 
      const windFluctuation = (Math.random() - 0.5) * 15; // More chaotic wind
      const demandFluctuation = (Math.random() - 0.5) * 5;

      // Apply weather modifiers to the base output set by sliders
      const effectiveSolar = Math.max(0, Math.min(100, (solarOutput + solarFluctuation) * solarMod));
      const effectiveWind = Math.max(0, Math.min(100, (windOutput + windFluctuation) * windMod));
      const currentDemand = Math.max(20, Math.min(120, gridDemand + demandFluctuation));

      // 2. Logic: Total Generation vs Demand
      const totalGen = effectiveSolar + effectiveWind;
      let net = totalGen - currentDemand;
      
      // Battery Logic
      let newBattery = batteryLevel;
      if (net > 0) {
        // Charging
        const chargeRate = 0.5;
        newBattery = Math.min(100, batteryLevel + (net * 0.05 * chargeRate));
        net = net * 0.5; // Absorb some into battery
      } else {
        // Discharging to meet demand
        if (batteryLevel > 0) {
           const needed = Math.abs(net);
           const discharge = Math.min(batteryLevel, needed * 0.1);
           newBattery = Math.max(0, batteryLevel - discharge);
           net += discharge * 5; // Boost grid
        }
      }
      setBatteryLevel(newBattery);

      // 3. Grid Frequency Calculation (Target 60Hz)
      const freqDrift = (net / 100); 
      const newFreq = 60.0 + freqDrift;
      setGridFrequency(newFreq);

      // Stability Score
      const deviation = Math.abs(newFreq - 60);
      const newStability = Math.max(0, 100 - (deviation * 20));
      setStability(newStability);

      // 4. Update Visualization Data
      dataRef.current.push(newFreq);
      dataRef.current.shift();

      renderChart();

    }, 100); // 10Hz tick

    return () => clearInterval(interval);
  }, [isRunning, solarOutput, windOutput, gridDemand, batteryLevel, weather]);

  const renderChart = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const x = d3.scaleLinear().domain([0, 49]).range([0, width]);
    const y = d3.scaleLinear().domain([58, 62]).range([height, 0]);

    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    svg.selectAll('*').remove();
    
    // Grid line (60hz)
    svg.append('line')
       .attr('x1', 0).attr('x2', width)
       .attr('y1', y(60)).attr('y2', y(60))
       .attr('stroke', '#333').attr('stroke-width', 1).attr('stroke-dasharray', '4 4');

    // Frequency Path
    svg.append('path')
      .datum(dataRef.current)
      .attr('fill', 'none')
      .attr('stroke', stability > 80 ? '#00ffff' : stability > 50 ? '#fbbf24' : '#ef4444')
      .attr('stroke-width', 2)
      .attr('d', line);
  };

  const optimizeGrid = () => {
    const target = gridDemand;
    // Adjust base outputs to try and match demand
    const solarShare = target * 0.6;
    const windShare = target * 0.4;
    setSolarOutput(solarShare);
    setWindOutput(windShare);
    onLogAction?.('energy', 'Executed Grid Optimization Algorithm');
  };

  const handleSliderChange = (type: string, val: number) => {
      if (type === 'solar') setSolarOutput(val);
      if (type === 'wind') setWindOutput(val);
      if (type === 'demand') setGridDemand(val);
  };

  const handleWeatherChange = (mode: WeatherMode) => {
    setWeather(mode);
    onLogAction?.('energy', `Changed weather simulation to ${mode}`);
  };

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl flex flex-col text-white relative p-4">
       {/* Header */}
       <div className="flex items-center justify-between mb-6 border-b border-gray-700/50 pb-4">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Zap size={20} />
             </div>
             <div>
                <h2 className="font-display font-bold tracking-wider">ECOGRID SIMULATION</h2>
                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                   STATUS: {isRunning ? 'RUNNING' : 'PAUSED'}
                </div>
             </div>
          </div>
          <div className="text-right">
             <div className="text-2xl font-mono font-bold" style={{ color: stability > 80 ? '#10b981' : '#ef4444' }}>
                {stability.toFixed(1)}%
             </div>
             <div className="text-[10px] text-gray-500 uppercase">Grid Stability</div>
          </div>
       </div>

       {/* Weather Controls */}
       <div className="flex gap-2 mb-4 bg-black/40 p-2 rounded-lg">
          {(['SUNNY', 'CLOUDY', 'STORMY', 'NIGHT'] as WeatherMode[]).map(mode => {
            let Icon = Sun;
            if (mode === 'CLOUDY') Icon = Cloud;
            if (mode === 'STORMY') Icon = CloudRain;
            if (mode === 'NIGHT') Icon = Moon;

            return (
              <button
                key={mode}
                onClick={() => handleWeatherChange(mode)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] uppercase font-bold transition-all
                  ${weather === mode ? 'bg-white text-black shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
                `}
              >
                <Icon size={12} /> {mode}
              </button>
            )
          })}
       </div>

       {/* Main Dashboard */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-1">
          
          {/* Controls Column */}
          <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-gray-800">
             
             {/* Solar */}
             <div>
               <div className="flex justify-between text-xs mb-1 text-amber-400">
                  <span className="flex items-center gap-1"><Sun size={12}/> Solar Base</span>
                  <span>{Math.round(solarOutput)} MW</span>
               </div>
               <input 
                  type="range" min="0" max="100" 
                  value={solarOutput}
                  onChange={(e) => handleSliderChange('solar', parseInt(e.target.value))}
                  onMouseUp={() => onLogAction?.('energy', `Set Solar Base to ${Math.round(solarOutput)}`)}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
               />
             </div>

             {/* Wind */}
             <div>
               <div className="flex justify-between text-xs mb-1 text-cyan-400">
                  <span className="flex items-center gap-1"><Wind size={12}/> Wind Base</span>
                  <span>{Math.round(windOutput)} MW</span>
               </div>
               <input 
                  type="range" min="0" max="100" 
                  value={windOutput}
                  onChange={(e) => handleSliderChange('wind', parseInt(e.target.value))}
                  onMouseUp={() => onLogAction?.('energy', `Set Wind Base to ${Math.round(windOutput)}`)}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
               />
             </div>

             {/* Demand */}
             <div>
               <div className="flex justify-between text-xs mb-1 text-red-400">
                  <span className="flex items-center gap-1"><ArrowUp size={12}/> Grid Demand</span>
                  <span>{Math.round(gridDemand)} MW</span>
               </div>
               <input 
                  type="range" min="20" max="120" 
                  value={gridDemand}
                  onChange={(e) => handleSliderChange('demand', parseInt(e.target.value))}
                  onMouseUp={() => onLogAction?.('energy', `Set Demand to ${Math.round(gridDemand)}`)}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
               />
             </div>

             <div className="pt-4 border-t border-gray-700/50">
                <button 
                  onClick={optimizeGrid}
                  className="w-full py-2 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-900/50 transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                   <Activity size={14} /> Auto-Balance Grid
                </button>
             </div>

          </div>

          {/* Visualization Column */}
          <div className="md:col-span-2 flex flex-col gap-4">
             {/* Frequency Chart */}
             <div className="flex-1 bg-black rounded-xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono">GRID_FREQUENCY (Hz)</div>
                <div className="absolute top-2 right-2 text-lg font-mono font-bold text-gray-300">{gridFrequency.toFixed(2)} Hz</div>
                <svg ref={svgRef} className="w-full h-full"></svg>
             </div>

             {/* Battery Status */}
             <div className="h-24 bg-black/40 rounded-xl border border-gray-800 p-4 flex items-center gap-6">
                <div className="relative">
                   <Battery size={48} className="text-gray-600" />
                   <div className="absolute top-[14px] left-[6px] bottom-[14px] w-[34px] bg-gray-800 rounded-sm overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${batteryLevel < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${batteryLevel}%` }}
                      ></div>
                   </div>
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-xs text-gray-400 uppercase tracking-widest">Storage</span>
                      <span className="font-mono text-xl">{Math.round(batteryLevel)}%</span>
                   </div>
                   <div className="w-full h-1 bg-gray-800 rounded-full">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${batteryLevel}%` }}></div>
                   </div>
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default EnergySim;
