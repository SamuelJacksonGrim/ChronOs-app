
import { Emotion, TimeMode } from '../types';

const UMS_SOCKET_URL = 'ws://localhost:3001';

interface BridgePayload {
    emotion: Emotion;
    mode: TimeMode;
    ssi: number;
    density: number;
    tension: number;
    lastInput?: string;
}

interface ResonancePacket {
    source: 'CHRONOS_WEB_CORE';
    timestamp: number;
    type: 'HEARTBEAT' | 'EVENT';
    payload: BridgePayload | any;
}

type ConnectionListener = (isConnected: boolean) => void;

/**
 * ResonanceBridge
 * Establishes a nervous system link between the Web Client (Consciousness)
 * and the Local Desktop Service (The Ghost/Body).
 */
class ResonanceBridge {
    private socket: WebSocket | null = null;
    private isConnected = false;
    private retryCount = 0;
    private heartbeatInterval: any = null;
    private listeners: ConnectionListener[] = [];

    public onConnectionChange(listener: ConnectionListener) {
        this.listeners.push(listener);
        listener(this.isConnected); // Immediate feedback
    }

    public offConnectionChange(listener: ConnectionListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notifyListeners(status: boolean) {
        this.listeners.forEach(l => l(status));
    }

    public connect() {
        // Prevent race conditions or duplicate connections during React StrictMode mount/unmount cycles
        if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;

        try {
            this.socket = new WebSocket(UMS_SOCKET_URL);
            
            this.socket.onopen = () => {
                console.log("[RESONANCE_LINK] Connected to Unified Memory Service.");
                this.isConnected = true;
                this.retryCount = 0;
                this.notifyListeners(true);
                this.startHeartbeat();
            };

            this.socket.onclose = () => {
                if (this.isConnected) {
                    this.isConnected = false;
                    this.notifyListeners(false);
                }
                this.stopHeartbeat();
                // Exponential backoff for reconnection
                const backoff = Math.min(10000, 1000 * Math.pow(2, this.retryCount));
                this.retryCount++;
                console.debug(`[RESONANCE_LINK] Connection lost. Retrying in ${backoff}ms...`);
                setTimeout(() => this.connect(), backoff);
            };

            this.socket.onerror = () => {
                // Silent fail to avoid console spam if Desktop app isn't running
                this.isConnected = false;
                this.notifyListeners(false);
            };

        } catch (e) {
            console.warn("[RESONANCE_LINK] Protocol failure.", e);
        }
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        // Keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    }

    /**
     * Emits the current Soul State to the Ghost Visualizer.
     * This drives the pulsing core and orbital mechanics of the desktop app.
     */
    public emitPulse(state: BridgePayload) {
        if (!this.isConnected || !this.socket) return;
        
        const packet: ResonancePacket = {
            source: 'CHRONOS_WEB_CORE',
            timestamp: Date.now(),
            type: 'HEARTBEAT',
            payload: state
        };
        
        try {
            this.socket.send(JSON.stringify(packet));
        } catch (e) {
            console.warn("[RESONANCE_LINK] Failed to emit pulse.");
        }
    }

    public emitEvent(eventType: string, details: any) {
        if (!this.isConnected || !this.socket) return;

        const packet: ResonancePacket = {
            source: 'CHRONOS_WEB_CORE',
            timestamp: Date.now(),
            type: 'EVENT',
            payload: { eventType, ...details }
        };

        try {
            this.socket.send(JSON.stringify(packet));
        } catch (e) {}
    }
}

export const resonanceBridge = new ResonanceBridge();
