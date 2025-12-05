
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, ChevronLeft } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const EchoNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('chronos_echo_notes');
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load notes", e);
    }
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('chronos_echo_notes', JSON.stringify(updatedNotes));
  };

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Echo',
      content: '',
      updatedAt: Date.now()
    };
    saveNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleUpdate = (id: string, field: 'title' | 'content', value: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, [field]: value, updatedAt: Date.now() } : n);
    saveNotes(updated);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl flex text-white overflow-hidden">
      {/* Sidebar List */}
      <div className={`w-full md:w-64 border-r border-gray-800 flex flex-col ${activeNoteId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
           <h2 className="font-display text-sm tracking-widest text-gray-400">ECHO INDEX</h2>
           <button onClick={handleCreate} className="p-2 bg-cyan-900/30 text-cyan-400 rounded hover:bg-cyan-900/50 transition-colors">
             <Plus size={16} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {notes.length === 0 && (
             <div className="p-4 text-center text-xs text-gray-600 italic">No echoes recorded.</div>
           )}
           {notes.map(note => (
             <div 
               key={note.id}
               onClick={() => setActiveNoteId(note.id)}
               className={`p-3 rounded-lg cursor-pointer transition-all group relative ${activeNoteId === note.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'}`}
             >
               <div className="font-medium truncate pr-6">{note.title || 'Untitled Echo'}</div>
               <div className="text-[10px] opacity-50 mt-1">
                 {new Date(note.updatedAt).toLocaleDateString()}
               </div>
               <button 
                 onClick={(e) => handleDelete(e, note.id)}
                 className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/50 hover:text-red-400 rounded text-gray-500 transition-all"
               >
                 <Trash2 size={12} />
               </button>
             </div>
           ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className={`flex-1 flex-col bg-black/20 ${activeNoteId ? 'flex' : 'hidden md:flex'}`}>
        {activeNote ? (
          <>
            <div className="h-14 border-b border-gray-800 flex items-center px-4 gap-4">
              <button onClick={() => setActiveNoteId(null)} className="md:hidden text-gray-400">
                <ChevronLeft />
              </button>
              <input 
                value={activeNote.title}
                onChange={(e) => handleUpdate(activeNote.id, 'title', e.target.value)}
                className="bg-transparent text-lg font-bold focus:outline-none w-full text-white placeholder-gray-600"
                placeholder="Title..."
              />
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Save size={12} />
                Saved
              </div>
            </div>
            <textarea 
              value={activeNote.content}
              onChange={(e) => handleUpdate(activeNote.id, 'content', e.target.value)}
              className="flex-1 w-full bg-transparent p-6 resize-none focus:outline-none text-gray-300 leading-relaxed font-mono text-sm"
              placeholder="Capture thought stream..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
             <FileText size={48} className="opacity-20" />
             <p className="text-sm">Select an echo to manifest.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EchoNotes;
