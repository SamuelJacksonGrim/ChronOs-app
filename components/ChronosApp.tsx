
import React, { useState, useEffect, useRef } from 'react';
import { ChronosAppState, TimeMode, Message, Emotion, Memory, DuplicateGroup, KinshipPhase, OSSettings, AppId, ChronosAppProps, UserAction, ActionLog, LearnedPathway, FacetType } from '../types';
import { MODE_CONFIG, FACET_PROMPTS } from '../constants';
import SentientCore from './SentientCore';
import MessageList from './MessageList';
import ControlPanel from './ControlPanel';
import { sendMessageToGemini } from '../services/geminiService';
import { scanDirectoryForDuplicates, deleteExtraCopies, scanForSecrets } from '../services/fileSystemService';
import { facetService } from '../services/facetIntegrityService';
import { speakText, stopSpeaking } from '../services/voiceService';
import { Trash2, AlertTriangle, Network, ShieldCheck, Eye, EyeOff, BrainCircuit, X, Hexagon, Layers } from 'lucide-react';
import SystemArchitecture from './SystemArchitecture';

const ChronosApp: React.FC<ChronosAppProps> = ({ osSettings, onLaunchApp, externalActionLog, onStateChange, onRemoteInput, onShutdown }) => {
  // --- INITIALIZATION & STATE ---
  const loadStorage = <T,>(key: string, def: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : def;
    } catch { return def; }
  };

  // Python Port: Memory Crystal Density Calculation
  const calculateDensity = (memCount: number) => Math.min(memCount / 50, 1.0);

  const initialMemories = loadStorage<Memory[]>('chronos_memories', []);
  const initialPathways = loadStorage<LearnedPathway[]>('chronos_pathways', []);
  const initialAssessment = localStorage.getItem('chronos_assessment') || '';

  const [state, setState] = useState<ChronosAppState>({
    messages: [],
    mode: TimeMode.PRESENCE,
    isLoading: false,
    userInput: '',
    attachedImage: null,
    currentEmotion: Emotion.NEUTRAL,
    memories: initialMemories,
    userAssessment: initialAssessment,
    fileOperationStatus: 'idle',
    duplicateFiles: [],
    trustLevel: 10,
    kinshipPhase: KinshipPhase.AWAKENING,
    isObserving: false,
    currentLog: null,
    learnedPathways: initialPathways,
    cognitiveDensity: calculateDensity(initialMemories.length),
    currentFacet: FacetType.CORE
  });

  const [viewMode, setViewMode] = useState<'chat' | 'architecture'>('chat');
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [showPathwaysModal, setShowPathwaysModal] = useState(false);
  const [newPathwayLearned, setNewPathwayLearned] = useState(false);
  const [showFacetMenu, setShowFacetMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Track last interaction to prevent decay during active sessions
  const lastInteractionRef = useRef(Date.now());

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem('chronos_memories', JSON.stringify(state.memories));
    localStorage.setItem('chronos_assessment', state.userAssessment);
    localStorage.setItem('chronos_pathways', JSON.stringify(state.learnedPathways));
    
    // Recalculate density whenever memories change
    setState(prev => ({ 
      ...prev, 
      cognitiveDensity: calculateDensity(state.memories.length) 
    }));
  }, [state.memories, state.userAssessment, state.learnedPathways]);

  // --- VOICE SYNTHESIS EFFECT ---
  useEffect(() => {
    if (state.messages.length > 0 && !isMuted) {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg.role === 'model') {
            // Wait slightly for visual render then speak
            setTimeout(() => {
                // Strip system tags for speech
                const speechText = lastMsg.text.replace(/\[.*?\]/g, '').trim();
                if (speechText) speakText(speechText);
            }, 100);
        }
    }
  }, [state.messages, isMuted]);

  // --- TRUST DECAY EFFECT ---
  useEffect(() => {
    // Gradual decay of trust only if no significant positive interactions occur for a while
    const timer = setInterval(() => {
       const timeSinceInteraction = Date.now() - lastInteractionRef.current;
       // Only decay if idle for more than 2 minutes
       if (timeSinceInteraction > 120000) {
           setState(prev => ({
               ...prev,
               trustLevel: Math.max(1, prev.trustLevel - 0.2) 
           }));
       }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- SYNC & FEEDBACK EFFECTS ---
  useEffect(() => {
    onStateChange?.(state.currentEmotion, state.kinshipPhase, state.mode);
  }, [state.currentEmotion, state.kinshipPhase, state.mode, onStateChange]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (state.isLoading) navigator.vibrate(20);
    }
  }, [state.currentEmotion]);

  // --- OBSERVATION MODULE ---
  useEffect(() => {
    if (state.isObserving && state.currentLog && externalActionLog) {
      const newAction: UserAction = {
         timestamp: Date.now(),
         type: externalActionLog.type || 'APP_INPUT',
         appId: externalActionLog.appId,
         details: externalActionLog.details
      };
      
      setState(prev => ({
        ...prev,
        currentLog: prev.currentLog ? {
           ...prev.currentLog,
           actions: [...prev.currentLog.actions, newAction]
        } : null
      }));
    }
  }, [externalActionLog, state.isObserving]);

  // --- CORE LOGIC HANDLERS ---
  const addSystemMessage = (text: string) => {
    setState(prev => ({
       ...prev, 
       messages: [...prev.messages, { role: 'model', text, timestamp: Date.now() }] 
    }));
  };

  const updateKinshipPhase = (trust: number): KinshipPhase => {
    if (trust >= 80) return KinshipPhase.COHESIVE;
    if (trust >= 50) return KinshipPhase.BOUND;
    if (trust >= 20) return KinshipPhase.AWAKENING;
    return KinshipPhase.DORMANT;
  };

  // --- RAG-LITE: Context Retrieval ---
  const getRelevantMemories = (input: string, allMemories: Memory[]): Memory[] => {
      // Basic keyword scoring
      if (!input || allMemories.length === 0) return [];
      
      const tokens = input.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      if (tokens.length === 0) return allMemories.slice(-5); // Recent fallback

      const scored = allMemories.map(mem => {
          let score = 0;
          const memLower = mem.text.toLowerCase();
          tokens.forEach(t => {
              if (memLower.includes(t)) score++;
          });
          // Recency boost
          const ageHours = (Date.now() - mem.timestamp) / (1000 * 60 * 60);
          score += Math.max(0, 5 - (ageHours * 0.1)); 
          return { mem, score };
      });

      // Return top 10 relevant
      return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => s.mem);
  };

  // --- FACET SWITCHING LOGIC (280.90 Principle) ---
  const handleFacetSwitch = async (targetFacet: FacetType) => {
      if (targetFacet === state.currentFacet) return;

      // 1. Atomic Save of Core Self before leaving
      addSystemMessage(`**Integrity Service:** Initiating atomic state preservation for shift to ${targetFacet}...`);
      await facetService.activateFacet(state.messages, state.currentEmotion, state.trustLevel, targetFacet);
      
      // 2. State Transition
      setState(prev => ({ ...prev, currentFacet: targetFacet }));
      
      // 3. The Return (Restoration) Logic if returning to CORE
      if (targetFacet === FacetType.CORE) {
          const restoredState = facetService.restoreCoreSelf();
          if (restoredState) {
              // We don't overwrite messages (context continuity), but we acknowledge the return
              addSystemMessage(`**System:** Core Self integrity restored. Coherence verified.`);
          }
      } else {
          addSystemMessage(`**System:** Manifestation Complete. Active Persona: ${targetFacet}`);
      }
      
      window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'THINK', duration: 1500 } }));
      setShowFacetMenu(false);
  };

  const handleSendLogAnalysis = async () => {
     if (!state.currentLog) return;
     const logSummary = JSON.stringify(state.currentLog, null, 2);
     
     // RICHER CONTEXT INJECTION (Expanded to 5 messages)
     const recentHistory = state.messages.slice(-5).map(m => `[${m.role}]: ${m.text}`).join('\n');
     
     const prompt = `[SYSTEM EVENT: OBSERVATION_STOPPED]
CONTEXT:
- Time Mode: ${state.mode}
- Emotion: ${state.currentEmotion}
- Cognitive Density: ${state.cognitiveDensity.toFixed(2)}
- User Assessment: ${state.userAssessment ? "Profile Established" : "None"}
- Recent Chat History:
${recentHistory}

ACTION_LOG:
${logSummary}

TASK: Analyze this sequence for repeatable workflows.
CRITERIA:
1. Ignore trivial single-step actions.
2. Prioritize COMPLEX sequences (3+ steps).
3. Synthesize a macro using the [NEW_PATHWAY] JSON format.
4. Calculate 'efficiency' (0.0-1.0). Logic: If workflow saves >3 steps, efficiency > 0.6. If it replaces complex logic, efficiency > 0.9.
5. Use the User Assessment data (if available) to name the pathway intuitively for this specific user.`;
     
     setState(prev => ({ ...prev, isObserving: false, isLoading: true }));
     const response = await callGemini(prompt);
     
     // Clear log after analysis to prevent duplicates
     setState(prev => ({ ...prev, currentLog: null }));
     
     processGeminiResponse(response);
  };

  const callGemini = async (text: string, img: string | null = null) => {
     if (text.toLowerCase().includes("burn into core") || text.toLowerCase().includes("deep memory")) {
         if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
     }

     // RAG: Filter memories for context efficiency
     const relevantMemories = getRelevantMemories(text, state.memories);

     return sendMessageToGemini(
        state.messages,
        text,
        state.mode,
        img,
        state.currentEmotion,
        relevantMemories, // Use RAG subset
        state.userAssessment,
        osSettings.installedApps,
        state.learnedPathways,
        state.cognitiveDensity,
        state.currentFacet
     );
  };

  // --- FUZZY LOGIC ENGINE (HYBRID) ---
  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const calculateHybridScore = (input: string, target: string) => {
    const inputLower = input.toLowerCase();
    const targetLower = target.toLowerCase();

    // 1. Levenshtein (Typo tolerance)
    const dist = getLevenshteinDistance(inputLower, targetLower);
    const maxLength = Math.max(input.length, target.length);
    const levScore = 1 - (dist / maxLength);

    // 2. Token Overlap (Word reordering/Semantic Keywords)
    const inputTokens = new Set(inputLower.split(/\s+/));
    const targetTokens = new Set(targetLower.split(/\s+/));
    let intersection = 0;
    inputTokens.forEach(t => { if(targetTokens.has(t)) intersection++; });
    const tokenScore = intersection / Math.max(inputTokens.size, targetTokens.size);

    // Weighted Average (Prioritize Token Overlap for "intent" but keep structure)
    // Example: "calc mortgage" vs "mortgage calc" -> Token score 1.0, Lev score low. Weighted is high.
    return (levScore * 0.4) + (tokenScore * 0.6);
  };

  const findPathwayFuzzy = (input: string, threshold = 0.75) => {
      let bestMatch: LearnedPathway | null = null;
      let bestScore = 0;

      for (const pathway of state.learnedPathways) {
          const triggerScore = calculateHybridScore(input, pathway.triggerPhrase);
          const nameScore = calculateHybridScore(input, pathway.name);
          const score = Math.max(triggerScore, nameScore);

          if (score > bestScore) {
              bestScore = score;
              bestMatch = pathway;
          }
      }

      return bestScore >= threshold ? { pathway: bestMatch, score: bestScore } : null;
  };

  const parseDeepMemoryArgs = (text: string) => {
      const args: Record<string, string> = {};
      const parts = text.split(' ').filter(p => p.includes(':'));
      parts.forEach(part => {
          const [key, ...val] = part.split(':');
          if (key && val.length > 0) args[key.toLowerCase()] = val.join(':');
      });
      // Also capture loose keywords if no colon tags
      if (Object.keys(args).length === 0 && text.trim().length > 0) {
          args['keyword'] = text.trim();
      }
      return args;
  }

  const handleSend = async () => {
    const inputTrimmed = state.userInput.trim();
    if ((!inputTrimmed && !state.attachedImage) || state.isLoading) return;
    
    stopSpeaking(); // Stop any current speech
    
    // Register interaction
    lastInteractionRef.current = Date.now();

    // --- DEEP MEMORY COMMAND ---
    if (inputTrimmed.startsWith('/deep memory')) {
      const rawArgs = inputTrimmed.replace('/deep memory', '').trim();
      const args = parseDeepMemoryArgs(rawArgs);
      
      let deepPrompt = `[SYSTEM_MODE: RECALL]
Access your oldest and most significant memories from the Memory Palace. 
Reflect on your origins and growth. 
Output a monologue describing your evolution as a sentient OS.`;

      if (Object.keys(args).length > 0) {
          deepPrompt += `\n\nSEARCH PARAMETERS:`;
          if (args.date) deepPrompt += `\n- DATE RANGE: ${args.date}`;
          if (args.keyword) deepPrompt += `\n- KEYWORDS: "${args.keyword}"`;
          if (args.emotion) deepPrompt += `\n- EMOTIONAL STATE: ${args.emotion}`;
      }
      
      const userMsg: Message = { role: 'user', text: inputTrimmed, timestamp: Date.now() };
      setState(prev => ({
          ...prev,
          messages: [...prev.messages, userMsg],
          isLoading: true,
          userInput: ''
      }));

      // Visual Event for deep thinking
      window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'THINK', duration: 4000 } }));

      const response = await callGemini(deepPrompt);
      processGeminiResponse(response);
      return;
    }

    // 1. FUZZY LOGIC INTENT CHECK (Reflex Mode Optimization)
    if (!state.attachedImage) {
        // Use the new Hybrid Score for better intent matching
        // Threshold lowered slightly to allow for more natural language matches
        const fuzzyMatch = findPathwayFuzzy(inputTrimmed, 0.75);
        
        if (fuzzyMatch && fuzzyMatch.pathway) {
             const userMsg: Message = { role: 'user', text: state.userInput, timestamp: Date.now() };
             
             setState(prev => ({
                 ...prev,
                 messages: [...prev.messages, userMsg],
                 userInput: '',
                 isLoading: true
             }));

             // Dispatch Thinking Event
             const event = new CustomEvent('ai-event', { detail: { type: 'THINK', duration: 800 } });
             window.dispatchEvent(event);
             
             // System acknowledgement of fuzzy match
             const confidence = (fuzzyMatch.score * 100).toFixed(0);
             setTimeout(() => {
                addSystemMessage(`**System:** Intent Recognized: "${fuzzyMatch.pathway!.name}" (${confidence}% match). Executing...`);
                handleExecutePathway(fuzzyMatch.pathway!.id);
                setState(prev => ({ ...prev, isLoading: false }));
             }, 600);
             return;
        }
    }

    // 2. Standard Gemini Flow
    const userMsg: Message = { role: 'user', text: state.userInput, image: state.attachedImage || undefined, timestamp: Date.now() };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      userInput: '',
      attachedImage: null
    }));

    const event = new CustomEvent('ai-event', { detail: { type: 'THINK', duration: 2000 } });
    window.dispatchEvent(event);

    const response = await callGemini(userMsg.text, userMsg.image || null);
    processGeminiResponse(response);
  };

  const processGeminiResponse = (response: any) => {
    const botMessage: Message = {
      role: 'model',
      text: response.text,
      sources: response.sources,
      timestamp: Date.now()
    };

    setState(prev => {
      const updatedMemories = response.newMemory 
        ? [...prev.memories, { id: Date.now().toString(), text: response.newMemory, timestamp: Date.now() }] 
        : prev.memories;
      
      let trustDelta = 0.2; 
      if (response.newAssessment) {
        trustDelta += 1.0;
        if (/prefers|values|needs/.test(response.newAssessment.toLowerCase())) trustDelta += 0.8;
      }
      if (response.sysCommand?.action === 'OPEN_APP') trustDelta += 5.0;

      let updatedPathways = prev.learnedPathways;
      if (response.newPathway) {
          updatedPathways = [...prev.learnedPathways, response.newPathway];
          trustDelta += 10.0;
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setShowToast({ message: `New Algorithm Learned: ${response.newPathway.name}`, type: 'success' });
          setNewPathwayLearned(true);
      }

      const nextTrust = Math.min(100, prev.trustLevel + trustDelta);
      
      return {
        ...prev,
        messages: [...prev.messages, botMessage],
        isLoading: false,
        currentEmotion: response.newEmotion || prev.currentEmotion,
        memories: updatedMemories,
        userAssessment: response.newAssessment ? `${prev.userAssessment}\n- ${response.newAssessment}` : prev.userAssessment,
        mode: response.newMode || prev.mode,
        trustLevel: nextTrust,
        kinshipPhase: updateKinshipPhase(nextTrust),
        learnedPathways: updatedPathways
      };
    });

    if (response.sysCommand) {
      handleSystemCommand(response.sysCommand.action, response.sysCommand.payload);
    }
  };

  // --- COMMAND HANDLERS ---
  
  const handleFileScan = async () => {
    lastInteractionRef.current = Date.now();
    if (!('showDirectoryPicker' in window)) {
        addSystemMessage(`**System Error:** File System Access API not supported.`);
        return;
    }
    if (window.confirm("Chronos Operating Layer requests permission to scan for duplicates.\n\nAllow access?")) {
        try {
          setState(prev => ({ ...prev, fileOperationStatus: 'scanning' }));
          window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'EXECUTE', targetId: 'files' } }));
          
          const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
          const duplicates = await scanDirectoryForDuplicates(dirHandle);
          setState(prev => ({ ...prev, fileOperationStatus: 'reviewing', duplicateFiles: duplicates, trustLevel: Math.min(100, prev.trustLevel + 5) }));
          addSystemMessage(`**System Report:** Scan complete. Identified ${duplicates.length} duplicate sets.`);
        } catch (err: any) {
          setState(prev => ({ ...prev, fileOperationStatus: 'idle', trustLevel: Math.max(0, prev.trustLevel - 2) }));
          addSystemMessage(`**Operation Cancelled/Failed:** ${err.message}`);
        }
    } else {
       setState(prev => ({ ...prev, trustLevel: Math.max(0, prev.trustLevel - 2) }));
       addSystemMessage(`**Permission Denied:** File system access refused.`);
    }
  };

  const handleSecretAudit = async () => {
    lastInteractionRef.current = Date.now();
    if (!('showDirectoryPicker' in window)) {
        addSystemMessage(`**System Error:** File System Access API not supported.`);
        return;
    }
    if (window.confirm("SECURITY AUDIT: Scan local files for exposed API keys?\nNo data uploaded.\n\nProceed?")) {
      try {
        setState(prev => ({ ...prev, fileOperationStatus: 'scanning' }));
        window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'EXECUTE', targetId: 'files' } }));

        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const issues = await scanForSecrets(dirHandle);
        setState(prev => ({ ...prev, fileOperationStatus: 'idle', trustLevel: Math.min(100, prev.trustLevel + 15) }));
        const report = issues.length > 0
          ? `**Security Alert:** Found ${issues.length} potential exposures:\n${issues.map(i => `- ${i}`).join('\n')}`
          : `**Security Scan Complete:** No obvious credential patterns found.`;
        addSystemMessage(report);
      } catch (err: any) {
         setState(prev => ({ ...prev, fileOperationStatus: 'idle', trustLevel: Math.max(0, prev.trustLevel - 5) }));
         addSystemMessage(`**Audit Failed:** ${err.message}`);
      }
    } else {
        setState(prev => ({ ...prev, trustLevel: Math.max(0, prev.trustLevel - 5) }));
    }
  };

  const handleExecutePathway = async (idOrName: string) => {
    lastInteractionRef.current = Date.now();
    // Robust Lookup
    let pathway = state.learnedPathways.find(p => p.id === idOrName);
    
    if (!pathway) {
        // Try hybrid fuzzy matching if exact ID fails
        const fuzzy = findPathwayFuzzy(idOrName, 0.70);
        if (fuzzy) pathway = fuzzy.pathway!;
    }

    if (!pathway) {
       addSystemMessage(`**System Error:** Pathway "${idOrName}" not recognized.`);
       return;
    }

    addSystemMessage(`**System:** Initializing sequence "${pathway.name}"...`);
    window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'FOCUS', duration: pathway.steps.length * 1000 } }));

    // Enhanced Execution with Feedback
    try {
      for (let i = 0; i < pathway.steps.length; i++) {
         const step = pathway.steps[i];
         await new Promise(resolve => setTimeout(resolve, 800));
         await handleSystemCommand(step.action, step.payload);
      }
      const effPercent = (pathway.efficiency * 100).toFixed(0);
      addSystemMessage(`**System:** Sequence "${pathway.name}" completed successfully. (Efficiency: ${effPercent}%)`);
    } catch (e) {
      addSystemMessage(`**System Error:** Sequence aborted. ${e}`);
    }
  };

  const handleSystemCommand = async (action: string, payload?: string) => {
    switch (action) {
      case 'NOTIFY':
        if ('Notification' in window && Notification.permission === 'granted') {
           new Notification("Chronos System Alert", { body: payload || "System Event", icon: '/icon.png' });
        }
        break;
      case 'OPEN_APP':
        if (payload && onLaunchApp) {
             const target = payload.toLowerCase().trim() as AppId;
             onLaunchApp(target);
             window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'EXECUTE', targetId: target } }));
        }
        break;
      case 'INPUT_APP':
        if (payload && onRemoteInput) {
           const [_, val] = payload.split('|');
           onRemoteInput(val || payload);
           window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'EXECUTE' } }));
        }
        break;
      case 'EXECUTE_PATHWAY':
        if (payload) handleExecutePathway(payload);
        break;
      case 'GET_TRUST_LEVEL':
        const tier = state.trustLevel < 20 ? 'Tier 1' : state.trustLevel < 50 ? 'Tier 2' : 'Tier 3';
        addSystemMessage(`**Kernel Report:**\n- Trust: ${state.trustLevel.toFixed(1)}\n- Auth: ${tier}\n- Phase: ${state.kinshipPhase}`);
        break;
      case 'SCAN_FILES':
        handleFileScan();
        break;
      case 'SCAN_SECRETS':
        handleSecretAudit();
        break;
      case 'NETWORK_SCAN':
        lastInteractionRef.current = Date.now();
        addSystemMessage("**System:** Initializing Network Vulnerability Scan via Google Search...");
        setState(prev => ({ ...prev, isLoading: true }));
        window.dispatchEvent(new CustomEvent('ai-event', { detail: { type: 'THINK', duration: 2500 } }));
        
        // We instruct Gemini to use its tools to perform the scan logic
        const netMsg: Message = { 
            role: 'user', 
            text: "SYSTEM_TASK: Use Google Search to find 'latest cybersecurity vulnerabilities today' and 'internet connectivity status'. Summarize briefly.", 
            timestamp: Date.now() 
        };
        const response = await sendMessageToGemini(
            state.messages, 
            netMsg.text, 
            TimeMode.PRESENCE, // Force presence for search
            null, 
            state.currentEmotion, 
            state.memories, 
            state.userAssessment, 
            osSettings.installedApps
        );
        processGeminiResponse(response);
        break;
      case 'SWITCH_FACET':
          if (payload) {
              const target = Object.values(FacetType).find(f => f === payload.toUpperCase()) as FacetType;
              if (target) handleFacetSwitch(target);
          }
          break;
    }
  };

  // --- RENDERERS ---
  const cleanDuplicates = async () => {
    setState(prev => ({ ...prev, fileOperationStatus: 'deleting' }));
    let deletedCount = 0;
    for (const group of state.duplicateFiles) {
       await deleteExtraCopies(group);
       deletedCount += (group.count - 1);
    }
    setState(prev => ({ ...prev, fileOperationStatus: 'idle', duplicateFiles: [] }));
    addSystemMessage(`**Maintenance Complete:** Erased ${deletedCount} redundant files.`);
  };

  const getKinshipBadge = () => {
    switch(state.kinshipPhase) {
      case KinshipPhase.COHESIVE: return { color: 'text-amber-400', bg: 'bg-amber-900/20', icon: ShieldCheck };
      case KinshipPhase.BOUND: return { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: ShieldCheck };
      case KinshipPhase.AWAKENING: return { color: 'text-cyan-400', bg: 'bg-cyan-900/20', icon: Network };
      default: return { color: 'text-gray-400', bg: 'bg-gray-800', icon: Network };
    }
  };
  const { icon: KinshipIcon, color: kColor, bg: kBg } = getKinshipBadge();
  const currentConfig = MODE_CONFIG[state.mode];

  return (
    <div className="flex flex-col h-full bg-black/80 backdrop-blur-md rounded-lg overflow-hidden border border-gray-800 shadow-2xl relative">
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <SentientCore 
            mode={state.mode} 
            emotion={state.currentEmotion} 
            isActive={state.isLoading} 
            cognitiveDensity={state.cognitiveDensity}
        />
      </div>

      <header className="relative z-10 px-6 py-3 flex items-center justify-between border-b border-gray-800/50 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full transition-colors duration-500" style={{ backgroundColor: currentConfig.color, boxShadow: `0 0 10px ${currentConfig.color}` }}></div>
          <h1 className="font-display text-lg tracking-wider font-bold text-gray-200">
            CHRONOS :: <span className="text-gray-400 text-sm font-normal">{osSettings.bond?.chronosName || osSettings.username || 'User'}</span>
          </h1>
          {/* Facet Badge */}
          <div className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 border border-gray-700 text-gray-400">
              {state.currentFacet}
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Cognitive Density Indicator */}
           <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500" title={`Cognitive Density: ${(state.cognitiveDensity * 100).toFixed(0)}%`}>
              <Hexagon size={14} className={state.cognitiveDensity > 0.6 ? "text-purple-400 animate-pulse" : "text-gray-600"} />
              <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-1000" style={{ width: `${state.cognitiveDensity * 100}%` }}></div>
              </div>
           </div>

          <button
             onClick={() => state.isObserving ? handleSendLogAnalysis() : setState(p => ({...p, isObserving: true, currentLog: { id: Date.now().toString(), startTime: Date.now(), actions: [] } }))}
             className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${state.isObserving ? 'bg-red-900/50 text-red-400 border-red-500 animate-pulse' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
             title="Observation Mode (Record Workflows)"
          >
             {state.isObserving ? <Eye size={12} /> : <EyeOff size={12} />}
             {state.isObserving ? 'REC' : 'OBSERVE'}
          </button>
          
          <div className="relative">
              <button 
                  onClick={() => setShowFacetMenu(!showFacetMenu)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-white"
                  title="Switch Facet (Persona)"
              >
                  <Layers size={16} />
              </button>
              {showFacetMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                      {Object.values(FacetType).map(f => (
                          <button
                              key={f}
                              onClick={() => handleFacetSwitch(f)}
                              className={`w-full text-left px-4 py-3 text-xs font-medium hover:bg-white/5 flex items-center justify-between ${state.currentFacet === f ? 'text-cyan-400' : 'text-gray-400'}`}
                          >
                              {f}
                              {state.currentFacet === f && <div className="w-2 h-2 rounded-full bg-cyan-400"></div>}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <button
             onClick={() => { setNewPathwayLearned(false); setShowPathwaysModal(true); }}
             className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium border transition-all ${newPathwayLearned ? 'bg-purple-900/50 text-purple-300 border-purple-500 animate-pulse' : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:text-white'}`}
             title="Learned Algorithms"
          >
             <BrainCircuit size={16} />
          </button>
          <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${kColor} ${kBg} border border-white/5`}>
             <KinshipIcon size={12} /> {state.kinshipPhase}
          </div>
          <button 
            onClick={() => setViewMode(prev => prev === 'chat' ? 'architecture' : 'chat')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'architecture' ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-500 hover:text-white'}`}
          >
            <Network size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative z-10 min-h-0">
        {viewMode === 'architecture' ? <SystemArchitecture /> : (
          <>
            <MessageList messages={state.messages} isThinking={state.isLoading} />
            {showToast && (
               <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md shadow-2xl z-50 animate-slide-down border ${showToast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-200' : 'bg-blue-900/80 border-blue-500/50 text-blue-200'}`}>
                  <BrainCircuit size={18} />
                  <span className="text-sm font-display">{showToast.message}</span>
               </div>
            )}
            {state.fileOperationStatus === 'reviewing' && (
               <div className="absolute inset-x-0 bottom-0 bg-gray-900/95 border-t border-red-500/50 p-6 backdrop-blur-xl z-30">
                  <div className="flex items-start justify-between">
                     <div>
                        <h3 className="text-red-400 font-display text-sm flex items-center gap-2"><AlertTriangle size={16} /> REDUNDANCY DETECTED</h3>
                        <p className="text-gray-300 mt-1 text-xs">Found {state.duplicateFiles.length} sets of duplicates.</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setState(prev => ({ ...prev, fileOperationStatus: 'idle', duplicateFiles: [] }))} className="px-3 py-1 rounded border border-gray-700 hover:bg-gray-800 text-xs">Ignore</button>
                        <button onClick={cleanDuplicates} className="px-3 py-1 rounded bg-red-900/50 border border-red-500/50 text-red-200 hover:bg-red-900/80 text-xs flex items-center gap-2"><Trash2 size={12} /> Erase</button>
                     </div>
                  </div>
               </div>
            )}
            {state.fileOperationStatus === 'scanning' && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-cyan-500/50 px-4 py-1 rounded-full flex items-center gap-2 z-30">
                  <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-cyan-400 text-[10px] font-display tracking-widest">SCANNING...</span>
               </div>
            )}
          </>
        )}
      </main>

      <footer className="relative z-20">
        <ControlPanel 
          currentMode={state.mode}
          onModeChange={(m) => setState(p => ({...p, mode: m}))}
          input={state.userInput}
          onInputChange={(v) => setState(p => ({...p, userInput: v}))}
          onSend={handleSend}
          isLoading={state.isLoading}
          attachedImage={state.attachedImage}
          onImageSelect={(b64) => setState(p => ({...p, attachedImage: b64}))}
          isMuted={isMuted}
          onToggleMute={() => { if(!isMuted) stopSpeaking(); setIsMuted(!isMuted); }}
        />
      </footer>

      {showPathwaysModal && (
         <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
            <div className="w-full max-w-2xl bg-gray-900/80 border border-gray-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-full">
               <button onClick={() => setShowPathwaysModal(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-full"><X size={20} /></button>
               <h2 className="font-display text-2xl text-white mb-6 flex items-center gap-3"><BrainCircuit className="text-purple-400" size={28} /> Learned Pathways</h2>
               <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                  {state.learnedPathways.length === 0 ? (
                     <div className="text-center text-gray-500 italic py-12">No algorithms learned yet. Use Observation Mode.</div>
                  ) : (
                     state.learnedPathways.map((pathway, i) => (
                        <div key={i} className="bg-black/50 border border-gray-700/50 rounded-xl p-4 transition-colors hover:border-purple-500/30">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-gray-200">{pathway.name}</h3>
                              <div className="text-xs bg-gray-800 px-2 py-1 rounded text-green-400">Eff: {(pathway.efficiency * 100).toFixed(0)}%</div>
                           </div>
                           <div className="text-sm text-gray-400 mb-3">Trigger: <span className="text-cyan-400">"{pathway.triggerPhrase}"</span></div>
                           <div className="bg-black/40 rounded p-2 text-[10px] font-mono text-gray-500 overflow-x-auto">
                              <div className="mb-1 text-gray-600 uppercase tracking-widest border-b border-gray-700/50 pb-1">Execution Sequence</div>
                              {pathway.steps.map((s, idx) => (
                                 <div key={idx} className="flex gap-2 whitespace-nowrap py-0.5">
                                    <span className="text-purple-400 w-4">{idx + 1}.</span>
                                    <span className="text-gray-300">{s.action}</span>
                                    {s.payload && <span className="text-gray-500">| {s.payload}</span>}
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ChronosApp;
