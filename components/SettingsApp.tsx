
import React, { useState } from 'react';
import { OSSettings } from '../types';
import { generateWallpaper } from '../services/geminiService';
import { Settings, RefreshCw, LogOut, Loader2, Sparkles, User, Database } from 'lucide-react';

interface SettingsAppProps {
  settings: OSSettings;
  onUpdate: (newSettings: OSSettings) => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onUpdate }) => {
  const [username, setUsername] = useState(settings.username);
  const [wallpaperDesc, setWallpaperDesc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveProfile = () => {
    onUpdate({ ...settings, username });
  };

  const handleGenerateWallpaper = async () => {
    if (!wallpaperDesc.trim()) return;
    setIsGenerating(true);
    const newWp = await generateWallpaper(wallpaperDesc);
    setIsGenerating(false);
    if (newWp) {
      onUpdate({ ...settings, wallpaper: newWp });
    }
  };

  const handleFactoryReset = () => {
    if (window.confirm("WARNING: This will wipe all memories, settings, and apps. Are you sure?")) {
      setIsResetting(true);
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/90 backdrop-blur-xl text-white overflow-y-auto p-8 rounded-lg">
      <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-700 pb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-inner">
            <Settings size={32} className="text-gray-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">System Settings</h1>
            <p className="text-gray-400 text-sm">Chronos OS v1.0.4</p>
          </div>
        </div>

        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="font-display text-lg text-cyan-400 flex items-center gap-2">
            <User size={18} /> Identity
          </h2>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-gray-500">Call Sign</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none"
                />
                <button 
                  onClick={handleSaveProfile}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Wallpaper Section */}
        <section className="space-y-4">
          <h2 className="font-display text-lg text-purple-400 flex items-center gap-2">
            <Sparkles size={18} /> Visual Synthesis
          </h2>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
               <label className="text-xs uppercase tracking-widest text-gray-500">Regenerate Environment</label>
               <textarea 
                  value={wallpaperDesc}
                  onChange={(e) => setWallpaperDesc(e.target.value)}
                  placeholder="Describe a new atmosphere (e.g. 'Cyberpunk forest in winter')"
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 focus:border-purple-500 focus:outline-none resize-none h-24 text-sm"
               />
               <button 
                  onClick={handleGenerateWallpaper}
                  disabled={isGenerating || !wallpaperDesc.trim()}
                  className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
               >
                 {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                 <span>Synthesize New Wallpaper</span>
               </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-4">
          <h2 className="font-display text-lg text-red-400 flex items-center gap-2">
            <Database size={18} /> Core Data
          </h2>
          <div className="bg-black/40 border border-red-900/30 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Factory Reset</h3>
                <p className="text-xs text-gray-500">Wipes local memory and resets OS.</p>
              </div>
              <button 
                onClick={handleFactoryReset}
                disabled={isResetting}
                className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <LogOut size={16} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SettingsApp;
