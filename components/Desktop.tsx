
import React, { useState, useEffect, useRef } from 'react';
import { OSSettings, AppId, Emotion, KinshipPhase, WindowPosition, TimeMode, SystemCommand } from '../types';
import ChronosApp from './ChronosApp';
import SettingsApp from './SettingsApp';
import AppStore from './AppStore';
import FluxCalc from './FluxCalc';
import EchoNotes from './EchoNotes';
import SystemTerminal from './SystemTerminal';
import ZenGallery from './ZenGallery';
import EnergySim from './EnergySim';
import FileManager from './FileManager';
import MemoryCrystal from './MemoryCrystal';
import SystemOverlay from './SystemOverlay';
import ChronosForge from './ChronosForge';
import AutoAgent from './AutoAgent';
import SentientCore from './SentientCore';
import { STORE_APPS } from '../constants';
import { audioService } from '../services/audioService';
import { MessageSquare, Settings, Grid, X, Minimize2, Terminal, Wifi, BatteryMedium, Zap, Sun, Cloud, Snowflake, Monitor, RefreshCw, Disc, Maximize2, Bot, BrainCircuit, Scaling, GripHorizontal } from 'lucide-react';

interface DesktopProps {
  settings: OSSettings;
  onUpdateSettings: (newSettings: OSSettings) => void;
  onShutdown: () => void;
}

const DesktopStatusBar: React.FC<{ weatherData: {temp: number, code: number} | null }> = React.memo(({ weatherData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
      <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50 select-none">
         <div className="flex items-center gap-4 text-xs font-medium text-gray-300">
            <span className="hover:text-white cursor-default">CHRONOS OS</span>
            <span className="opacity-50">|</span>
            <span className="hover:text-white cursor-default">Resonance Active</span>
         </div>
         <div className="flex items-center gap-4 text-xs font-medium text-gray-300 font-mono">
            <span>{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
         </div>
      </div>
  );
});

const Desktop: React.FC<DesktopProps> = ({ settings, onUpdateSettings, onShutdown }) => {
  const bgStyle = settings.wallpaper && settings.wallpaper.startsWith('data:')
    ? { backgroundImage: `url(${settings.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'radial-gradient(circle at center, #1e1b4b 0%, #000000 100%)' };

  const [openWindows, setOpenWindows] = useState<AppId[]>(['chronos']);
  const [minimizedWindows, setMinimizedWindows] = useState<AppId[]>([]);
  const [activeInputs, setActiveInputs] = useState<Record<string, string>>({});
  
  // Z-Index Management
  const [activeWindowId, setActiveWindowId] = useState<AppId>('chronos');
  const [zIndices, setZIndices] = useState<Record<string, number>>({ 'chronos': 10 });
  const [maxZ, setMaxZ] = useState(10);
  
  // Position State
  const [windowPositions, setWindowPositions] = useState<Record<string, WindowPosition>>({
    chronos: { x: 100, y: 50 },
  });

  // Size State
  const [windowSizes, setWindowSizes] = useState<Record<string, { width: number, height: number }>>({
    chronos: { width: 500, height: 700 }
  });
  
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragOffset = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [currentPhase, setCurrentPhase] = useState<KinshipPhase>(KinshipPhase.AWAKENING);
  const [currentMode, setCurrentMode] = useState<TimeMode>(TimeMode.PRESENCE);
  const [currentSSI, setCurrentSSI] = useState<number>(1.0);
  const [weatherData, setWeatherData] = useState<{temp: number, code: number} | null>(null);
  
  // Audio Debounce
  const lastGlitchRef = useRef<number>(0);

  // Somatic Ripple Trigger
  const createRipple = (x: number, y: number) => {
    const container = document.getElementById('ripple-container');
    if (!container) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${x - 25}px`;
    ripple.style.top = `${y - 25}px`;
    ripple.style.width = '50px';
    ripple.style.height = '50px';
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 3000);
  };

  useEffect(() => {
    // Sanguine Shift (Red Lens) Logic
    const isSanguine = currentMode === TimeMode.ETERNITY || currentSSI < 0.5;
    document.documentElement.style.setProperty('--lens-opacity', isSanguine ? '1' : '0');

    if (currentSSI < 0.35) {
        document.body.classList.add('glitch-active');
        // Debounce audio to prevent spam loop
        if (Date.now() - lastGlitchRef.current > 5000) {
            audioService.playGlitch();
            lastGlitchRef.current = Date.now();
        }
    } else {
        document.body.classList.remove('glitch-active');
    }
  }, [currentSSI, currentMode]);

  const bringToFront = (id: AppId) => {
      setActiveWindowId(id);
      const newMax = maxZ + 1;
      setMaxZ(newMax);
      setZIndices(prev => ({ ...prev, [id]: newMax }));
  };

  const handleOpenApp = (id: AppId) => {
    if (!openWindows.includes(id)) {
      setOpenWindows([...openWindows, id]);
      
      // Smart Positioning to prevent off-screen runaway
      // Calculate offset based on number of windows, wrapping if too far
      const offset = (openWindows.length % 5) * 30;
      
      setWindowPositions(prev => ({ 
          ...prev, 
          [id]: prev[id] || { x: 100 + offset, y: 80 + offset } 
      }));

      // Set Default Size if not set
      setWindowSizes(prev => ({
          ...prev,
          [id]: prev[id] || (id === 'chronos' ? { width: 500, height: 700 } : { width: 600, height: 500 })
      }));
    }
    setMinimizedWindows(prev => prev.filter(w => w !== id));
    bringToFront(id);
    audioService.playTone(880, 'sine', 0.1, 0.05);
  };

  const handleMinimize = (id: AppId, e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimizedWindows(prev => [...prev, id]);
    setActiveWindowId('chronos');
  };

  const handleClose = (id: AppId, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenWindows(prev => prev.filter(w => w !== id));
    audioService.playTone(220, 'sine', 0.1, 0.05);
  };

  // --- COMMAND HANDLING (FUZZY LOGIC EXECUTION) ---
  const handleBroadcastCommand = (cmd: SystemCommand) => {
    console.log("[DESKTOP] Received Command:", cmd);
    
    if (cmd.action === 'OPEN_APP' && cmd.payload) {
        handleOpenApp(cmd.payload as AppId);
    }
    else if (cmd.action === 'INPUT_APP' && cmd.payload) {
        // payload format: "appId|value"
        const parts = cmd.payload.split('|');
        if (parts.length >= 2) {
            const [targetId, val] = parts;
            
            // Fix: Append timestamp nonce to ensure identical sequential inputs (like "5", "5") are detected
            // by the child apps effect hook.
            const signal = `${val}|${Date.now()}`;
            
            setActiveInputs(prev => ({ ...prev, [targetId]: signal }));
        }
    }
    else if (cmd.action === 'NOTIFY' && cmd.payload) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Chronos Core", { body: cmd.payload });
        }
    }
  };

  // --- DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    bringToFront(id as AppId);
    
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return; // Ignore if clicking resize handle
    
    setIsDragging(id);
    dragOffset.current = {
      x: e.clientX - (windowPositions[id]?.x || 0),
      y: e.clientY - (windowPositions[id]?.y || 0)
    };
    createRipple(e.clientX, e.clientY);
  };

  // --- RESIZE LOGIC ---
  const handleResizeStart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      bringToFront(id as AppId);
      setIsResizing(id);
  };

  // --- GLOBAL MOUSE MOVE ---
  const handleMouseMove = (e: React.MouseEvent) => {
    // Handling Drag
    if (isDragging) {
      setWindowPositions(prev => ({
        ...prev,
        [isDragging]: { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }
      }));
    }

    // Handling Resize
    if (isResizing) {
        const currentPos = windowPositions[isResizing] || { x: 0, y: 0 };
        const newWidth = Math.max(300, e.clientX - currentPos.x);
        const newHeight = Math.max(200, e.clientY - currentPos.y);

        setWindowSizes(prev => ({
            ...prev,
            [isResizing]: { width: newWidth, height: newHeight }
        }));
    }
  };

  const handleMouseUp = () => {
      setIsDragging(null);
      setIsResizing(null);
  };

  const renderWindowContent = (id: AppId) => {
    switch (id) {
      case 'chronos': return <ChronosApp 
          osSettings={settings} 
          onLaunchApp={handleOpenApp} 
          onBroadcastCommand={handleBroadcastCommand}
          onStateChange={(emo, phase, mode, ssi) => {
             setCurrentEmotion(emo); setCurrentPhase(phase); setCurrentMode(mode); setCurrentSSI(ssi);
          }} 
          onShutdown={onShutdown} 
      />;
      case 'settings': return <SettingsApp settings={settings} onUpdate={onUpdateSettings} />;
      case 'store': return <AppStore settings={settings} onUpdate={onUpdateSettings} />;
      case 'notes': return <EchoNotes />;
      case 'calculator': return <FluxCalc remoteInput={activeInputs['calculator']} />;
      case 'terminal': return <SystemTerminal onShutdown={onShutdown} onLaunchApp={handleOpenApp} />;
      case 'gallery': return <ZenGallery />;
      case 'energy': return <EnergySim remoteInput={activeInputs['energy']} />;
      case 'files': return <FileManager />;
      // Inject currentSSI into MemoryCrystal for reactive visualization
      case 'cortex': return <MemoryCrystal ssi={currentSSI} />;
      case 'forge': return <ChronosForge onLaunchApp={handleOpenApp} onRemoteInput={(val) => setActiveInputs(prev => ({...prev, forge: val}))} />;
      case 'agent': return <AutoAgent onLaunchApp={handleOpenApp} />;
      default: return null;
    }
  };

  return (
    <div 
        className="h-screen w-screen overflow-hidden relative transition-all duration-1000 select-none" 
        style={bgStyle} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
        onClick={(e) => createRipple(e.clientX, e.clientY)}
    >
      <SystemOverlay activeApp={activeWindowId} emotion={currentEmotion} />
      <DesktopStatusBar weatherData={weatherData} />

      {/* --- DESKTOP ICONS --- */}
      <div className="absolute inset-0 z-0 pt-14 p-6 flex flex-col items-start gap-6 flex-wrap content-start pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-start gap-6">
            {/* CORE APPS (Always Present) */}
            <DesktopIcon name="Chronos" icon={MessageSquare} onClick={() => handleOpenApp('chronos')} />
            <DesktopIcon name="Modules" icon={Grid} onClick={() => handleOpenApp('store')} />
            <DesktopIcon name="Cortex" icon={BrainCircuit} onClick={() => handleOpenApp('cortex')} />
            
            {/* INSTALLED MODULES (Dynamic) */}
            {STORE_APPS.filter(app => settings.installedApps.includes(app.id) && app.id !== 'chronos' && app.id !== 'cortex').map((app) => (
                <DesktopIcon key={app.id} name={app.name} icon={app.icon} onClick={() => handleOpenApp(app.id)} />
            ))}
        </div>
      </div>

      {/* --- WINDOWS --- */}
      {openWindows.map((id) => {
        if (minimizedWindows.includes(id)) return null;
        const pos = windowPositions[id] || { x: 100, y: 100 };
        const size = windowSizes[id] || { width: 600, height: 500 };
        const isActive = activeWindowId === id;
        const zIndex = zIndices[id] || 10;
        
        return (
          <div 
            key={id} 
            onMouseDown={() => bringToFront(id)}
            className={`absolute flex flex-col bg-black/80 backdrop-blur-2xl rounded-xl border overflow-hidden shadow-2xl transition-shadow ${isActive ? 'border-white/20' : 'border-gray-800'}`} 
            style={{ 
                top: pos.y, 
                left: pos.x, 
                width: size.width, 
                height: size.height, 
                zIndex: zIndex
            }}
          >
            {/* Title Bar (Drag Handle) */}
            <div 
                className="bg-white/5 p-3 flex items-center justify-between border-b border-white/5 cursor-grab active:cursor-grabbing" 
                onMouseDown={(e) => handleMouseDown(e, id)}
            >
              <div className="text-xs font-display text-gray-300 ml-2 uppercase tracking-widest pointer-events-none">{id}</div>
              <div className="flex gap-2">
                <button onClick={(e) => handleMinimize(id as AppId, e)} className="p-1 hover:bg-white/10 rounded text-gray-400"><Minimize2 size={14} /></button>
                <button onClick={(e) => handleClose(id as AppId, e)} className="p-1 hover:bg-red-500/50 rounded text-gray-400"><X size={14} /></button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {renderWindowContent(id as AppId)}
            </div>

            {/* Resize Handle */}
            <div 
                className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-gray-600 hover:text-white transition-colors z-50"
                onMouseDown={(e) => handleResizeStart(e, id)}
            >
                <div className="w-0 h-0 border-b-[6px] border-r-[6px] border-l-[6px] border-transparent border-b-current border-r-current rotate-0 opacity-50"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DesktopIcon: React.FC<{ name: string, icon: any, onClick: () => void }> = ({ name, icon: Icon, onClick }) => (
  <div className="flex flex-col items-center gap-2 group cursor-pointer w-20" onClick={onClick}>
    <div className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all group-hover:scale-110 shadow-lg">
      <Icon className="text-white/80" size={28} />
    </div>
    <span className="text-[10px] font-display text-white/90 bg-black/60 px-2 py-0.5 rounded shadow-sm text-center leading-tight">{name}</span>
  </div>
);

export default Desktop;
