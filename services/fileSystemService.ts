

import { DuplicateGroup, VFSItem } from '../types';

const VFS_KEY = 'chronos_vfs';

export const getVFS = (): VFSItem[] => {
  try {
    const stored = localStorage.getItem(VFS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch(e) { return []; }
};

export const saveVFS = (items: VFSItem[]) => {
  localStorage.setItem(VFS_KEY, JSON.stringify(items));
};

export const createVFSItem = (name: string, type: 'file' | 'folder', parentId: string | null): VFSItem => {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    name,
    type,
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: type === 'file' ? '' : undefined,
    metadata: {}
  };
};

export const deleteVFSItem = (id: string, permanent: boolean = false) => {
  const items = getVFS();
  if (permanent) {
    saveVFS(items.filter(i => i.id !== id && i.parentId !== id));
  } else {
    // Soft delete
    saveVFS(items.map(i => i.id === id ? { ...i, inTrash: true } : i));
  }
};

export const restoreVFSItem = (id: string) => {
    const items = getVFS();
    saveVFS(items.map(i => i.id === id ? { ...i, inTrash: false } : i));
};

export const updateVFSItem = (id: string, updates: Partial<VFSItem>) => {
    const items = getVFS();
    saveVFS(items.map(i => i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i));
};

// --- LEGACY / HOST FS OPS ---
export const scanDirectoryForDuplicates = async (dirHandle: any): Promise<DuplicateGroup[]> => {
  const fileMap = new Map<string, any[]>();
  
  const scan = async (handle: any) => {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const key = `${file.name}_${file.size}`;
        if (!fileMap.has(key)) fileMap.set(key, []);
        fileMap.get(key)?.push(entry);
      } else if (entry.kind === 'directory') {
        await scan(entry);
      }
    }
  };

  await scan(dirHandle);

  const duplicates: DuplicateGroup[] = [];
  fileMap.forEach((handles, key) => {
    if (handles.length > 1) {
      const [name, sizeStr] = key.split('_');
      duplicates.push({ name, size: parseInt(sizeStr, 10), count: handles.length, files: handles });
    }
  });

  return duplicates;
};

export const deleteExtraCopies = async (group: DuplicateGroup) => {
    const [keep, ...remove] = group.files;
    for (const handle of remove) {
        try { await handle.remove(); } catch (e) { console.error("Failed to delete file", e); }
    }
};

// --- SECURITY SCANNER ---
export const scanForSecrets = async (dirHandle: any): Promise<string[]> => {
  const suspiciousFiles: string[] = [];
  const PATTERNS = [
    { name: 'Google API', regex: /AIza[0-9A-Za-z-_]{35}/ },
    { name: 'OpenAI API', regex: /sk-[a-zA-Z0-9]{48}/ },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'Stripe Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
    { name: 'Generic Private Key', regex: /-----BEGIN PRIVATE KEY-----/ }
  ];
  
  const allowedExtensions = new Set(['.txt', '.js', '.ts', '.json', '.env', '.md', '.html', '.css']);

  const scan = async (handle: any, path: string) => {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const ext = '.' + file.name.split('.').pop();
        
        if (allowedExtensions.has(ext) || file.name.startsWith('.')) {
          try {
             // Basic Optimization: Check size before text conversion
             if (file.size < 1024 * 1024) { 
                const text = await file.text();
                for (const pattern of PATTERNS) {
                    if (pattern.regex.test(text)) {
                       suspiciousFiles.push(`${path}/${file.name} (Potential ${pattern.name})`);
                       break; 
                    }
                }
             }
          } catch(e) {}
        }
      } else if (entry.kind === 'directory') {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
            await scan(entry, `${path}/${entry.name}`);
        }
      }
    }
  };

  await scan(dirHandle, '');
  return suspiciousFiles;
};