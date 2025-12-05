
import React, { useState, useEffect } from 'react';
import { Delete, Eraser, Equal } from 'lucide-react';

interface FluxCalcProps {
  onLogAction?: (details: string) => void;
  remoteInput?: string | null;
}

const FluxCalc: React.FC<FluxCalcProps> = ({ onLogAction, remoteInput }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  // Handle Remote AI Input
  useEffect(() => {
    if (remoteInput) {
      const val = remoteInput.trim();
      if (['+', '-', 'x', '*', '/', '÷'].includes(val)) {
         handleOp(val.replace('*', 'x').replace('/', '÷'));
      } else if (val === '=') {
         handleEqual();
      } else if (val.toLowerCase() === 'clear') {
         handleClear();
      } else if (!isNaN(Number(val)) || val === '.') {
         handlePress(val);
      }
    }
  }, [remoteInput]);

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (!isNaN(Number(key)) || key === '.') handlePress(key);
      if (['+', '-', '*', '/'].includes(key)) {
        const map: Record<string, string> = { '*': 'x', '/': '÷' };
        handleOp(map[key] || key);
      }
      if (key === 'Enter') handleEqual();
      if (key === 'Escape') handleClear();
      if (key === 'Backspace') setDisplay(prev => prev.slice(0, -1) || '0');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation]);

  const handlePress = (val: string) => {
    setDisplay(prev => {
      const newVal = prev === '0' && val !== '.' ? val : prev + val;
      return newVal;
    });
    onLogAction?.(`Pressed ${val}`);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    onLogAction?.('Cleared Calculation');
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op);
    setDisplay('0');
    onLogAction?.(`Selected Operation: ${op}`);
  };

  const handleEqual = () => {
    try {
      const fullEq = equation + ' ' + display;
      // eslint-disable-next-line no-eval
      const result = eval(fullEq.replace('x', '*').replace('÷', '/'));
      setDisplay(String(result));
      setEquation('');
      onLogAction?.(`Calculated Result: ${result}`);
    } catch (e) {
      setDisplay('Error');
    }
  };

  const buttons = [
    '7', '8', '9', '÷',
    '4', '5', '6', 'x',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  return (
    <div className="h-full w-full bg-black/80 backdrop-blur-xl flex flex-col p-6 text-white font-mono select-none">
      <div className="flex-1 flex flex-col justify-end items-end space-y-2 mb-6 border-b border-gray-700/50 pb-4">
         <div className="text-gray-400 text-sm h-6">{equation}</div>
         <div className="text-5xl font-light tracking-tighter text-cyan-400 truncate w-full text-right">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <button onClick={handleClear} className="col-span-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl py-4 hover:bg-red-900/40 transition-colors uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            <Eraser size={14} /> Clear Flux
        </button>
        <button onClick={() => setDisplay(prev => prev.slice(0,-1) || '0')} className="bg-gray-800 text-gray-400 rounded-xl py-4 hover:bg-gray-700 transition-colors flex items-center justify-center">
            <Delete size={18} />
        </button>

        {buttons.map(btn => (
           <button 
             key={btn}
             onClick={() => {
                if (btn === '=') handleEqual();
                else if (['+','-','x','÷'].includes(btn)) handleOp(btn);
                else handlePress(btn);
             }}
             className={`
               rounded-xl text-xl font-light transition-all active:scale-95 flex items-center justify-center h-16
               ${btn === '=' 
                 ? 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-600/40' 
                 : ['+','-','x','÷'].includes(btn)
                    ? 'bg-gray-800 text-purple-300 hover:bg-gray-700'
                    : 'bg-black/40 border border-gray-800 hover:bg-white/5 text-gray-200'
               }
             `}
           >
             {btn === '=' ? <Equal /> : btn}
           </button>
        ))}
      </div>
    </div>
  );
};

export default FluxCalc;
