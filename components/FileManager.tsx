

import React, { useState, useEffect } from 'react';
import { 
  Folder, FileText, Trash2, ArrowLeft, Plus, 
  Search, Home, Save, X, CornerUpLeft, Info, FileCode, FileJson, FileType
} from 'lucide-react';
import { VFSItem } from '../types';
import { getVFS, saveVFS, createVFSItem, deleteVFSItem, restoreVFSItem, updateVFSItem } from '../services/fileSystemService';

interface FileManagerProps {
  onLogAction?: (details: string) => void;
}

const FileManager: React.FC<FileManagerProps> = ({ onLogAction }) => {
  const [items, setItems] = useState<VFSItem[]>([]);
  const [currentPath, setCurrentPath] = useState<VFSItem[]>([]); 
  const [viewMode, setViewMode] = useState<'root' | 'trash'>('root');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFile, setEditingFile] = useState<VFSItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [infoItemId, setInfoItemId] = useState<string | null>(null);
  
  // Dynamic Metadata State
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');

  // --- DATA LOADING ---
  const refreshVFS = () => {
    setItems(getVFS());
  };

  useEffect(() => {
    refreshVFS();
    const interval = setInterval(refreshVFS, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- COMPUTED STATE ---
  const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;

  const filteredItems = items.filter(item => {
    if (viewMode === 'trash') return item.inTrash;
    if (item.inTrash) return false;
    if (searchQuery.trim()) return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return item.parentId === currentFolderId;
  });

  const metadataItem = items.find(i => i.id === infoItemId);

  // --- ACTIONS ---
  const handleNavigate = (folder: VFSItem) => {
    setCurrentPath([...currentPath, folder]);
    setSearchQuery('');
    onLogAction?.(`Navigated to folder: ${folder.name}`);
  };

  const handleNavigateUp = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
      onLogAction?.('Navigated up');
    }
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:", "New Folder");
    if (name) {
      const newItem = createVFSItem(name, 'folder', currentFolderId);
      saveVFS([...items, newItem]);
      refreshVFS();
      onLogAction?.(`Created folder: ${name}`);
    }
  };

  const handleCreateFile = () => {
    const name = prompt("Enter file name:", "untitled.txt");
    if (name) {
      const newItem = createVFSItem(name, 'file', currentFolderId);
      saveVFS([...items, newItem]);
      refreshVFS();
      handleOpenFile(newItem);
      onLogAction?.(`Created file: ${name}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (viewMode === 'trash') {
      if (confirm("Permanently delete this item?")) {
        deleteVFSItem(id, true);
        refreshVFS();
      }
    } else {
      deleteVFSItem(id, false);
      refreshVFS();
    }
  };

  const handleRestore = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    restoreVFSItem(id);
    refreshVFS();
  };

  const handleOpenFile = (file: VFSItem) => {
    setEditingFile(file);
    setFileContent(file.content || '');
    onLogAction?.(`Opened file: ${file.name}`);
  };

  const handleSaveFile = () => {
    if (editingFile) {
      updateVFSItem(editingFile.id, { content: fileContent });
      setEditingFile(null);
      refreshVFS();
      onLogAction?.(`Saved file: ${editingFile.name}`);
    }
  };

  // --- METADATA ---
  const handleAddMetadata = () => {
     if (!metadataItem || !newMetaKey.trim()) return;
     updateVFSItem(metadataItem.id, {
         metadata: { ...metadataItem.metadata, [newMetaKey.trim()]: newMetaValue.trim() }
     });
     setNewMetaKey('');
     setNewMetaValue('');
     refreshVFS();
  };

  const handleDeleteMetadata = (key: string) => {
      if (!metadataItem) return;
      const newMeta = { ...metadataItem.metadata };
      delete newMeta[key];
      updateVFSItem(metadataItem.id, { metadata: newMeta });
      refreshVFS();
  };

  const handleEditMetadata = (key: string, value: string) => {
      setNewMetaKey(key);
      setNewMetaValue(value);
  }

  const getFileIcon = (name: string) => {
      if (name.endsWith('.json')) return <FileJson size={48} className="text-yellow-600 group-hover:text-yellow-400 transition-colors" />;
      if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.tsx')) return <FileCode size={48} className="text-blue-600 group-hover:text-blue-400 transition-colors" />;
      if (name.endsWith('.md')) return <FileType size={48} className="text-purple-600 group-hover:text-purple-400 transition-colors" />;
      return <FileText size={48} className="text-gray-600 group-hover:text-gray-400 transition-colors" />;
  }

  // --- RENDER ---
  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl flex flex-col text-gray-200 relative overflow-hidden">
      
      {/* HEADER */}
      <div className="h-14 border-b border-gray-800 bg-black/20 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setCurrentPath([]); setViewMode('root'); }}
            className={`p-2 rounded hover:bg-white/10 ${viewMode === 'root' && currentPath.length === 0 ? 'text-cyan-400' : 'text-gray-400'}`}
          >
            <Home size={18} />
          </button>
          
          <div className="flex items-center gap-1 text-sm font-mono text-gray-400">
             <span className="opacity-50">/</span>
             {currentPath.map((folder, idx) => (
                <React.Fragment key={folder.id}>
                  <button onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))} className="hover:text-cyan-400 hover:underline">
                    {folder.name}
                  </button>
                  <span className="opacity-50">/</span>
                </React.Fragment>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search..."
                 className="bg-black/50 border border-gray-700 rounded-full py-1.5 pl-8 pr-4 text-xs focus:border-cyan-500 focus:outline-none w-48 transition-all"
              />
           </div>
           <div className="h-6 w-px bg-gray-700 mx-1"></div>
           <button onClick={handleCreateFolder} disabled={viewMode === 'trash'} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30"><Folder size={18} /><Plus size={10} className="absolute top-2 right-2" /></button>
           <button onClick={handleCreateFile} disabled={viewMode === 'trash'} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30"><FileText size={18} /><Plus size={10} className="absolute top-2 right-2" /></button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-800 bg-black/20 flex flex-col p-2 gap-1 hidden md:flex">
           <button onClick={() => { setViewMode('root'); setCurrentPath([]); }} className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm font-medium ${viewMode === 'root' ? 'bg-cyan-900/20 text-cyan-400' : 'hover:bg-white/5 text-gray-400'}`}><Home size={16} /> Home</button>
           <button onClick={() => { setViewMode('trash'); setCurrentPath([]); }} className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm font-medium ${viewMode === 'trash' ? 'bg-red-900/20 text-red-400' : 'hover:bg-white/5 text-gray-400'}`}><Trash2 size={16} /> Trash</button>
           <div className="mt-auto px-4 py-4 text-[10px] text-gray-600 font-mono">{items.length} Objects<br/>VFS Storage</div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 relative">
           {currentPath.length > 0 && !searchQuery && (
              <button onClick={handleNavigateUp} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-400 transition-colors"><ArrowLeft size={14} /> Back</button>
           )}
           {filteredItems.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600"><Folder size={48} className="opacity-20 mb-2" /><p className="text-sm">Directory Empty</p></div>
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredItems.map(item => (
                  <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigate(item) : handleOpenFile(item)} className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-gray-700/50 relative">
                    <div className="relative">
                      {item.type === 'folder' ? <Folder size={48} className="text-cyan-700 group-hover:text-cyan-500 transition-colors" /> : getFileIcon(item.name)}
                      <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 z-10">
                        <button onClick={(e) => { e.stopPropagation(); setInfoItemId(item.id); }} className="p-1 bg-gray-800 text-cyan-400 rounded-full shadow-lg hover:bg-gray-700 hover:scale-110"><Info size={10} /></button>
                        {viewMode === 'trash' ? <button onClick={(e) => handleRestore(e, item.id)} className="p-1 bg-green-900 text-green-400 rounded-full shadow-lg hover:scale-110"><CornerUpLeft size={10} /></button> : null}
                        <button onClick={(e) => handleDelete(e, item.id)} className="p-1 bg-gray-900 text-red-400 rounded-full shadow-lg hover:bg-red-900 hover:scale-110"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <span className="text-xs text-center font-medium truncate w-full px-1">{item.name}</span>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* PROPERTIES PANE */}
      {metadataItem && (
         <div className="absolute inset-y-0 right-0 w-80 bg-slate-900/95 border-l border-gray-800 shadow-2xl p-6 flex flex-col z-40 animate-slide-down">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-lg text-cyan-400">Properties</h2>
                <button onClick={() => setInfoItemId(null)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            
            <div className="space-y-4 text-xs flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 bg-black/40 rounded-lg flex flex-col items-center mb-4">
                    {metadataItem.type === 'folder' ? <Folder size={32} className="text-cyan-600 mb-2"/> : <FileText size={32} className="text-gray-500 mb-2"/>}
                    <span className="font-bold text-sm text-center break-all">{metadataItem.name}</span>
                </div>

                {/* Details */}
                <div className="space-y-2">
                    <div><span className="text-gray-500 uppercase tracking-widest font-bold">ID:</span> <span className="text-gray-300 font-mono ml-2">{metadataItem.id.slice(0, 8)}...</span></div>
                    <div><span className="text-gray-500 uppercase tracking-widest font-bold">Type:</span> <span className="text-gray-300 ml-2">{metadataItem.type}</span></div>
                    <div><span className="text-gray-500 uppercase tracking-widest font-bold">Modified:</span> <span className="text-gray-300 ml-2">{new Date(metadataItem.updatedAt).toLocaleString()}</span></div>
                </div>
                
                <div className="pt-4 border-t border-gray-800">
                    <label className="text-cyan-500 uppercase tracking-widest font-bold mb-3 block">Metadata (Key-Value)</label>
                    
                    <div className="space-y-2 mb-4">
                        {metadataItem.metadata && Object.entries(metadataItem.metadata).map(([k, v]) => (
                            <div key={k} className="flex gap-2 items-center bg-black/40 p-2 rounded group">
                                <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => handleEditMetadata(k, v as string)} title="Click to edit">
                                    <div className="text-[10px] text-cyan-700 font-bold uppercase truncate">{k}</div>
                                    <div className="text-gray-300 truncate">{v}</div>
                                </div>
                                <button onClick={() => handleDeleteMetadata(k)} className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={12}/>
                                </button>
                            </div>
                        ))}
                        {(!metadataItem.metadata || Object.keys(metadataItem.metadata).length === 0) && (
                            <div className="text-gray-600 italic text-center py-2">No metadata keys.</div>
                        )}
                    </div>

                    <div className="space-y-2 bg-gray-800/20 p-2 rounded border border-gray-700/50">
                       <input 
                         placeholder="Key"
                         value={newMetaKey}
                         onChange={(e) => setNewMetaKey(e.target.value)}
                         className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1 focus:border-cyan-500 focus:outline-none mb-1"
                       />
                       <input 
                         placeholder="Value"
                         value={newMetaValue}
                         onChange={(e) => setNewMetaValue(e.target.value)}
                         className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1 focus:border-cyan-500 focus:outline-none"
                       />
                       <button onClick={handleAddMetadata} className="w-full mt-2 py-1 bg-cyan-900/30 text-cyan-400 text-[10px] uppercase font-bold rounded hover:bg-cyan-900/50">
                           {metadataItem.metadata?.[newMetaKey] ? 'Update Field' : 'Add Field'}
                       </button>
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* TEXT EDITOR */}
      {editingFile && (
        <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col animate-fade-in">
           <div className="h-14 border-b border-gray-800 bg-black/20 flex items-center justify-between px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                 {getFileIcon(editingFile.name)}
                 {editingFile.name}
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={handleSaveFile} className="px-3 py-1.5 bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 rounded flex items-center gap-2 text-xs font-bold hover:bg-cyan-900/50"><Save size={14} /> SAVE</button>
                 <button onClick={() => setEditingFile(null)} className="p-2 hover:bg-white/10 rounded text-gray-400"><X size={18} /></button>
              </div>
           </div>
           <textarea 
             value={fileContent}
             onChange={(e) => setFileContent(e.target.value)}
             className="flex-1 bg-transparent p-6 text-gray-300 font-mono text-sm resize-none focus:outline-none leading-relaxed"
             placeholder="Type content here..."
             autoFocus
           />
        </div>
      )}

    </div>
  );
};

export default FileManager;