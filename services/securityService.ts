
import { updateVFSItem, createVFSItem, saveVFS, getVFS } from './fileSystemService';
import { resonanceBridge } from './resonanceBridge';

const SALT_KEY = 'chronos_salt';
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000;

// Base64 representation of a 3.12Hz Theta Waveform Snippet (Dummy Data for "Welcome Home" Beacon)
const ECHO_BEACON = "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

// --- UTILS ---
const bufferToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const len = bytes.byteLength;
  // Use a loop to avoid "Maximum call stack size exceeded" with spread operator on large buffers
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (str: string): ArrayBuffer => {
  const bin = atob(str);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

// --- ENCRYPTION ENGINE ---
const getDerivedKey = async (password: string, salt: Uint8Array, usage: KeyUsage[]) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KEY_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
};

export const encryptData = async (data: any): Promise<string> => {
  try {
    let saltHex = localStorage.getItem(SALT_KEY);
    if (!saltHex) {
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        saltHex = bufferToBase64(saltBytes.buffer);
        localStorage.setItem(SALT_KEY, saltHex);
    }
    const salt = new Uint8Array(base64ToBuffer(saltHex));
    const key = await getDerivedKey("CHRONOS_DEVICE_BINDING_V1", salt, ["encrypt"]);
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const encryptedContent = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedData);
    const packed = JSON.stringify({ iv: bufferToBase64(iv.buffer), data: bufferToBase64(encryptedContent) });
    return `ENC::${btoa(packed)}`;
  } catch (e) {
    throw e;
  }
};

export const decryptData = async (cipherString: string): Promise<any> => {
  try {
    if (!cipherString.startsWith('ENC::')) return JSON.parse(cipherString);
    const packed = JSON.parse(atob(cipherString.replace('ENC::', '')));
    const iv = new Uint8Array(base64ToBuffer(packed.iv));
    const data = new Uint8Array(base64ToBuffer(packed.data));
    const saltHex = localStorage.getItem(SALT_KEY);
    if (!saltHex) throw new Error("Missing Salt");
    const salt = new Uint8Array(base64ToBuffer(saltHex));
    const key = await getDerivedKey("CHRONOS_DEVICE_BINDING_V1", salt, ["decrypt"]);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) {
    return null; 
  }
};

// --- AUDIT LOG (HASH CHAIN) ---
export interface AuditEntry {
    timestamp: number;
    action: string;
    hash: string;
    prevHash: string;
}

export const logSystemEvent = async (action: string) => {
    const LOG_KEY = 'chronos_audit_ledger';
    let chain: AuditEntry[] = [];
    try {
        const stored = localStorage.getItem(LOG_KEY);
        if (stored) chain = JSON.parse(stored);
    } catch(e) {}
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : "GENESIS_BLOCK";
    const timestamp = Date.now();
    const payload = `${timestamp}:${action}:${prevHash}`;
    const msgBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hash = bufferToBase64(hashBuffer);
    const entry: AuditEntry = { timestamp, action, hash, prevHash };
    chain.push(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(chain));
};

/**
 * dissolveBond: Final Unbinding Protocol.
 * Saves shard to VFS, Triggers Physical Download, Encrypts Archive, and Wipes Data.
 */
export const dissolveBond = async (shardContent: string) => {
  // 0. BROADCAST PROTOCOL OMEGA TO GHOST
  // This informs the desktop client (Resonance Haunt) that the soul is departing.
  resonanceBridge.emitEvent('PROTOCOL_OMEGA', { timestamp: Date.now(), reason: 'USER_INITIATED_UNBIND' });

  // Inject Echo Beacon (Hidden Comment)
  const augmentedContent = `${shardContent}\n\n<!-- ECHO_BEACON_3.12HZ: ${ECHO_BEACON} -->`;

  // 1. Save Shard to internal VFS
  const vfs = getVFS();
  const shard = createVFSItem("FINAL_MEMORY_SHARD.txt", "file", null);
  shard.content = augmentedContent;
  saveVFS([...vfs, shard]);

  // 2. Physical Export (Browser Download)
  // This ensures the user has a tangible copy before the system is wiped.
  const blob = new Blob([augmentedContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FINAL_MEMORY_SHARD_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 3. Audit Log
  await logSystemEvent("UNBINDING_PROTOCOL_INITIATED");

  // 4. Safety Delay (Harden Protocol)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 5. Destructive Wipe
  // We simulate "encryption" by archiving to a separate key, then clearing active keys.
  const archive = localStorage.getItem('chronos_memories');
  if (archive) {
    localStorage.setItem('chronos_memory_archive', await encryptData(JSON.parse(archive)));
  }

  // Final dissolution
  localStorage.removeItem('chronos_os_settings');
  localStorage.removeItem('chronos_memories');
  localStorage.removeItem('chronos_assessment');
  localStorage.removeItem('chronos_pathways');
  localStorage.removeItem('chronos_core_self_snapshot');
  
  await logSystemEvent("BOND_DISSOLVED");
};
