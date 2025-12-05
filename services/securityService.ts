
// Security Kernel for Chronos OS
// Implements AES-GCM Encryption and Hash-Chained Audit Logs

const SALT_KEY = 'chronos_salt';
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000;

// --- UTILS ---
const bufferToBase64 = (buf: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
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
    // 1. Get/Create Salt
    let saltHex = localStorage.getItem(SALT_KEY);
    if (!saltHex) {
        const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        saltHex = bufferToBase64(saltBytes);
        localStorage.setItem(SALT_KEY, saltHex);
    }
    const salt = new Uint8Array(base64ToBuffer(saltHex));

    // 2. Derive Key (Using a device-specific constant for local storage binding)
    // In a real app, this might come from a user password. Here we bind to the "Device Soul".
    const key = await getDerivedKey("CHRONOS_DEVICE_BINDING_V1", salt, ["encrypt"]);

    // 3. Encrypt
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, encodedData
    );

    // 4. Pack (IV + Ciphertext)
    const packed = JSON.stringify({
        iv: bufferToBase64(iv),
        data: bufferToBase64(encryptedContent)
    });
    
    return `ENC::${btoa(packed)}`; // Prefix to identify encrypted data
  } catch (e) {
    console.error("Encryption Failed:", e);
    throw e;
  }
};

export const decryptData = async (cipherString: string): Promise<any> => {
  try {
    if (!cipherString.startsWith('ENC::')) return JSON.parse(cipherString); // Fallback for legacy plaintext

    const packed = JSON.parse(atob(cipherString.replace('ENC::', '')));
    const iv = new Uint8Array(base64ToBuffer(packed.iv));
    const data = new Uint8Array(base64ToBuffer(packed.data));
    
    const saltHex = localStorage.getItem(SALT_KEY);
    if (!saltHex) throw new Error("Missing Salt");
    const salt = new Uint8Array(base64ToBuffer(saltHex));

    const key = await getDerivedKey("CHRONOS_DEVICE_BINDING_V1", salt, ["decrypt"]);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv }, key, data
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) {
    console.error("Decryption Failed:", e);
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
    
    // Hash
    const msgBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hash = bufferToBase64(hashBuffer);

    const entry: AuditEntry = { timestamp, action, hash, prevHash };
    chain.push(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(chain));
};
