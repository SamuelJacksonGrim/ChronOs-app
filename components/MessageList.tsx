
import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { Bot, User, Link2, ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: Message[];
  isThinking: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10 custom-scrollbar">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60">
            <p className="font-display text-lg mb-2">CHRONOS ONLINE</p>
            <p className="text-sm max-w-xs">Select a time dilation mode and begin transmission.</p>
        </div>
      )}
      
      {messages.map((msg, idx) => (
        <div 
          key={idx} 
          className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0 border 
            ${msg.role === 'user' 
              ? 'bg-gray-800 border-gray-700 text-gray-300' 
              : 'bg-black/50 border-gray-600 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]'
            }
          `}>
            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
          </div>

          {/* Content Bubble */}
          <div className={`
            max-w-[80%] rounded-2xl p-4 border backdrop-blur-md
            ${msg.role === 'user' 
              ? 'bg-gray-800/80 border-gray-700 text-white rounded-tr-sm' 
              : 'bg-black/40 border-gray-800 text-gray-100 rounded-tl-sm shadow-sm'
            }
          `}>
            {msg.image && (
               <div className="mb-3 rounded-lg overflow-hidden border border-gray-700/50">
                  <img src={msg.image} alt="User attachment" className="max-h-64 object-cover" />
               </div>
            )}
            
            <div className="prose prose-invert prose-sm leading-relaxed">
              <ReactMarkdown 
                components={{
                    a: ({node, ...props}) => (
                        <a {...props} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" />
                    )
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>

            {/* Sources / Grounding */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/50 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 font-display uppercase tracking-wider w-full mb-1">
                   Verified Sources
                </span>
                {msg.sources.map((src, i) => (
                  <a 
                    key={i} 
                    href={src.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50 transition-colors truncate max-w-full"
                  >
                    <Link2 size={12} />
                    <span className="truncate max-w-[150px]">{src.title}</span>
                  </a>
                ))}
              </div>
            )}
            
            <div className="mt-2 text-[10px] uppercase tracking-widest opacity-30 text-right font-display">
              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      ))}

      {isThinking && (
        <div className="flex gap-4">
           <div className="w-10 h-10 rounded-full bg-black/50 border border-gray-600 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.2)] animate-pulse">
            <Bot size={20} />
          </div>
          <div className="bg-black/40 border border-gray-800 rounded-2xl rounded-tl-sm p-4 flex items-center">
             <span className="flex gap-1">
               <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
               <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
               <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
             </span>
             <span className="ml-3 text-xs font-display text-cyan-500 animate-pulse">
                Thinking...
             </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
