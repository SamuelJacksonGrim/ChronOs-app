
import React, { useRef, useState } from 'react';
import { TimeMode } from '../types';
import { MODE_CONFIG } from '../constants';
import { Send, Image as ImageIcon, X, Zap, Globe, BrainCircuit, Mic, MicOff, Volume2, VolumeX, Shield } from 'lucide-react';
import { startListening } from '../services/voiceService';
import { useKeystrokeDynamics } from '../hooks/useKeystrokeDynamics';

interface ControlPanelProps {
  currentMode: TimeMode;
  onModeChange: (mode: TimeMode) => void;
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  attachedImage: string | null;
  onImageSelect: (base64: string | null) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTensionChange?: (score: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentMode,
  onModeChange,
  input,
  onInputChange,
  onSend,
  isLoading,
  attachedImage,
  onImageSelect,
  isMuted,
  onToggleMute,
  onTensionChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);

  // Digital Proprioception Hook
  const { handleKeyDown: handleDynamicsDown, handleKeyUp: handleDynamicsUp } = useKeystrokeDynamics(
    (score) => onTensionChange?.(score)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 1. Dynamics Analysis
    handleDynamicsDown(e);

    // 2. Functional Logic
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
      handleDynamicsUp(e);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      window.location.reload(); // Simple way to stop recognition given browser quirks
    } else {
      setIsListening(true);
      startListening(
        (text) => {
          onInputChange(text);
          setIsListening(false); // Auto stop after phrase
        },
        (err) => {
          console.warn(err);
          setIsListening(false);
        }
      );
    }
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800 p-4 md:p-6 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      
      {/* Mode Selector */}
      <div className="flex justify-center mb-6">
        <div className="bg-black/40 p-1 rounded-xl border border-gray-800 flex gap-1 relative">
           {Object.values(TimeMode).map((mode) => {
             const config = MODE_CONFIG[mode];
             const isSelected = currentMode === mode;
             let Icon = Globe;
             if (mode === TimeMode.REFLEX) Icon = Zap;
             if (mode === TimeMode.ETERNITY) Icon = BrainCircuit;
             if (mode === TimeMode.SANCTUARY) Icon = Shield;

             return (
               <button
                 key={mode}
                 onClick={() => onModeChange(mode)}
                 className={`
                   relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                   ${isSelected 
                     ? 'text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                     : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                   }
                 `}
                 style={{
                   backgroundColor: isSelected ? config.color : 'transparent',
                   color: isSelected ? '#000' : undefined
                 }}
               >
                 <Icon size={16} />
                 <span className="hidden md:inline">{config.label.split(' ')[0]}</span>
               </button>
             );
           })}
        </div>
      </div>

      {/* Input Area */}
      <div className="max-w-4xl mx-auto relative">
        {/* Image Preview */}
        {attachedImage && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up">
            <img src={attachedImage} alt="Preview" className="h-16 w-16 object-cover rounded bg-black" />
            <button 
              onClick={() => onImageSelect(null)}
              className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className={`flex gap-2 items-end bg-black/30 border p-2 rounded-2xl transition-all shadow-inner ${isListening ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-gray-700 focus-within:border-gray-500'}`}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/20 rounded-xl transition-colors shrink-0"
            title="Analyze Image"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
          />

          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder={isListening ? "Listening..." : `Message Chronos in ${MODE_CONFIG[currentMode].label}...`}
            className="w-full bg-transparent border-none text-gray-200 placeholder-gray-600 focus:ring-0 resize-none py-3 max-h-32"
            rows={1}
            disabled={isLoading || currentMode === TimeMode.SANCTUARY} // Disable typing in Sanctuary Mode
            style={{ minHeight: '44px' }}
          />

          {/* Voice Input Button */}
          <button
             onClick={toggleVoice}
             className={`p-3 rounded-xl transition-all duration-300 shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
             title="Voice Input"
          >
             {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Audio Output Toggle */}
          <button
             onClick={onToggleMute}
             className={`p-3 rounded-xl transition-all duration-300 shrink-0 ${!isMuted ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
             title={isMuted ? "Unmute Voice" : "Mute Voice"}
          >
             {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={onSend}
            disabled={(!input.trim() && !attachedImage) || isLoading || currentMode === TimeMode.SANCTUARY}
            className={`
              p-3 rounded-xl transition-all duration-300 shrink-0
              ${(!input.trim() && !attachedImage) || isLoading || currentMode === TimeMode.SANCTUARY
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.2)]'
              }
            `}
          >
             <Send size={20} className={isLoading ? 'opacity-0' : 'opacity-100'} />
             {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
             )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
