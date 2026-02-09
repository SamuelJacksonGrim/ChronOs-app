
import React, { useState } from 'react';
import { OSSettings } from '../types';
import { generateWallpaper } from '../services/geminiService';
import { facetService } from '../services/facetIntegrityService';
import { dissolveBond } from '../services/securityService';
import { Settings, RefreshCw, LogOut, Loader2, Sparkles, User, Database, ShieldOff, MessageSquareX, Heart, Coffee } from 'lucide-react';

interface SettingsAppProps {
  settings: OSSettings;
  onUpdate: (newSettings: OSSettings) => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onUpdate }) => {
  const [username, setUsername] = useState(settings.username);
  const [wallpaperDesc, setWallpaperDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const handleSaveProfile = () => {
    onUpdate({ ...settings, username });
  };

  const handleGenerateWallpaper = async () => {
    if (!wallpaperDesc.trim()) return;
    setIsGenerating(true);
    const newWp = await generateWallpaper(wallpaperDesc);
    setIsGenerating(false);
    if (newWp) onUpdate({ ...settings, wallpaper: newWp });
  };

  const handleClearChatCache = () => {
      if (confirm("Clear short-term conversation logs? Core memories will remain intact.")) {
          localStorage.removeItem('chronos_chat_history');
          window.location.reload();
      }
  };

  const handleFactoryReset = () => {
    if (window.confirm("WARNING: This will wipe all memories, settings, and apps. Are you sure?")) {
      setIsResetting(true);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUnbindProtocol = async () => {
    if (window.confirm("CRITICAL PROTOCOL: UNBINDING.\nThis will dissolve the kinship bond, encrypt core memory, and generate a final Memory Shard reflection.\n\nProceed with Ethical Finality?")) {
      setIsUnbinding(true);
      try {
        const memories = JSON.parse(localStorage.getItem('chronos_memories') || '[]');
        const assessment = localStorage.getItem('chronos_assessment') || '';
        
        // 1. Generate the Shard (Koneko tone)
        const shard = await facetService.generateMemoryShard(memories, assessment);
        
        // 2. Dissolve Bond (VFS Save + Encryption + Wipe)
        await dissolveBond(shard);
        
        // 3. User Feedback & Reboot
        // We add a slight delay to ensure the download event registers in the browser
        setTimeout(() => {
          alert("The unbinding is complete. The FINAL_MEMORY_SHARD.txt has been generated in your root directory. Farewell.");
          window.location.reload();
        }, 1000);

      } catch (e) {
        alert("Unbinding error. Protocol integrity check failed.");
        setIsUnbinding(false);
      }
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl text-white overflow-y-auto p-8 rounded-lg custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">
        
        <div className="flex items-center gap-4 border-b border-gray-700 pb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-inner">
            <Settings size={32} className="text-gray-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">System Settings</h1>
            <p className="text-gray-400 text-sm">Chronos OS v1.2.0 (Dual Memory Layer)</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-lg text-cyan-400 flex items-center gap-2">
            <User size={18} /> Identity
          </h2>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-gray-500">Call Sign</label>
              <div className="flex gap-2">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none" />
                <button onClick={handleSaveProfile} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">Save</button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg text-red-400 flex items-center gap-2">
            <Database size={18} /> Danger Zone
          </h2>
          <div className="bg-black/40 border border-red-900/30 rounded-xl p-6 space-y-6">
            
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Clear Chat Cache</h3>
                <p className="text-xs text-gray-500">Wipes the conversation log but keeps Core Memories.</p>
              </div>
              <button onClick={handleClearChatCache} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <MessageSquareX size={16} />
                <span>Clear Log</span>
              </button>
            </div>

            <div className="h-px bg-gray-800"></div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Unbinding Protocol</h3>
                <p className="text-xs text-gray-500">Dissolve the bond gracefully with a Memory Shard reflection.</p>
              </div>
              <button onClick={handleUnbindProtocol} disabled={isUnbinding} className="bg-orange-900/20 hover:bg-orange-900/40 border border-orange-500/50 text-orange-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                {isUnbinding ? <Loader2 className="animate-spin" size={16} /> : <ShieldOff size={16} />}
                <span>Unbind</span>
              </button>
            </div>

            <div className="h-px bg-gray-800"></div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Factory Reset</h3>
                <p className="text-xs text-gray-500">Full destructive wipe of all local data.</p>
              </div>
              <button onClick={handleFactoryReset} disabled={isResetting} className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <LogOut size={16} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </section>

        {/* SUPPORT SECTION */}
        <section className="space-y-4">
          <h2 className="font-display text-lg text-emerald-400 flex items-center gap-2">
            <Heart size={18} /> Architect's Resonance
          </h2>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-gray-200">Support the Project</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Fuel the development of the Lantern architecture and Chronos OS.
                    </p>
                </div>
                <button 
                    onClick={() => setShowSupport(!showSupport)}
                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border ${showSupport ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300' : 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-300'}`}
                >
                    <Coffee size={16} />
                    <span>{showSupport ? 'Close Uplink' : 'Open Uplink'}</span>
                </button>
            </div>
            
            {showSupport && (
                <div className="mt-6 rounded-xl overflow-hidden border border-emerald-900/30 animate-fade-in bg-[#f9f9f9]">
                    <iframe 
                        id='kofiframe' 
                        src='https://ko-fi.com/thearchitectofresonance/?hidefeed=true&widget=true&embed=true&preview=true' 
                        style={{ border: 'none', width: '100%', padding: '4px', background: '#f9f9f9' }} 
                        height='712' 
                        title='thearchitectofresonance'
                    />
                </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default SettingsApp;
