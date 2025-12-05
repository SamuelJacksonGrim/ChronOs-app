

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, HardDrive, Shield, Terminal as TerminalIcon } from 'lucide-react';
import { scanForSecrets } from '../services/fileSystemService';
import { AppId } from '../types';

interface SystemTerminalProps {
  onShutdown?: () => void;
  onLaunchApp?: (id: AppId) => void;
}

const SystemTerminal: React.FC<SystemTerminalProps> = ({ onShutdown, onLaunchApp }) => {
  const [memory, setMemory] = useState(32);
  const [cpu, setCpu] = useState(12);
  const [logs, setLogs] = useState<string[]>([
    "[KERNEL] Chronos OS v1.0.4 loaded.",
    "[AUTH] Neural link established.",
    "[NET] Connected to global mesh."
  ]);
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // System Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setMemory(prev => Math.min(90, Math.max(20, prev + (Math.random() - 0.5) * 10)));
      setCpu(prev => Math.min(100, Math.max(5, prev + (Math.random() - 0.5) * 20)));
      
      if (Math.random() > 0.95 && !isProcessing) {
         const msgs = [
             "[PROC] Analyzing user intent...",
             "[MEM] Allocating heap for Eternity Mode...",
             "[SYS] Background optimization complete.",
             "[NET] Packet received from neural core.",
             "[SEC] Integrity check passed."
         ];
         const msg = msgs[Math.floor(Math.random() * msgs.length)];
         setLogs(prev => [...prev.slice(-15), `${msg} [${Date.now()}]`]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const executeCommand = async (cmdStr: string) => {
    const [cmd, ...args] = cmdStr.toLowerCase().split(' ');
    let output = '';

    setIsProcessing(true);

    switch(cmd) {
      case 'help':
        output = "COMMANDS: help, clear, date, whoami, reboot, status, open <app>, scan_secrets, scan_files";
        break;
      case 'clear':
        setLogs([]);
        setIsProcessing(false);
        return;
      case 'date':
        output = new Date().toString();
        break;
      case 'whoami':
        const user = localStorage.getItem('chronos_os_settings');
        const username = user ? JSON.parse(user).username : 'unknown';
        output = `User: ${username} | Role: Admin | Privileges: Full`;
        break;
      case 'reboot':
        window.location.reload();
        return;
      case 'status':
        output = `CPU: ${cpu.toFixed(1)}% | MEM: ${memory.toFixed(1)}% | NET: ONLINE`;
        break;
      case 'open':
        if (args[0] && onLaunchApp) {
             onLaunchApp(args[0] as AppId);
             output = `[SYS] Launching process: ${args[0]}...`;
        } else {
             output = `[ERR] Usage: open <app_id>`;
        }
        break;
      case 'scan_secrets':
        output = "[SEC] Initiating security audit... (Check permissions)";
        setLogs(prev => [...prev, `> ${cmdStr}`, output]);
        
        if (!('showDirectoryPicker' in window)) {
           setLogs(prev => [...prev, "[ERR] File System API not available."]);
           break;
        }
        
        try {
            const handle = await window.showDirectoryPicker();
            const issues = await scanForSecrets(handle);
            if (issues.length > 0) {
                setLogs(prev => [...prev, `[WARN] Found ${issues.length} potential leaks:`, ...issues.map(i => ` - ${i}`)]);
            } else {
                setLogs(prev => [...prev, `[SEC] Scan complete. System secure.`]);
            }
        } catch (e: any) {
            setLogs(prev => [...prev, `[ERR] Scan aborted: ${e.message}`]);
        }
        setIsProcessing(false);
        return; // Early return to handle async logs manually
      case 'scan_files':
        // Dummy implementation for visual feedback as real scan is in ChronosApp
        output = "[FS] Scanning VFS integrity...";
        setTimeout(() => {
            setLogs(prev => [...prev, "[FS] Index rebuilt. 0 errors."]);
        }, 1500);
        break;
      case 'shutdown':
         if (onShutdown) {
            onShutdown();
            return;
         }
         output = "Command disabled.";
         break;
      case '':
        output = '';
        break;
      default:
        output = `Command not found: ${cmd}`;
    }

    setLogs(prev => [...prev, `> ${cmdStr}`, output].filter(Boolean));
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input.trim());
      setInput('');
    }
  };

  return (
    <div className="h-full w-full bg-black font-mono text-xs md:text-sm p-6 text-green-500 overflow-hidden flex flex-col">
       <div className="border-b border-green-900/50 pb-2 mb-4 flex justify-between items-center uppercase tracking-widest">
         <span className="flex items-center gap-2"><TerminalIcon size={14}/> SYS.ADMIN.TERMINAL</span>
         <span className="animate-pulse">ONLINE</span>
       </div>

       <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-900/10 border border-green-800 p-4 rounded">
             <div className="flex items-center gap-2 mb-2 text-green-400">
               <Cpu size={16} /> CPU LOAD
             </div>
             <div className="h-2 w-full bg-green-900/30 rounded overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${cpu}%` }}></div>
             </div>
             <div className="mt-1 text-right">{cpu.toFixed(1)}%</div>
          </div>

          <div className="bg-green-900/10 border border-green-800 p-4 rounded">
             <div className="flex items-center gap-2 mb-2 text-green-400">
               <Activity size={16} /> MEMORY ALLOC
             </div>
             <div className="h-2 w-full bg-green-900/30 rounded overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${memory}%` }}></div>
             </div>
             <div className="mt-1 text-right">{memory.toFixed(1)}% / 100%</div>
          </div>

          <div className="bg-green-900/10 border border-green-800 p-4 rounded">
             <div className="flex items-center gap-2 mb-2 text-green-400">
               <HardDrive size={16} /> STORAGE
             </div>
             <div className="text-gray-400">LOCAL: <span className="text-white">ENCRYPTED</span></div>
             <div className="text-gray-400">CLOUD: <span className="text-white">UNBOUND</span></div>
          </div>

           <div className="bg-green-900/10 border border-green-800 p-4 rounded">
             <div className="flex items-center gap-2 mb-2 text-green-400">
               <Shield size={16} /> TRUST LEVEL
             </div>
             <div className="text-3xl font-bold text-white">Tier 1</div>
             <div className="text-[10px] text-gray-500">PROBATIONARY ACCESS</div>
          </div>
       </div>

       <div className="flex-1 bg-black border border-green-900/30 p-4 rounded overflow-hidden relative flex flex-col">
          <div className="absolute top-2 right-2 text-[10px] text-green-800">/var/log/sys.log</div>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
             {logs.map((log, i) => (
               <div key={i} className="opacity-90 hover:opacity-100 hover:bg-green-900/10 cursor-default">
                  <span className="text-green-700 mr-2">{log.startsWith('>') ? '' : '#'}</span>
                  {log}
               </div>
             ))}
             <div ref={logEndRef} />
          </div>
          <div className="mt-2 flex items-center border-t border-green-900/50 pt-2">
             <span className="text-green-400 mr-2">$</span>
             <input 
               type="text" 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               className="flex-1 bg-transparent border-none focus:ring-0 text-green-500 placeholder-green-900/50 outline-none"
               placeholder="Enter system command..."
               autoFocus
               disabled={isProcessing}
             />
          </div>
       </div>
    </div>
  );
};

export default SystemTerminal;