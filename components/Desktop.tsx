
import React, { useState, useEffect, useRef } from 'react';
import { OSSettings, AppId, Emotion, KinshipPhase, WindowPosition, TimeMode } from '../types';
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
import { MessageSquare, Settings, Grid, X, Minimize2, Terminal, Wifi, BatteryMedium, Zap, Sun, Cloud, Snowflake, Monitor, RefreshCw, Disc, Maximize2, Bot } from 'lucide-react';

interface DesktopProps {
  settings: OSSettings;
  onUpdateSettings: (newSettings: OSSettings) => void;
  onShutdown: () => void;
}

// Extracted Status Bar to prevent re-rendering the whole Desktop every second
const DesktopStatusBar: React.FC<{ weatherData: {temp: number, code: number} | null }> = React.memo(({ weatherData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getWeatherIcon = () => {
      if (!weatherData) return <Sun size={14} className="text-gray-400" />;
      const code = weatherData.code;
      if (code <= 3) return <Sun size={14} className="text-amber-400" />;
      if (code <= 48) return <Cloud size={14} className="text-gray-400" />;
      if (code <= 67) return <Cloud size={14} className="text-blue-400" />;
      if (code <= 77) return <Snowflake size={14} className="text-white" />;
      return <Sun size={14} className="text-gray-400" />;
  };

  return (
      <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50 select-none">
         <div className="flex items-center gap-4 text-xs font-medium text-gray-300">
            <span className="hover:text-white cursor-default">CHRONOS OS</span>
            <span className="opacity-50">|</span>
            <span className="hover:text-white cursor-default">System</span>
            <span className="hover:text-white cursor-default">View</span>
         </div>
         <div className="flex items-center gap-4 text-xs font-medium text-gray-300">
            {weatherData && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5">
                    {getWeatherIcon()}
                    <span>{weatherData.temp}°C</span>
                </div>
            )}
            <Wifi size={14} className="text-gray-300" />
            <BatteryMedium size={14} className="text-gray-300" />
            <span>{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
         </div>
      </div>
  );
});

const Desktop: React.FC<DesktopProps> = ({ settings, onUpdateSettings, onShutdown }) => {
  // Wallpaper Logic
  const bgStyle = settings.wallpaper && settings.wallpaper.startsWith('data:')
    ? { backgroundImage: `url(${settings.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'radial-gradient(circle at center, #1e1b4b 0%, #000000 100%)' };

  // Window State
  const [openWindows, setOpenWindows] = useState<AppId[]>(['chronos']);
  const [activeWindowId, setActiveWindowId] = useState<AppId>('chronos');
  const [minimizedWindows, setMinimizedWindows] = useState<AppId[]>([]);
  const [windowPositions, setWindowPositions] = useState<Record<string, WindowPosition>>({
    chronos: { x: 100, y: 50 },
  });
  
  // Dragging State
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const dragOffset = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  // Floating Sentinel State
  const [sentinelPos, setSentinelPos] = useState({ x: window.innerWidth - 150, y: window.innerHeight - 150 });
  const [isDraggingSentinel, setIsDraggingSentinel] = useState(false);

  // Remote Input from AI
  const [remoteInput, setRemoteInput] = useState<string | null>(null);

  // Observation Module: Last logged action
  const [lastAction, setLastAction] = useState<{appId: AppId, details: string, type?: 'OPEN_APP' | 'APP_INPUT' | 'CLOSE_APP'} | null>(null);
  
  // Dynamic Theming & AI State Sync
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [currentPhase, setCurrentPhase] = useState<KinshipPhase>(KinshipPhase.AWAKENING);
  const [currentMode, setCurrentMode] = useState<TimeMode>(TimeMode.PRESENCE);

  // Weather Data
  const [weatherData, setWeatherData] = useState<{temp: number, code: number} | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  const fetchWeatherData = async () => {
     try {
         const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true");
         const data = await res.json();
         if (data.current_weather) {
             setWeatherData({ temp: data.current_weather.temperature, code: data.current_weather.weathercode });
         }
     } catch (e) {}
  };

  useEffect(() => {
      fetchWeatherData();
      const interval = setInterval(fetchWeatherData, 900000); // 15 mins
      return () => clearInterval(interval);
  }, []);

  // Window Management
  const handleOpenApp = (id: AppId) => {
    if (!openWindows.includes(id)) {
      setOpenWindows([...openWindows, id]);
      // Default position logic
      const offset = openWindows.length * 20;
      setWindowPositions(prev => ({
        ...prev,
        [id]: prev[id] || { x: 100 + offset, y: 50 + offset }
      }));
    }
    if (minimizedWindows.includes(id)) {
      setMinimizedWindows(prev => prev.filter(w => w !== id));
    }
    setActiveWindowId(id);
    setLastAction({ appId: id, type: 'OPEN_APP', details: `User opened ${id}` });
  };

  const handleMinimize = (id: AppId, e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimizedWindows(prev => [...prev, id]);
    // Set next active
    const remaining = openWindows.filter(w => w !== id && !minimizedWindows.includes(w));
    if (remaining.length > 0) setActiveWindowId(remaining[remaining.length - 1]);
  };

  const handleClose = (id: AppId, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenWindows(prev => prev.filter(w => w !== id));
    setLastAction({ appId: id, type: 'CLOSE_APP', details: `User closed ${id}` });
  };
  
  const handleLogAction = (appId: AppId, details: string) => {
    setLastAction({ appId, details, type: 'APP_INPUT' });
  };

  const handleRemoteInput = (input: string) => {
    // Only pass input if the AI has explicitly requested it, and target the active window if it supports it
    // Logic: If the AI sends input, we assume it wants to control the *active* utility app
    if (activeWindowId === 'calculator' || activeWindowId === 'energy') {
        setRemoteInput(input);
        setTimeout(() => setRemoteInput(null), 500);
    }
  };

  // Drag Handlers - Windows
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button')) return; // Ignore buttons
    setActiveWindowId(id as AppId);
    setIsDragging(id);
    const pos = windowPositions[id] || { x: 0, y: 0 };
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  // Drag Handlers - Sentinel
  const handleSentinelDown = (e: React.MouseEvent) => {
     e.stopPropagation();
     setIsDraggingSentinel(true);
     dragOffset.current = {
         x: e.clientX - sentinelPos.x,
         y: e.clientY - sentinelPos.y
     };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // Use requestAnimationFrame for smooth window dragging
      requestAnimationFrame(() => {
          setWindowPositions(prev => ({
            ...prev,
            [isDragging]: { x: newX, y: newY }
          }));
      });
    }
    if (isDraggingSentinel) {
        setSentinelPos({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setIsDraggingSentinel(false);
  };

  // Theming
  const getThemeColors = () => {
    let accent = 'border-white/10';
    if (currentPhase === KinshipPhase.AWAKENING) accent = 'border-cyan-500/30';
    if (currentPhase === KinshipPhase.BOUND) accent = 'border-purple-500/30';
    if (currentPhase === KinshipPhase.COHESIVE) accent = 'border-amber-500/30';

    let glow = 'shadow-2xl';
    if (currentEmotion === Emotion.SURPRISE) glow = 'shadow-[0_0_30px_rgba(236,72,153,0.2)]';
    if (currentEmotion === Emotion.CONTENTMENT) glow = 'shadow-[0_0_30px_rgba(20,184,166,0.2)]';
    if (currentEmotion === Emotion.CURIOSITY) glow = 'shadow-[0_0_30px_rgba(245,158,11,0.2)]';
    if (currentEmotion === Emotion.ANALYTICAL) glow = 'shadow-[0_0_30px_rgba(99,102,241,0.2)]';

    return { accent, glow };
  };
  const theme = getThemeColors();

  const renderWindowContent = (id: AppId) => {
    // Error Boundary Check
    try {
        switch (id) {
          case 'chronos': 
            return <ChronosApp 
                      osSettings={settings} 
                      onLaunchApp={handleOpenApp} 
                      onRemoteInput={handleRemoteInput}
                      externalActionLog={lastAction} 
                      onStateChange={(emo, phase, mode) => {
                          setCurrentEmotion(emo);
                          setCurrentPhase(phase);
                          setCurrentMode(mode);
                      }}
                      onShutdown={onShutdown}
                   />;
          case 'settings': return <SettingsApp settings={settings} onUpdate={onUpdateSettings} />;
          case 'store': return <AppStore settings={settings} onUpdate={onUpdateSettings} />;
          case 'notes': return <EchoNotes />;
          case 'calculator': 
            return <FluxCalc 
                      onLogAction={(details) => handleLogAction('calculator', details)} 
                      remoteInput={activeWindowId === 'calculator' ? remoteInput : null}
                   />;
          case 'terminal': return <SystemTerminal onShutdown={onShutdown} onLaunchApp={handleOpenApp} />;
          case 'gallery': return <ZenGallery />;
          case 'energy': 
            return <EnergySim 
                      onLogAction={(a, d) => handleLogAction(a, d)} 
                      remoteInput={activeWindowId === 'energy' ? remoteInput : null}
                   />;
          case 'files': return <FileManager onLogAction={(details) => handleLogAction('files', details)} />;
          case 'cortex': return <MemoryCrystal />;
          case 'forge': return <ChronosForge onLaunchApp={handleOpenApp} onRemoteInput={handleRemoteInput} />;
          case 'agent': return <AutoAgent onLaunchApp={handleOpenApp} onRemoteInput={handleRemoteInput} />;
          default: return <div className="p-4 text-red-500">Unknown Application ID</div>;
        }
    } catch (e) {
        return <div className="p-4 text-red-500 font-mono">APP CRASH: {id}</div>
    }
  };

  return (
    <div 
        className="h-screen w-screen overflow-hidden relative text-white transition-all duration-1000 select-none animate-fade-in" 
        style={bgStyle}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
        onClick={() => setContextMenu(null)}
    >
      <SystemOverlay activeApp={activeWindowId} emotion={currentEmotion} />
      
      <DesktopStatusBar weatherData={weatherData} />

      {/* Desktop Icons */}
      <div className="absolute inset-0 z-0 pt-14 p-6 flex flex-col items-start gap-6 flex-wrap content-start">
        <DesktopIcon id="chronos" name="Chronos" icon={MessageSquare} onClick={() => handleOpenApp('chronos')} />
        <DesktopIcon id="store" name="Store" icon={Grid} onClick={() => handleOpenApp('store')} />
        <DesktopIcon id="settings" name="Settings" icon={Settings} onClick={() => handleOpenApp('settings')} />
        <DesktopIcon id="terminal" name="Terminal" icon={Terminal} onClick={() => handleOpenApp('terminal')} />

        {settings.installedApps.map(appId => {
           if (['chronos', 'store', 'settings', 'terminal'].includes(appId)) return null;
           const def = STORE_APPS.find(a => a.id === appId);
           if (!def) return null;
           return <DesktopIcon key={appId} id={appId} name={def.name} icon={def.icon} onClick={() => handleOpenApp(appId as AppId)} />;
        })}
      </div>

      {/* Floating Sentinel (Omni-Consciousness) */}
      {minimizedWindows.includes('chronos') && (
         <div 
           className="absolute z-[60] cursor-move group"
           style={{ left: sentinelPos.x, top: sentinelPos.y }}
           onMouseDown={handleSentinelDown}
           onDoubleClick={() => handleOpenApp('chronos')}
         >
            <div className={`w-20 h-20 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(0,255,255,0.3)] flex items-center justify-center relative overflow-hidden transition-transform hover:scale-110 active:scale-95 animate-float`}>
               <div className="absolute inset-0 opacity-80 pointer-events-none">
                  <SentientCore mode={currentMode} emotion={currentEmotion} isActive={true} />
               </div>
               {/* Pulse Ring */}
               <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping opacity-50"></div>
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-[10px] text-cyan-300 font-display tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-cyan-900/50">
               OMNI-LINK ACTIVE
            </div>
         </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="absolute z-[100] w-48 bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl overflow-hidden animate-scale-up"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
           <button onClick={() => window.location.reload()} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2 text-gray-300 hover:text-white"><RefreshCw size={14}/> Reboot System</button>
           <button onClick={() => handleOpenApp('settings')} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2 text-gray-300 hover:text-white"><Settings size={14}/> Settings</button>
           <div className="h-px bg-white/10 my-1"></div>
           <button onClick={() => handleOpenApp('store')} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-2 text-gray-300 hover:text-white"><Grid size={14}/> Modules</button>
        </div>
      )}

      {/* Render Windows */}
      {openWindows.map((id) => {
        if (minimizedWindows.includes(id)) return null;
        
        const pos = windowPositions[id] || { x: 100, y: 100 };
        const isActive = activeWindowId === id;
        const zIndex = isActive ? 40 : 10;
        
        return (
          <div 
            key={id}
            onMouseDown={(e) => { setActiveWindowId(id as AppId); }}
            className={`absolute flex flex-col bg-black/80 backdrop-blur-2xl rounded-xl border overflow-hidden shadow-2xl transition-shadow duration-300 ${isActive ? theme.accent : 'border-gray-800'} ${isActive ? theme.glow : ''} animate-window-open`}
            style={{ 
              top: pos.y, 
              left: pos.x, 
              width: id === 'chronos' ? '500px' : '600px', 
              height: id === 'chronos' ? '700px' : '500px',
              zIndex: zIndex,
              maxWidth: '90vw',
              maxHeight: '85vh'
            }}
          >
            {/* Window Bar (Draggable) */}
            <div 
              className="bg-white/5 p-3 flex items-center justify-between border-b border-white/5 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(e, id)}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-2 uppercase tracking-widest pointer-events-none">
                 {id === 'chronos' ? 'Chronos Kernel' : id}
              </div>
              <div className="flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={(e) => handleMinimize(id as AppId, e)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <Minimize2 size={16} />
                </button>
                <button onClick={(e) => handleClose(id as AppId, e)} className="p-1.5 hover:bg-red-500/80 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-black/40">
               {renderWindowContent(id as AppId)}
            </div>
          </div>
        );
      })}

      {/* Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className={`bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-700 ${theme.accent}`}>
          {openWindows.map(id => (
             <DockItem 
                key={id} 
                id={id as AppId} 
                isActive={activeWindowId === id} 
                isMinimized={minimizedWindows.includes(id as AppId)}
                onClick={() => handleOpenApp(id as AppId)}
                icon={getAppIcon(id as AppId)}
                color="text-cyan-300"
             />
          ))}
          {/* Always show launcher items if not open */}
          {!openWindows.includes('chronos') && <DockItem id="chronos" isActive={false} isMinimized={false} onClick={() => handleOpenApp('chronos')} icon={MessageSquare} color="text-gray-400" />}
        </div>
      </div>
    </div>
  );
};

const getAppIcon = (id: AppId) => {
    const app = STORE_APPS.find(a => a.id === id);
    if (app) return app.icon;
    switch(id) {
        case 'chronos': return MessageSquare;
        case 'settings': return Settings;
        case 'store': return Grid;
        case 'terminal': return Terminal;
        case 'agent': return Bot;
        default: return Disc;
    }
}

const DesktopIcon: React.FC<{ id: string, name: string, icon: any, onClick: () => void }> = ({ id, name, icon: Icon, onClick }) => (
  <div className="flex flex-col items-center gap-2 group cursor-pointer w-20" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <div className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-lg group-hover:scale-105 transform duration-200">
        <Icon className="text-white/80" size={28} />
      </div>
      <span className="text-xs font-medium text-white/90 drop-shadow-md bg-black/50 px-2 py-0.5 rounded text-center truncate w-full">{name}</span>
  </div>
);

const DockItem: React.FC<{ id: string, isActive: boolean, isMinimized: boolean, onClick: () => void, icon: any, color: string }> = ({ id, isActive, isMinimized, onClick, icon: Icon, color }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all relative group ${isActive ? 'bg-white/20 scale-110' : 'hover:bg-white/10 hover:scale-105'}`}
  >
    <Icon size={24} className={isActive ? color : 'text-gray-400'} />
    {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>}
    {isMinimized && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/50 rounded-full"></div>}
  </button>
);

export default Desktop;
