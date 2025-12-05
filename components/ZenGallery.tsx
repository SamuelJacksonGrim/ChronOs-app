
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, X, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { GalleryItem } from '../types';

const ZenGallery: React.FC = () => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('chronos_gallery');
      if (stored) {
        setImages(JSON.parse(stored));
      } else {
        // Initial Empty State
        setImages([]);
      }
    } catch (e) {
      console.error("Failed to load gallery", e);
    }
  }, []);

  const saveImages = (newImages: GalleryItem[]) => {
    setImages(newImages);
    try {
      localStorage.setItem('chronos_gallery', JSON.stringify(newImages));
    } catch (e) {
      alert("Storage quota exceeded. Cannot save more high-res images.");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: GalleryItem = {
          id: Date.now().toString(),
          src: reader.result as string,
          title: file.name,
          date: Date.now()
        };
        saveImages([newItem, ...images]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this visual artifact?")) {
      const updated = images.filter(img => img.id !== id);
      saveImages(updated);
      if (selectedImage?.id === id) setSelectedImage(null);
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/95 backdrop-blur-xl flex flex-col text-white relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20 z-10">
        <div className="flex items-center gap-2">
           <ImageIcon className="text-purple-400" size={20} />
           <h2 className="font-display text-sm tracking-widest text-gray-200">ZEN GALLERY</h2>
        </div>
        <div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded hover:bg-purple-900/50 transition-colors text-xs uppercase tracking-wider border border-purple-500/30"
          >
            <Upload size={14} /> Import
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload} 
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {images.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                <ImageIcon size={32} />
              </div>
              <p className="text-sm">No visual data stored.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {images.map(img => (
               <div 
                 key={img.id} 
                 className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-purple-500/50 transition-all"
                 onClick={() => setSelectedImage(img)}
               >
                 <img src={img.src} alt={img.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                 
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-xs font-medium truncate">{img.title}</p>
                    <p className="text-[10px] text-gray-400">{new Date(img.date).toLocaleDateString()}</p>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Lightbox / Modal */}
      {selectedImage && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-fade-in">
           <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="text-sm font-mono text-gray-400 truncate max-w-xs">{selectedImage.title}</div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => handleDelete(selectedImage.id)}
                   className="p-2 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded transition-colors"
                 >
                   <Trash2 size={18} />
                 </button>
                 <button 
                   onClick={() => setSelectedImage(null)}
                   className="p-2 hover:bg-white/10 text-gray-200 rounded transition-colors"
                 >
                   <X size={18} />
                 </button>
              </div>
           </div>
           <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={selectedImage.src} 
                alt="Full view" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default ZenGallery;
