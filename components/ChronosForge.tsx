

import React, { useState, useEffect } from 'react';
import { Hammer, Play, Save, Code, Terminal, Loader2, Sparkles, Edit, Plus, Trash2, X, ChevronDown, BrainCircuit } from 'lucide-react';
import { LearnedPathway, SystemCommand, AppId } from '../types';
import { generateScript } from '../services/geminiService';

interface ChronosForgeProps {
    onLaunchApp?: (id: AppId) => void;
    onRemoteInput?: (input: string) => void;
}

const ChronosForge: React.FC<ChronosForgeProps> = ({ onLaunchApp, onRemoteInput }) => {
  const [mode, setMode] = useState<'generator' | 'manual'>('generator');
  const [prompt, setPrompt] = useState('');
  const [generatedScript, setGeneratedScript] = useState<LearnedPathway | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [existingPathways, setExistingPathways] = useState<LearnedPathway[]>([]);

  // Manual Form State
  const [manualId, setManualId] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualTrigger, setManualTrigger] = useState('');
  const [manualEfficiency, setManualEfficiency] = useState(0.8);
  const [manualSteps, setManualSteps] = useState<SystemCommand[]>([]);

  useEffect(() => {
    loadPathways();
  }, []);

  const loadPathways = () => {
    try {
        const stored = localStorage.getItem('chronos_pathways');
        if (stored) setExistingPathways(JSON.parse(stored));
    } catch (e) {
        console.error("Failed to load pathways", e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setLogs(prev => [...prev, `[FORGE] Analyzing request: "${prompt}"...`]);
    
    try {
      const script = await generateScript(prompt);
      if (script) {
        setGeneratedScript(script);
        setLogs(prev => [...prev, `[FORGE] Synthesis complete: ${script.name}`]);
      } else {
        setLogs(prev => [...prev, `[FORGE] Synthesis failed. AI returned null.`]);
      }
    } catch (e) {
      setLogs(prev => [...prev, `[ERROR] ${e}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (scriptToSave: LearnedPathway) => {
    if (!scriptToSave) return;
    try {
        const existing = localStorage.getItem('chronos_pathways');
        let pathways: LearnedPathway[] = existing ? JSON.parse(existing) : [];
        
        // Check if updating
        const idx = pathways.findIndex(p => p.id === scriptToSave.id);
        if (idx >= 0) {
            pathways[idx] = scriptToSave;
            setLogs(prev => [...prev, `[SYS] Pathway "${scriptToSave.name}" updated.`]);
        } else {
            pathways.push(scriptToSave);
            setLogs(prev => [...prev, `[SYS] Pathway "${scriptToSave.name}" saved to core memory.`]);
        }

        localStorage.setItem('chronos_pathways', JSON.stringify(pathways));
        setExistingPathways(pathways);
        
        // Reset
        if (mode === 'generator') {
           setGeneratedScript(null);
           setPrompt('');
        } else {
           resetManualForm();
        }
    } catch (e) {
        setLogs(prev => [...prev, `[ERR] Storage failed.`]);
    }
  };

  const resetManualForm = () => {
      setManualId(null);
      setManualName('');
      setManualTrigger('');
      setManualEfficiency(0.8);
      setManualSteps([]);
  };

  const handleLoadForEdit = (pathway: LearnedPathway) => {
      setManualId(pathway.id);
      setManualName(pathway.name);
      setManualTrigger(pathway.triggerPhrase);
      setManualEfficiency(pathway.efficiency);
      setManualSteps([...pathway.steps]);
      setLogs(prev => [...prev, `[EDIT] Loaded "${pathway.name}" for modification.`]);
  };

  const addManualStep = () => {
      setManualSteps([...manualSteps, { action: 'OPEN_APP', payload: '' }]);
  };

  const updateManualStep = (index: number, field: 'action' | 'payload', value: string) => {
      const newSteps = [...manualSteps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      setManualSteps(newSteps);
  };

  const removeManualStep = (index: number) => {
      setManualSteps(manualSteps.filter((_, i) => i !== index));
  };

  const handleManualSave = () => {
      if (!manualName || !manualTrigger || manualSteps.length === 0) return;
      const script: LearnedPathway = {
          id: manualId || Date.now().toString(),
          name: manualName,
          triggerPhrase: manualTrigger,
          steps: manualSteps,
          efficiency: manualEfficiency
      };
      handleSave(script);
  };

  const handleTestSequence = async () => {
      const scriptToRun = mode === 'generator' 
        ? generatedScript 
        : { steps: manualSteps, name: manualName || 'Test Sequence' } as LearnedPathway;
      
      if (!scriptToRun || scriptToRun.steps.length === 0) {
          setLogs(prev => [...prev, "[WARN] No steps to execute."]);
          return;
      }

      setLogs(prev => [...prev, `[EXEC] Running "${scriptToRun.name}"...`]);
      
      for (const step of scriptToRun.steps) {
          setLogs(prev => [...prev, `> ${step.action}: ${step.payload || 'N/A'}`]);
          await new Promise(r => setTimeout(r, 800)); // Visually distinct steps

          switch(step.action) {
              case 'OPEN_APP':
                  if (onLaunchApp) onLaunchApp(step.payload as AppId);
                  break;
              case 'INPUT_APP':
                  if (onRemoteInput && step.payload) {
                      const [_, val] = step.payload.split('|');
                      onRemoteInput(val || step.payload);
                  }
                  break;
              case 'NOTIFY':
                  if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification("Forge Test", { body: step.payload });
                  }
                  break;
              case 'SCAN_SECRETS':
                  setLogs(prev => [...prev, "[SYS] Secret scan simulation initiated."]);
                  break;
              default:
                  setLogs(prev => [...prev, `[SYS] Command '${step.action}' simulated.`]);
          }
      }
      setLogs(prev => [...prev, `[EXEC] Sequence complete.`]);
  };

  const handleDeletePathway = (id: string) => {
      if(confirm('Delete this pathway?')) {
          const updated = existingPathways.filter(p => p.id !== id);
          localStorage.setItem('chronos_pathways', JSON.stringify(updated));
          setExistingPathways(updated);
          if (manualId === id) resetManualForm();
          setLogs(prev => [...prev, `[SYS] Pathway deleted.`]);
      }
  };

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl flex flex-col text-white">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 bg-black/20 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3">
           <Hammer className="text-amber-500" size={20} />
           <h2 className="font-display font-bold tracking-wider text-gray-200">CHRONOS FORGE</h2>
           <span className="text-xs px-2 py-0.5 bg-amber-900/20 text-amber-400 rounded border border-amber-500/30">
               v1.2
           </span>
        </div>
        <div className="flex gap-2">
            <button 
               onClick={() => setMode('generator')} 
               className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${mode === 'generator' ? 'bg-amber-600 text-black' : 'text-gray-400 hover:text-white'}`}
            >
               AI Synthesis
            </button>
            <button 
               onClick={() => setMode('manual')} 
               className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${mode === 'manual' ? 'bg-amber-600 text-black' : 'text-gray-400 hover:text-white'}`}
            >
               Manual Architect
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Input Pane */}
        <div className="w-1/2 p-6 flex flex-col gap-4 border-r border-gray-800 overflow-y-auto custom-scrollbar">
           
           {mode === 'generator' ? (
             <>
                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500 font-bold">Tool Description</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-32 bg-black/40 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 focus:border-amber-500 focus:outline-none resize-none"
                    placeholder="e.g., 'Reset the energy grid controls and clear terminal logs'"
                  />
                </div>
                
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                  <span>Synthesize Tool</span>
                </button>
             </>
           ) : (
             <div className="space-y-4 animate-fade-in">
                {/* Pathway Selector */}
                <div>
                   <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Load Existing Pathway</label>
                   <div className="relative">
                       <select 
                          onChange={(e) => {
                              const p = existingPathways.find(path => path.id === e.target.value);
                              if (p) handleLoadForEdit(p);
                              else resetManualForm();
                          }}
                          value={manualId || ''}
                          className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none appearance-none"
                       >
                           <option value="">-- Create New --</option>
                           {existingPathways.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                       </select>
                       <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                   </div>
                </div>

                <div className="h-px bg-gray-800 my-2"></div>

                <div>
                   <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Function Name</label>
                   <input 
                      value={manualName} onChange={e => setManualName(e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      placeholder="e.g. Energy Reset"
                   />
                </div>
                <div>
                   <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Trigger Phrase</label>
                   <input 
                      value={manualTrigger} onChange={e => setManualTrigger(e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                      placeholder="e.g. reset energy"
                   />
                </div>
                <div>
                   <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Efficiency ({(manualEfficiency * 100).toFixed(0)}%)</label>
                   <input 
                      type="range" min="0" max="1" step="0.1"
                      value={manualEfficiency} onChange={e => setManualEfficiency(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                   />
                </div>
                <div className="pt-4 border-t border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs uppercase text-gray-500 font-bold">Execution Steps</label>
                       <button onClick={addManualStep} className="p-1 bg-amber-900/30 text-amber-400 rounded hover:bg-amber-900/50"><Plus size={14} /></button>
                    </div>
                    <div className="space-y-2">
                       {manualSteps.map((step, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                             <span className="text-xs text-gray-600 w-4">{idx+1}.</span>
                             <select 
                                value={step.action} 
                                onChange={e => updateManualStep(idx, 'action', e.target.value)}
                                className="bg-black/40 border border-gray-700 rounded text-xs px-2 py-1.5 focus:border-amber-500 focus:outline-none"
                             >
                                <option value="OPEN_APP">OPEN_APP</option>
                                <option value="INPUT_APP">INPUT_APP</option>
                                <option value="NOTIFY">NOTIFY</option>
                                <option value="SCAN_FILES">SCAN_FILES</option>
                                <option value="SCAN_SECRETS">SCAN_SECRETS</option>
                                <option value="NETWORK_SCAN">NETWORK_SCAN</option>
                                <option value="EXECUTE_PATHWAY">EXECUTE_PATHWAY</option>
                                <option value="GET_TRUST_LEVEL">GET_TRUST_LEVEL</option>
                             </select>
                             <input 
                                value={step.payload || ''}
                                onChange={e => updateManualStep(idx, 'payload', e.target.value)}
                                className="flex-1 bg-black/40 border border-gray-700 rounded text-xs px-2 py-1.5 focus:border-amber-500 focus:outline-none"
                                placeholder="Payload (e.g. app_id)"
                             />
                             <button onClick={() => removeManualStep(idx)} className="text-gray-600 hover:text-red-400"><X size={14}/></button>
                          </div>
                       ))}
                       {manualSteps.length === 0 && <div className="text-center text-gray-600 text-xs py-4 italic">No steps defined</div>}
                    </div>
                </div>

                {manualId && (
                    <button 
                        onClick={() => handleDeletePathway(manualId)}
                        className="w-full mt-4 py-2 border border-red-900/50 text-red-500 rounded text-xs uppercase font-bold hover:bg-red-900/20"
                    >
                        Delete Pathway
                    </button>
                )}
             </div>
           )}

           <div className="flex-1 bg-black/60 rounded-xl border border-gray-800 p-4 font-mono text-xs text-green-500 overflow-y-auto custom-scrollbar min-h-[100px]">
              <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1">BUILD LOGS</div>
              {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
           </div>
        </div>

        {/* Preview Pane */}
        <div className="w-1/2 p-6 flex flex-col bg-black/20">
           <div className="mb-2 text-xs uppercase text-gray-500 font-bold flex justify-between items-center">
             <span>{mode === 'generator' ? 'Generated Script' : 'Manual Blueprint'}</span>
             <Code size={14} />
           </div>
           
           <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-y-auto custom-scrollbar relative group">
              {mode === 'generator' ? (
                  generatedScript ? (
                    <pre className="text-xs text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">
{JSON.stringify(generatedScript, null, 2)}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                       <Terminal size={32} className="opacity-20" />
                       <p className="text-sm">Waiting for synthesis...</p>
                    </div>
                  )
              ) : (
                  <pre className="text-xs text-amber-300 font-mono leading-relaxed whitespace-pre-wrap">
{JSON.stringify({ 
    id: manualId || 'new-id',
    name: manualName || 'Untitled', 
    trigger: manualTrigger || 'None', 
    efficiency: manualEfficiency,
    steps: manualSteps 
}, null, 2)}
                  </pre>
              )}
           </div>

           <div className="mt-4 flex gap-3">
             <button 
                onClick={handleTestSequence}
                disabled={mode === 'generator' ? !generatedScript : (!manualName || manualSteps.length === 0)}
                className="px-4 py-3 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 rounded-xl text-sm font-bold uppercase hover:bg-cyan-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
             >
               <Play size={16} /> Test
             </button>
             <button 
                onClick={() => {
                   if(mode === 'generator') setGeneratedScript(null);
                   else resetManualForm();
                }} 
                className="flex-1 py-3 border border-gray-600 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold uppercase"
             >
               Discard
             </button>
             <button 
                onClick={() => mode === 'generator' ? handleSave(generatedScript!) : handleManualSave()}
                disabled={mode === 'generator' ? !generatedScript : (!manualName || manualSteps.length === 0)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold uppercase shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Save size={16} /> Save to Core
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ChronosForge;