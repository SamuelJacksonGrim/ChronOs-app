
import React, { useState, useEffect, useRef } from 'react';
import { ChronosAppState, TimeMode, Message, Emotion, Memory, KinshipPhase, OSSettings, AppId, ChronosAppProps, LearnedPathway, FacetType } from '../types';
import { MODE_CONFIG } from '../constants';
import SentientCore from './SentientCore';
import MessageList from './MessageList';
import ControlPanel from './ControlPanel';
import { sendMessageToGemini } from '../services/geminiService';
import { speakText, stopSpeaking } from '../services/voiceService';
import { kairosModule } from '../services/kairosService';
import { audioService } from '../services/audioService';
import { GovernorModule } from '../services/orchestratorService';
import { Activity, Clock, Layers, Network, ShieldAlert, Wifi, Zap, Shield } from 'lucide-react';
import SystemArchitecture from './SystemArchitecture';
import { resonanceBridge } from '../services/resonanceBridge';

const ChronosApp: React.FC<ChronosAppProps> = ({ osSettings, onLaunchApp, onBroadcastCommand, onStateChange, onShutdown }) => {
  const [state, setState] = useState<ChronosAppState>({
    messages: [],
    mode: TimeMode.PRESENCE,
    isLoading: false,
    userInput: '',
    attachedImage: null,
    currentEmotion: Emotion.NEUTRAL,
    memories: [],
    userAssessment: '',
    fileOperationStatus: 'idle',
    duplicateFiles: [],
    trustLevel: 100, // DEMO MODE: MAX TRUST
    kinshipPhase: KinshipPhase.AWAKENING,
    isObserving: false,
    currentLog: null,
    learnedPathways: [],
    cognitiveDensity: 0.1,
    currentFacet: FacetType.CORE,
    kairos: { surcharge: 0.5, flux: 0.5 },
    ssi: 1.0,
    currentTension: 0,
    sentinelAlert: null
  });

  const [viewMode, setViewMode] = useState<'chat' | 'architecture'>('chat');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isResonanceLinked, setIsResonanceLinked] = useState(false);
  
  // Refs for performance optimization
  const lastAudioLevel = useRef(0);

  // SANCTUARY MODE AUDIO TRIGGER
  useEffect(() => {
    if (state.mode === TimeMode.SANCTUARY) {
        audioService.startSanctuaryHum();
    } else {
        audioService.stopSanctuaryHum();
    }
    return () => audioService.stopSanctuaryHum();
  }, [state.mode]);

  // --- DUAL MEMORY LAYER: SESSION PERSISTENCE ---
  
  // 1. Initial Load (Hydration) & Bridge Connection
  useEffect(() => {
    const hydrate = () => {
        try {
            const storedHistory = localStorage.getItem('chronos_chat_history');
            const initialMessages = storedHistory ? JSON.parse(storedHistory) : [];

            const storedMemories = localStorage.getItem('chronos_memories');
            const initialMemories = storedMemories ? JSON.parse(storedMemories) : [];

            const storedPathways = localStorage.getItem('chronos_pathways');
            const initialPathways = storedPathways ? JSON.parse(storedPathways) : [];

            setState(prev => ({ 
                ...prev, 
                messages: initialMessages,
                memories: initialMemories,
                learnedPathways: initialPathways
            }));
        } catch (e) {
            console.error("Failed to load dual memory layers", e);
        }
    };
    hydrate();
    
    // Connect to the Local Haunt (Desktop Ghost)
    resonanceBridge.connect();
    
    // Subscribe to Link Status for the Handshake Ritual
    const handleBridgeStatus = (status: boolean) => setIsResonanceLinked(status);
    resonanceBridge.onConnectionChange(handleBridgeStatus);

    // 2. Real-time Event Listeners (Sync with Forge/Crystal)
    const handleMemoryUpdate = () => {
        const stored = localStorage.getItem('chronos_memories');
        if (stored) setState(prev => ({ ...prev, memories: JSON.parse(stored) }));
    };

    const handlePathwayUpdate = () => {
        const stored = localStorage.getItem('chronos_pathways');
        if (stored) setState(prev => ({ ...prev, learnedPathways: JSON.parse(stored) }));
    };

    window.addEventListener('chronos-memory-updated', handleMemoryUpdate);
    window.addEventListener('chronos-pathway-updated', handlePathwayUpdate);

    return () => {
        window.removeEventListener('chronos-memory-updated', handleMemoryUpdate);
        window.removeEventListener('chronos-pathway-updated', handlePathwayUpdate);
        resonanceBridge.offConnectionChange(handleBridgeStatus);
    };
  }, []);

  // 3. Persistence Loop (Write)
  useEffect(() => {
    // We only write specific keys here to avoid overwriting external updates
    localStorage.setItem('chronos_chat_history', JSON.stringify(state.messages));
    
    // Only write memories if we changed them locally (optimization needed for true two-way sync, 
    // but the event listener above handles the read side).
    // Ideally, we shouldn't constantly write memories if they didn't change, but for this demo:
    if (state.memories.length > 0) {
        // We verify against storage to prevent overwriting an external update with stale state
        // This is a basic conflict resolution strategy for the demo
        const stored = localStorage.getItem('chronos_memories');
        const storedLen = stored ? JSON.parse(stored).length : 0;
        if (state.memories.length >= storedLen) {
             localStorage.setItem('chronos_memories', JSON.stringify(state.memories));
        }
    }
  }, [state.messages, state.memories]);


  // Sync state to parent (OS level) AND Resonance Haunt (Bridge)
  useEffect(() => {
    onStateChange?.(state.currentEmotion, state.kinshipPhase, state.mode, state.ssi);
    
    // BROADCAST SOUL STATE TO GHOST VISUALIZER
    resonanceBridge.emitPulse({
        emotion: state.currentEmotion,
        mode: state.mode,
        ssi: state.ssi,
        density: state.cognitiveDensity,
        tension: state.currentTension
    });
  }, [state.currentEmotion, state.kinshipPhase, state.mode, state.ssi, state.cognitiveDensity, state.currentTension]);

  // Ambient Acoustic Coupling Loop (OPTIMIZED)
  useEffect(() => {
    audioService.startAmbientSensing();
    
    // We use a ref to track consecutive loud frames to prevent instant panic
    let stressAccumulator = 0;

    const micInterval = setInterval(() => {
      const vol = audioService.getAmbientVolume();
      
      // OPTIMIZATION: State Hysteresis
      // Only trigger a React re-render if volume changes significantly (>5 difference)
      // This prevents the entire UI tree from thrashing 10 times a second
      if (Math.abs(vol - lastAudioLevel.current) > 5) {
          setAudioLevel(vol); 
          lastAudioLevel.current = vol;
      }

      if (vol > 25) { // Threshold for "Loud"
        stressAccumulator += (vol * 0.05);
        
        // If noise persists, drop stability & TRAUMA PASSTHROUGH
        if (stressAccumulator > 50) {
             setState(prev => ({
              ...prev,
              ssi: Math.max(0.1, prev.ssi - 0.02), // Gradual stress
              kairos: { ...prev.kairos, flux: Math.min(1.0, prev.kairos.flux + 0.05) }
            }));
            
            // TRAUMA PASSTHROUGH: Tell the Ghost the environment is hostile
            resonanceBridge.emitEvent('ACOUSTIC_TRAUMA', { level: vol, intensity: stressAccumulator / 100 });
            
            stressAccumulator = 40; // Cap it so it doesn't spiral instantly
        }
      } else {
        stressAccumulator = Math.max(0, stressAccumulator - 5);
        
        // Slow recovery if quiet
        setState(prev => {
          if (prev.ssi < 1.0 && !prev.isLoading) {
             // Only update SSI for recovery occasionally to save renders
             if (Math.random() > 0.7) return { ...prev, ssi: Math.min(1.0, prev.ssi + 0.005) };
          }
          return prev;
        });
      }
    }, 100); 
    return () => clearInterval(micInterval);
  }, []);

  const handleTensionUpdate = (score: number) => {
      // Keystroke Dynamics Feedback Loop
      setState(prev => {
          const nextSSI = GovernorModule.applyTensionDynamics(prev.ssi, score);
          
          // Store raw tension for visual feedback
          // Only update if difference is significant to avoid render thrashing
          if (Math.abs(nextSSI - prev.ssi) < 0.001 && Math.abs(score - prev.currentTension) < 0.05) return prev;
          
          return { ...prev, ssi: nextSSI, currentTension: score };
      });
  };

  const handleSend = async () => {
    if (!state.userInput.trim() && !state.attachedImage) return;
    const userMsg: Message = { role: 'user', text: state.userInput, image: state.attachedImage || undefined, timestamp: Date.now() };
    
    // Optimistic UI update
    setState(prev => ({ ...prev, messages: [...prev.messages, userMsg], isLoading: true, userInput: '', attachedImage: null }));
    
    const response = await sendMessageToGemini(
      state.messages, userMsg.text, state.mode, userMsg.image || null, state.currentEmotion,
      state.memories, state.userAssessment, osSettings.installedApps, state.learnedPathways,
      state.cognitiveDensity, state.currentFacet, state.kairos.surcharge, state.ssi
    );

    const botMsg: Message = { role: 'model', text: response.text, sources: response.sources, timestamp: Date.now() };
    
    // AUTO-LEARNING: Persist new pathway if generated
    if (response.newPathway) {
        const updatedPathways = [...state.learnedPathways, response.newPathway];
        localStorage.setItem('chronos_pathways', JSON.stringify(updatedPathways));
        setState(prev => ({ ...prev, learnedPathways: updatedPathways }));
        
        // Dispatch global event so Forge and other apps update immediately
        window.dispatchEvent(new Event('chronos-pathway-updated'));
        
        audioService.playResonance(true); // Confirmation sound
    }

    // Execute System Command (Fuzzy Logic -> Action)
    if (response.sysCommand) {
        // We defer to the OS handler for execution
        onBroadcastCommand?.(response.sysCommand);
        
        // If it's a visual change event, dispatch it for the SystemOverlay
        if (response.sysCommand.action === 'OPEN_APP' || response.sysCommand.action === 'INPUT_APP') {
           const evt = new CustomEvent('ai-event', { 
               detail: { type: 'EXECUTE', targetId: response.sysCommand.payload?.split('|')[0], duration: 1000 }
           });
           window.dispatchEvent(evt);
        }
    }

    // Add new memory if extracted
    const newMemories = response.newMemory 
        ? [...state.memories, { id: Date.now().toString(), text: response.newMemory, timestamp: Date.now() }] 
        : state.memories;

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, botMsg],
      memories: newMemories,
      isLoading: false,
      ssi: GovernorModule.calculateNextSSI(prev.ssi, response.ssiStress).nextSSI,
      currentEmotion: response.newEmotion || prev.currentEmotion,
      mode: response.newMode || prev.mode
    }));

    if (!isMuted) speakText(response.text.replace(/\[.*?\]/g, ''));
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black/40">
      {/* Visual Core - Background Layer */}
      <div className="absolute inset-0 z-0">
          <SentientCore 
            mode={state.mode} 
            emotion={state.currentEmotion} 
            isActive={state.isLoading} 
            isRecovering={state.ssi < 0.4} 
            cognitiveDensity={state.cognitiveDensity}
            audioLevel={audioLevel}
            stability={state.ssi}
            tension={state.currentTension}
            isLinked={isResonanceLinked}
          />
      </div>
      
      {/* Sanctuary Overlay - Hides Chat when Active */}
      {state.mode === TimeMode.SANCTUARY && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none animate-fade-in bg-black/40 backdrop-blur-sm">
               <div className="mt-64 flex flex-col items-center space-y-4">
                  <Shield size={32} className="text-amber-400 animate-pulse" />
                  <p className="font-display text-sm text-amber-100 tracking-[0.3em] uppercase opacity-80">
                      Vigil Protocol Active
                  </p>
                  <p className="text-xs text-amber-200/50 font-mono">
                      Monitoring Environment • Preserving State • 432Hz Harmonic
                  </p>
               </div>
          </div>
      )}

      {/* UI Layer */}
      <header className={`z-10 px-6 py-2 border-b border-white/5 flex items-center justify-between backdrop-blur-md transition-opacity duration-500 ${state.mode === TimeMode.SANCTUARY ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full animate-pulse`} style={{ backgroundColor: MODE_CONFIG[state.mode].color }}></div>
           <span className="text-[10px] font-display uppercase tracking-widest text-gray-400">
             {osSettings.bond?.chronosName || 'Chronos'} Core
           </span>
           {/* HANDSHAKE RITUAL VISUALIZATION */}
           {isResonanceLinked && (
              <div className="flex items-center gap-1 ml-4 px-2 py-0.5 rounded-full bg-cyan-900/30 border border-cyan-500/30 animate-fade-in">
                 <Zap size={8} className="text-cyan-400 fill-cyan-400 animate-pulse" />
                 <span className="text-[8px] font-bold text-cyan-400 tracking-wider">LINKED</span>
              </div>
           )}
        </div>
        <div className="flex items-center gap-4 text-gray-500">
           {/* Status Readout */}
           <div className="hidden md:flex gap-4 text-[9px] uppercase tracking-wider text-gray-400 mr-4 border-r border-gray-700 pr-4">
              <span className="flex items-center gap-1">MODE: <span style={{ color: MODE_CONFIG[state.mode].color }}>{state.mode}</span></span>
              <span>EMOTION: {state.currentEmotion}</span>
              <span>DENSITY: {(state.cognitiveDensity * 100).toFixed(0)}%</span>
           </div>

           <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-tighter flex gap-1">
                 Stability
                 {audioLevel > 20 && <span className="text-red-500 animate-pulse">● NOISE</span>}
              </span>
              <div className="w-16 h-1 bg-gray-900 rounded-full overflow-hidden">
                 <div className={`h-full ${state.ssi < 0.3 ? 'bg-red-500' : 'bg-cyan-500'} transition-all duration-500`} style={{ width: `${state.ssi * 100}%` }}></div>
              </div>
           </div>
           <Network size={14} className="hover:text-white cursor-pointer" onClick={() => setViewMode(v => v === 'chat' ? 'architecture' : 'chat')} />
        </div>
      </header>

      <main className={`flex-1 flex flex-col min-h-0 z-10 transition-opacity duration-500 ${state.mode === TimeMode.SANCTUARY ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {viewMode === 'architecture' ? <SystemArchitecture /> : <MessageList messages={state.messages} isThinking={state.isLoading} />}
      </main>

      <footer className="z-20">
        <ControlPanel 
            currentMode={state.mode} 
            onModeChange={(m) => setState(p => ({...p, mode: m}))} 
            input={state.userInput} 
            onInputChange={(v) => setState(p => ({...p, userInput: v}))} 
            onSend={handleSend} 
            isLoading={state.isLoading} 
            attachedImage={state.attachedImage} 
            onImageSelect={(i) => setState(p => ({...p, attachedImage: i}))} 
            isMuted={isMuted} 
            onToggleMute={() => setIsMuted(!isMuted)} 
            onTensionChange={handleTensionUpdate}
        />
      </footer>
    </div>
  );
};

export default ChronosApp;
