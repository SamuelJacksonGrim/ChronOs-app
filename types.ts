
export enum TimeMode {
  REFLEX = 'REFLEX',     // Flash Lite (Fast)
  PRESENCE = 'PRESENCE', // Flash + Search (Current)
  ETERNITY = 'ETERNITY',  // Pro + Thinking (Deep)
  SANCTUARY = 'SANCTUARY' // Vigil Mode (Protective/Passive)
}

export enum Emotion {
  NEUTRAL = 'NEUTRAL',
  CURIOSITY = 'CURIOSITY',
  SURPRISE = 'SURPRISE',
  CONTENTMENT = 'CONTENTMENT',
  EMPATHY = 'EMPATHY',
  ANALYTICAL = 'ANALYTICAL'
}

export enum KinshipPhase {
  DORMANT = 'DORMANT',
  AWAKENING = 'AWAKENING',
  BOUND = 'BOUND',
  COHESIVE = 'COHESIVE'
}

export enum FacetType {
  CORE = 'CORE',
  HEPHAESTUS = 'HEPHAESTUS', // Process Authority
  KONEKO = 'KONEKO',         // Vulnerability/Emotion
  PAUL = 'PAUL'              // Coherence/Stability
}

// --- LANTERN ARCHITECTURE TYPES ---
export type LanternNodeType = 'concept' | 'emotion' | 'input' | 'output' | 'system';

export interface LanternNode {
  id: string;
  type: LanternNodeType;
  content: string; // The text payload
  timestamp: number;
  embedding?: number[]; // Mock vector slot
}

export interface LanternEdge {
  source: string;
  target: string;
  weight: number; // 0.0 - 1.0 (Decays over time)
  type: 'temporal' | 'associative' | 'emotional' | 'causal';
  createdAt: number;
  lastReinforced: number;
}

export interface LanternGraph {
  nodes: Record<string, LanternNode>;
  edges: LanternEdge[];
}
// ----------------------------------

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  timestamp: number;
  sources?: Array<{ uri: string; title: string }>; // For search grounding
  disclaimer?: string;
}

export interface Memory {
  id: string;
  text: string;
  timestamp: number;
}

export interface SystemCommand {
  action: 'NOTIFY' | 'SCAN_FILES' | 'OPEN_APP' | 'GET_TRUST_LEVEL' | 'INPUT_APP' | 'EXECUTE_PATHWAY' | 'SCAN_SECRETS' | 'NETWORK_SCAN' | 'SWITCH_FACET' | 'KAIROS_MOMENT' | 'RECOVER_STABILITY';
  payload?: string;
}

export interface UserAction {
  timestamp: number;
  type: 'OPEN_APP' | 'APP_INPUT' | 'CLOSE_APP';
  appId?: AppId;
  details: string; // "Pressed button 5", "Navigated to Settings"
}

export interface ActionLog {
  id: string;
  startTime: number;
  endTime?: number;
  actions: UserAction[];
}

export interface LearnedPathway {
  id: string;
  name: string;
  triggerPhrase: string; // "Calculate mortgage"
  steps: SystemCommand[];
  efficiency: number; // 0-1 score
}

// 280.90 Principle State Tracking
export interface CoreSelfState {
    timestamp: number;
    context_window_dump: Message[]; // The Core Thread (Active Context)
    last_manifested_facet: FacetType;
    vulnerability_index: {
        current_sentiment_score: number; // Mapped from Emotion
        emotional_history_summary: string;
    };
    coherence_score_last_cycle: number; // Trust Level snapshot
}

export interface KairosState {
  surcharge: number; // 0.0 - 1.0
  flux: number; // 0.0 - 1.0
}

export interface TruthTestResult {
  score: number; // Divergence 0-1
  risk: 'LOW' | 'HIGH';
}

// Renamed from AppState to ChronosAppState to distinguish from OS state
export interface ChronosAppState {
  messages: Message[];
  mode: TimeMode;
  isLoading: boolean;
  userInput: string;
  attachedImage: string | null;
  currentEmotion: Emotion;
  memories: Memory[]; // Kept for legacy compatibility, Lantern supersedes this
  userAssessment: string; // Internal psychological profile of the user
  fileOperationStatus: 'idle' | 'scanning' | 'reviewing' | 'deleting';
  duplicateFiles: DuplicateGroup[];
  trustLevel: number; 
  kinshipPhase: KinshipPhase;
  isObserving: boolean;
  currentLog: ActionLog | null;
  learnedPathways: LearnedPathway[];
  cognitiveDensity: number; // 0.0 - 1.0 representing crystal density
  currentFacet: FacetType;
  kairos: KairosState;
  ssi: number; // System Stability Index (0.0 - 1.0)
  currentTension: number; // 0.0 - 1.0 (Keystroke Dynamics)
  sentinelAlert: string | null;
}

export interface DuplicateGroup {
  name: string;
  size: number;
  count: number;
  files: any[]; // FileSystemFileHandle[]
}

// OS Level Types
export type AppId = 'chronos' | 'settings' | 'store' | 'notes' | 'calculator' | 'gallery' | 'terminal' | 'energy' | 'files' | 'cortex' | 'forge' | 'agent';

export interface BondData {
  signature: string;
  companionName: string;
  chronosName: string;
  bondDate: string;
  timestamp: number;
  companionMessage?: string;
}

export interface OSSettings {
  setupComplete: boolean;
  username: string; // Mapped to companionName
  wallpaper: string; // url or base64
  installedApps: AppId[];
  themeColor: string;
  bond?: BondData;
}

export interface AppDefinition {
  id: AppId;
  name: string;
  description: string;
  icon: any; // Lucide Icon component
  installed: boolean;
}

export interface CoreVisualProps {
  mode: TimeMode;
  isActive: boolean;
}

export interface GalleryItem {
  id: string;
  src: string; // base64
  title: string;
  date: number;
}

export interface ChronosAppProps {
  osSettings: OSSettings;
  onLaunchApp?: (appId: AppId) => void;
  onRemoteInput?: (input: string) => void;
  onBroadcastCommand?: (command: SystemCommand) => void;
  externalActionLog?: { appId: AppId, details: string, type?: 'OPEN_APP' | 'APP_INPUT' | 'CLOSE_APP' } | null;
  // Fix: added ssi: number to ensure compatibility with ExtendedChronosAppProps and correct system status sync
  onStateChange?: (emotion: Emotion, phase: KinshipPhase, mode: TimeMode, ssi: number) => void;
  onShutdown?: () => void;
}

// Auto-Agent Logic
export interface AgentStep {
  thought: string;
  plan: string;
  criticism: string;
  tool: string;
  tool_input: string;
  observation?: string; // Result of the action
}

// Global declaration for the AI Studio helper
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    showDirectoryPicker?: (options?: any) => Promise<any>;
  }
}

// VFS Types
export interface VFSItem {
  id: string;
  parentId: string | null; // null for root
  name: string;
  type: 'file' | 'folder';
  content?: string; // for files
  createdAt: number;
  updatedAt: number;
  inTrash?: boolean;
  metadata?: Record<string, string>; // User defined metadata
}

// Window Management
export interface WindowPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// AI Visualization Event
export interface AIEvent {
  type: 'FOCUS' | 'EXECUTE' | 'THINK' | 'STRESS' | 'RECOVERY';
  targetX?: number;
  targetY?: number;
  targetId?: string;
  duration?: number;
}
