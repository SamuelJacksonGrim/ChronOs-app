
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Play, StopCircle, Terminal, Activity, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { runAgentLoop } from '../services/geminiService';
import { AgentStep, AppId } from '../types';

interface AutoAgentProps {
  onLaunchApp?: (id: AppId) => void;
  onRemoteInput?: (input: string) => void;
}

const AutoAgent: React.FC<AutoAgentProps> = ({ onLaunchApp, onRemoteInput }) => {
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ step: number, thought: string, action: string, observation: string }[]>([]);
  const [currentStep, setCurrentStep] = useState<AgentStep | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps, currentStep]);

  const executeTool = async (tool: string, input: string): Promise<string> => {
    // Simulate Tool Execution Latency
    await new Promise(r => setTimeout(r, 1500));

    switch (tool.toLowerCase()) {
      case 'open_app':
        if (onLaunchApp) onLaunchApp(input as AppId);
        return `Opened application: ${input}`;
      case 'input_app':
        if (onRemoteInput) onRemoteInput(input);
        return `Sent input to active app: ${input}`;
      case 'notify':
        if ('Notification' in window && Notification.permission === 'granted') {
           new Notification("Auto-Agent", { body: input });
        }
        return `Notification sent: ${input}`;
      case 'scan_files':
        // Mock scan for demonstration as real scan requires user interaction in main thread
        return "Scan initiated. Found 3 duplicate clusters (mock).";
      case 'final_answer':
        return `TASK COMPLETE: ${input}`;
      default:
        return `Unknown tool: ${tool}`;
    }
  };

  const startLoop = async () => {
    if (!goal.trim()) return;
    setIsRunning(true);
    runningRef.current = true;
    setSteps([]);
    setCurrentStep(null);

    let iteration = 0;
    const maxIterations = 10;

    try {
      while (runningRef.current && iteration < maxIterations) {
        iteration++;
        
        // 1. THINK
        const agentResponse = await runAgentLoop(goal, steps);
        if (!agentResponse) throw new Error("Agent connection failed.");
        
        setCurrentStep(agentResponse);

        // Check for completion
        if (agentResponse.tool === 'final_answer') {
           setSteps(prev => [...prev, { 
               step: iteration, 
               thought: agentResponse.thought, 
               action: "FINAL_ANSWER", 
               observation: agentResponse.tool_input 
           }]);
           setIsRunning(false);
           break;
        }

        // 2. ACT
        const observation = await executeTool(agentResponse.tool, agentResponse.tool_input);

        // 3. OBSERVE (Save to history)
        const newHistoryStep = {
            step: iteration,
            thought: agentResponse.thought,
            action: `${agentResponse.tool}(${agentResponse.tool_input})`,
            observation
        };
        
        setSteps(prev => [...prev, newHistoryStep]);
        // Small delay between loops
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
      runningRef.current = false;
    }
  };

  const stopLoop = () => {
    setIsRunning(false);
    runningRef.current = false;
  };

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col text-green-500 font-mono overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-green-900/50 flex items-center justify-between bg-black/40">
         <div className="flex items-center gap-2">
            <Bot size={20} className={isRunning ? "animate-pulse" : ""} />
            <h2 className="font-bold tracking-widest text-sm">AUTONOMOUS AGENT v1.0</h2>
         </div>
         <div className="text-[10px] text-green-800">
            {isRunning ? "LOOP ACTIVE" : "STANDBY"}
         </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
         {/* Goal Input */}
         {!isRunning && steps.length === 0 && (
            <div className="max-w-xl mx-auto mt-20 space-y-4">
               <div className="text-center space-y-2">
                  <Activity size={48} className="mx-auto text-green-700" />
                  <h3 className="text-lg font-bold text-green-400">Define Objective</h3>
                  <p className="text-xs text-green-700">The agent will recursively plan and execute tools to achieve this goal.</p>
               </div>
               <div className="flex gap-2">
                  <input 
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. 'Optimize the energy grid and clear duplicate files'"
                    className="flex-1 bg-black border border-green-900 rounded p-3 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <button 
                    onClick={startLoop}
                    disabled={!goal.trim()}
                    className="bg-green-900/30 border border-green-500/30 text-green-400 px-4 rounded hover:bg-green-900/50 transition-colors disabled:opacity-50"
                  >
                    <Play size={18} />
                  </button>
               </div>
            </div>
         )}

         {/* History Stream */}
         {steps.map((step, i) => (
            <div key={i} className="border-l-2 border-green-900/50 pl-4 py-2 space-y-2 text-xs">
               <div className="font-bold text-green-700">STEP {step.step}</div>
               <div className="text-green-300"><span className="opacity-50">THOUGHT:</span> {step.thought}</div>
               <div className="text-blue-400"><span className="opacity-50 text-green-600">ACTION:</span> {step.action}</div>
               <div className="text-gray-400 italic"><span className="opacity-50 text-green-600">RESULT:</span> {step.observation}</div>
            </div>
         ))}

         {/* Current Action / Thinking */}
         {isRunning && (
            <div className="bg-green-900/10 border border-green-500/30 rounded p-4 animate-pulse" ref={scrollRef}>
               {currentStep ? (
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                        <Activity size={14} className="animate-spin" />
                        EXECUTING
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                           <div className="opacity-50 mb-1">PLAN</div>
                           <div className="text-green-200 whitespace-pre-wrap">{currentStep.plan}</div>
                        </div>
                        <div>
                           <div className="opacity-50 mb-1">CRITICISM</div>
                           <div className="text-yellow-600">{currentStep.criticism}</div>
                        </div>
                     </div>
                     <div className="pt-2 border-t border-green-900/30 text-xs">
                        <span className="opacity-50">NEXT TOOL:</span> <span className="text-cyan-400 font-bold">{currentStep.tool}</span>
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                     <Terminal size={12} /> THINKING...
                  </div>
               )}
            </div>
         )}

         {/* Stop Button */}
         {isRunning && (
            <div className="flex justify-center pt-4">
               <button onClick={stopLoop} className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-900/50 text-red-400 rounded hover:bg-red-900/40 text-xs">
                  <StopCircle size={14} /> HALT PROCESS
               </button>
            </div>
         )}
      </div>
    </div>
  );
};

export default AutoAgent;
