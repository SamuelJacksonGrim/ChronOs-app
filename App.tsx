
import React, { useState, useEffect } from 'react';
import { OSSettings } from './types';
import SetupWizard from './components/SetupWizard';
import Desktop from './components/Desktop';
import { Fingerprint, ExternalLink, Lock } from 'lucide-react';
import SentientCore from './components/SentientCore';
import { TimeMode, Emotion } from './types';
import { decryptData, encryptData, logSystemEvent } from './services/securityService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  const [osSettings, setOsSettings] = useState<OSSettings | null>(null);
  const [bootStatus, setBootStatus] = useState<string>("BOOT_SEQUENCE_INIT...");

  // 1. Check API Key
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true); // Dev fallback
      }
      setCheckingKey(false);
    };
    checkKey();
  }, []);

  // 2. Load and Decrypt OS Settings
  useEffect(() => {
    const boot = async () => {
        try {
          const stored = localStorage.getItem('chronos_os_settings');
          if (stored) {
            setBootStatus("DECRYPTING_SECURE_STORE...");
            
            // Artificial delay for effect
            await new Promise(r => setTimeout(r, 800)); 
            
            let data = await decryptData(stored);
            
            if (!data) {
                // If decryption fails (key mismatch or corruption), force reset logic or handle error
                console.error("Secure Boot Failed: Data corruption or Key mismatch");
                setBootStatus("CRITICAL_ERROR: DECRYPTION_FAILED");
                return;
            }

            setOsSettings(data);
            setBootStatus("SYSTEM_READY");
          } else {
            setBootStatus("NO_BOOT_IMAGE_FOUND");
          }
        } catch (e) {
          console.error("Failed to load OS settings", e);
          setBootStatus("BOOT_FAILURE");
        }
    };
    boot();
  }, []);

  const handleApiKeySelect = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleSetupComplete = (newSettings: OSSettings) => {
    setOsSettings(newSettings);
    // Note: SetupWizard handles the initial encrypted save
  };

  const handleUpdateSettings = async (newSettings: OSSettings) => {
    setOsSettings(newSettings);
    try {
        const encrypted = await encryptData(newSettings);
        localStorage.setItem('chronos_os_settings', encrypted);
        await logSystemEvent("SETTINGS_UPDATED");
    } catch(e) {
        console.error("Failed to save encrypted settings", e);
    }
  };

  const handleEmergencyShutdown = () => {
    // Clear all persistent data to simulate a full factory reset / initial boot sequence
    localStorage.clear();
    setOsSettings(null);
    setHasApiKey(false);
  };

  // RENDER LOGIC

  // A. Loading / Boot Sequence
  if (checkingKey || (osSettings && bootStatus.includes("DECRYPTING"))) {
    return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
            <Lock className="text-cyan-900 animate-pulse" size={48} />
            <div className="text-cyan-900 font-mono tracking-widest text-xs">{bootStatus}</div>
        </div>
    );
  }

  // B. Oath / API Key Screen (Pre-OS)
  if (!hasApiKey) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <SentientCore mode={TimeMode.ETERNITY} emotion={Emotion.NEUTRAL} isActive={true} />
        </div>
        <div className="relative z-10 max-w-md w-full bg-black/60 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="flex justify-center mb-2">
             <Fingerprint size={48} className="text-cyan-500 animate-pulse" />
          </div>
          <h1 className="font-display text-2xl text-white tracking-widest uppercase">Chronos Link</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Identity Key Verification Required.
          </p>
          <button 
            onClick={handleApiKeySelect}
            className="w-full py-4 bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
          >
            <span>Authenticate Link</span>
            <ExternalLink size={16} />
          </button>
           <div className="text-[10px] text-gray-600">
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-cyan-500">
               Billing Information
             </a>
           </div>
        </div>
      </div>
    );
  }

  // C. OS Setup Wizard (First Time Boot)
  if (!osSettings || !osSettings.setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // D. The Desktop (Main OS)
  return <Desktop settings={osSettings} onUpdateSettings={handleUpdateSettings} onShutdown={handleEmergencyShutdown} />;
};

export default App;
