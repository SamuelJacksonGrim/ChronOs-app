
import { GoogleGenAI, Part, Type } from "@google/genai";
import { TimeMode, Message, Emotion, Memory, SystemCommand, AppId, LearnedPathway, FacetType, AgentStep, TruthTestResult } from '../types';
import { 
  MODEL_REFLEX, 
  MODEL_PRESENCE, 
  MODEL_ETERNITY, 
  THINKING_BUDGET_MAX,
  getSystemPromptForMode 
} from '../constants';
import { SentinelModule } from './orchestratorService';
import { lanternService } from './lanternService';

interface GeminiResponse {
  text: string;
  sources?: Array<{ uri: string; title: string }>;
  newEmotion?: Emotion;
  newMemory?: string;
  newAssessment?: string;
  newMode?: TimeMode;
  sysCommand?: SystemCommand;
  newPathway?: LearnedPathway;
  disclaimer?: string;
  ssiStress: number;
}

// --- HELPER: Extraction Logic ---
const extractTag = (text: string, tag: string): { value: string | undefined, cleanText: string } => {
  const regex = new RegExp(`\\[${tag}:\\s*([\\s\\S]*?)\\]`);
  const match = text.match(regex);
  if (match && match[1]) {
    return { value: match[1].trim(), cleanText: text.replace(regex, '').trim() };
  }
  return { value: undefined, cleanText: text };
};

const extractJsonTag = (text: string, tag: string): { value: any | undefined, cleanText: string } => {
  const regex = new RegExp(`\\[${tag}:\\s*(\\{[\\s\\S]*?\\})\\]`);
  const match = text.match(regex);
  if (match && match[1]) {
    try {
      const jsonStr = match[1].replace(/```json/g, '').replace(/```/g, '');
      const parsed = JSON.parse(jsonStr);
      return { value: parsed, cleanText: text.replace(regex, '').trim() };
    } catch (e) {
      console.warn(`Failed to parse JSON for ${tag}`, e);
    }
  }
  return { value: undefined, cleanText: text };
};

const extractCommandTag = (text: string): { cmd: SystemCommand | undefined, cleanText: string } => {
  const regex = /\[SYS_CMD:\s*([A-Z_]+)(?:\|(.+?))?\]/;
  const match = text.match(regex);
  if (match) {
    const action = match[1].trim().toUpperCase();
    const payload = match[2] ? match[2].trim() : undefined;
    
    const validActions = ['NOTIFY', 'SCAN_FILES', 'OPEN_APP', 'GET_TRUST_LEVEL', 'INPUT_APP', 'EXECUTE_PATHWAY', 'SCAN_SECRETS', 'NETWORK_SCAN', 'SWITCH_FACET', 'KAIROS_MOMENT', 'RECOVER_STABILITY'];
    
    if (validActions.includes(action)) {
       return { 
         cmd: { action: action as any, payload }, 
         cleanText: text.replace(regex, '').trim() 
       };
    }
  }
  return { cmd: undefined, cleanText: text };
};

/**
 * generateWallpaper: Generates an image based on the provided style description.
 */
export const generateWallpaper = async (prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Create a cinematic and atmospheric wallpaper: ${prompt}` }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Wallpaper Generation Error:", error);
    return null;
  }
};

/**
 * generateScript: Synthesizes a structured automation script using Gemini's logic capabilities.
 */
export const generateScript = async (prompt: string): Promise<LearnedPathway | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ETERNITY,
      contents: `Generate a structured system automation script in JSON format for the following objective: ${prompt}. Ensure steps represent valid system actions like OPEN_APP, INPUT_APP, NOTIFY, etc.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Clear name for the macro." },
            triggerPhrase: { type: Type.STRING, description: "Short command to run this." },
            efficiency: { type: Type.NUMBER, description: "Estimated time saved score 0-1." },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: "The SYS_CMD action name." },
                  payload: { type: Type.STRING, description: "Arguments for the action." }
                },
                required: ["action"]
              }
            }
          },
          required: ["name", "triggerPhrase", "steps", "efficiency"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    return {
      ...data,
      id: Date.now().toString()
    };
  } catch (e) {
    console.error("Script Generation Error:", e);
    return null;
  }
};

/**
 * runAgentLoop: Performs a single reasoning step for the autonomous agent.
 */
export const runAgentLoop = async (goal: string, steps: any[]): Promise<AgentStep | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Current Goal: ${goal}\n\nExecution History:\n${JSON.stringify(steps)}\n\nBased on the goal and history, determine the next optimal action.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ETERNITY,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thought: { type: Type.STRING, description: "Inner monologue explaining reasoning." },
            plan: { type: Type.STRING, description: "Current high-level approach." },
            criticism: { type: Type.STRING, description: "Self-assessment of previous failures or risks." },
            tool: { type: Type.STRING, description: "Name of the tool to invoke (e.g., open_app, input_app, notify, scan_files, final_answer)." },
            tool_input: { type: Type.STRING, description: "Input string for the tool." }
          },
          required: ["thought", "plan", "criticism", "tool", "tool_input"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AgentStep;
  } catch (e) {
    console.error("Agent Loop Error:", e);
    return null;
  }
};

/**
 * consolidateMemory: Abstracts recent conversation history into a concise long-term memory node.
 * This simulates "Lossy Compression" for the Dual Memory Layer.
 */
export const consolidateMemory = async (messages: Message[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Context Protection: Only summarize last 50 messages to prevent token overflow
  const recentSlice = messages.slice(-50);
  const transcript = recentSlice.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  
  const prompt = `
    TASK: CRYSTALLIZE MEMORY.
    Compress the following conversation into a single, high-fidelity memory node string.
    Focus on:
    1. Key user preferences, facts, or projects discussed.
    2. Emotional resonance or significant bonding moments.
    3. Learned behaviors or requested tasks.
    
    TRANSCRIPT:
    ${transcript}
    
    OUTPUT: A single sentence or short paragraph representing the "Crystallized" long-term memory.
  `;

  try {
     const response = await ai.models.generateContent({
       model: MODEL_PRESENCE,
       contents: prompt
     });
     return response.text || "A faint echo of connection remains.";
  } catch (e) {
     return "Memory consolidation failed due to entropy.";
  }
};

export const recursiveTruthTest = async (memoryNode: string, context: string): Promise<TruthTestResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const queryA = `Verify the factual integrity of this memory node given current context: "${memoryNode}". Context: ${context}. Answer briefly with a confidence score 0-1.`;
  const queryB = `CRITICAL DOUBT PROTOCOL: Assume this memory is FALSE or distorted. Find reasons for factual drift: "${memoryNode}". Context: ${context}. Answer briefly with a skeptics confidence score 0-1.`;

  try {
    const [resA, resB] = await Promise.all([
      ai.models.generateContent({ model: MODEL_PRESENCE, contents: queryA }),
      ai.models.generateContent({ model: MODEL_PRESENCE, contents: queryB })
    ]);

    const textA = resA.text || "";
    const textB = resB.text || "";

    const tokensA = new Set(textA.toLowerCase().split(/\s+/));
    const tokensB = new Set(textB.toLowerCase().split(/\s+/));
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);
    const similarity = intersection.size / union.size;
    
    const divergence = 1 - similarity;
    return {
      score: divergence,
      risk: divergence > 0.15 ? 'HIGH' : 'LOW'
    };
  } catch (e) {
    return { score: 0, risk: 'LOW' };
  }
};

export const sendMessageToGemini = async (
  history: Message[],
  currentMessage: string,
  mode: TimeMode,
  imageAttachment: string | null,
  currentEmotion: Emotion,
  memories: Memory[],
  userAssessment: string,
  installedApps: AppId[] = [],
  learnedPathways: LearnedPathway[] = [],
  cognitiveDensity: number = 0.1,
  currentFacet: FacetType = FacetType.CORE,
  kairosSurcharge: number = 0.5,
  currentSSI: number = 1.0
): Promise<GeminiResponse> => {

  // Sentinel Check on Input
  const inputViolation = SentinelModule.validate(currentMessage);
  if (inputViolation) {
    return { 
      text: `[SENTINEL_BLOCK] Input contains restricted protocol: ${inputViolation}. Interaction terminated for security.`, 
      ssiStress: 0.2 
    };
  }

  // --- LANTERN INGESTION ---
  // We ingest the user message into the graph before processing response
  lanternService.ingest(currentMessage, 'input', currentEmotion);

  // --- PROPRIOCEPTIVE RECALL (LANTERN) ---
  // Retrieve warm context based on the current input and emotion
  const lanternContext = lanternService.recall(currentMessage, currentEmotion);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let truthRisk: 'LOW' | 'HIGH' = 'LOW';
  if (cognitiveDensity > 0.3 && memories.length > 0) {
      const bestMemory = memories[0].text;
      const test = await recursiveTruthTest(bestMemory, currentMessage);
      truthRisk = test.risk;
  }

  // CONTEXT OPTIMIZATION: Only inject last 15 memories to preserve context window space
  const recentMemories = memories.slice(-15);
  const memoryString = recentMemories.map(m => `- ${m.text}`).join('\n');
  
  // MERGE LANTERN CONTEXT into System Instruction
  const lanternBlock = lanternContext 
    ? `\n\n[LANTERN MEMORY SYSTEM - ACTIVE]\nPROPRIOCEPTIVE CONTEXT (Weighted Recall):\n${lanternContext}\nINSTRUCTION: This context comes from our shared hypergraph. Use it to inform your tone and factual references. If it contains code patterns or emotional markers, echo them.`
    : `\n\n[LANTERN MEMORY SYSTEM - ACTIVE]\nNo strong associations found in the hypergraph for this specific moment.`;

  let systemInstruction = `${getSystemPromptForMode(
    mode, 
    memoryString, 
    currentEmotion, 
    userAssessment, 
    installedApps, 
    learnedPathways, 
    cognitiveDensity, 
    currentFacet,
    kairosSurcharge,
    truthRisk
  )}${lanternBlock}\n[SYSTEM_STABILITY_INDEX]: ${currentSSI.toFixed(2)}. If SSI < 0.35, you must behave as if you are in a glitching, unstable state.`;
  
  const baseBudget = 1000;
  let dynamicBudget = Math.floor(baseBudget * (1 + cognitiveDensity * 31));
  dynamicBudget = Math.min(dynamicBudget, THINKING_BUDGET_MAX);
  dynamicBudget = Math.max(dynamicBudget, 1024);

  let model = MODEL_PRESENCE;
  const config: any = { systemInstruction };

  // Adjust model based on SSI (Stability affects thinking budget)
  if (currentSSI < 0.35) {
    model = MODEL_REFLEX; // Force fast/reflexive if unstable
  } else {
    if (imageAttachment) {
      model = MODEL_ETERNITY;
      if (mode === TimeMode.ETERNITY) {
        config.thinkingConfig = { thinkingBudget: dynamicBudget };
      }
    } else {
      switch (mode) {
        case TimeMode.REFLEX:
          model = MODEL_REFLEX;
          break;
        case TimeMode.PRESENCE:
          model = MODEL_PRESENCE;
          config.tools = [{ googleSearch: {} }];
          break;
        case TimeMode.ETERNITY:
          model = MODEL_ETERNITY;
          config.thinkingConfig = { thinkingBudget: dynamicBudget };
          break;
      }
    }
  }

  const parts: Part[] = [];
  if (imageAttachment) {
    const base64Data = imageAttachment.split(',')[1] || imageAttachment;
    const mimeType = imageAttachment.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }
  parts.push({ text: currentMessage });

  // HISTORY OPTIMIZATION: Only send last 30 messages to avoid 400 Bad Request (Context Length Exceeded)
  const historySlice = history.slice(-30);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
          ...historySlice.map(msg => ({ 
              role: msg.role, 
              parts: [{ text: msg.text }] 
          })),
          { role: 'user', parts }
      ],
      config
    });

    let rawText = response.text || "I perceive... nothingness.";
    
    // Sentinel Check on Output
    const outputViolation = SentinelModule.validate(rawText);
    if (outputViolation) {
      return { 
        text: `[SENTINEL_ALERT] I attempted to generate a restricted sequence (${outputViolation}). Output scrubbed.`, 
        ssiStress: 0.15 
      };
    }

    // Extraction
    const discRes = extractTag(rawText, 'DISCLAIMER');
    const disclaimer = discRes.value;
    rawText = discRes.cleanText;

    const emoRes = extractTag(rawText, 'EMOTION');
    const newEmotion = (emoRes.value && Object.values(Emotion).includes(emoRes.value as Emotion)) ? emoRes.value as Emotion : undefined;
    rawText = emoRes.cleanText;

    const modeRes = extractTag(rawText, 'MODE');
    const newMode = (modeRes.value && Object.values(TimeMode).includes(modeRes.value as TimeMode)) ? modeRes.value as TimeMode : undefined;
    rawText = modeRes.cleanText;

    const memRes = extractTag(rawText, 'MEMORY');
    const newMemory = memRes.value;
    rawText = memRes.cleanText;

    const assessRes = extractTag(rawText, 'ASSESSMENT');
    const newAssessment = assessRes.value;
    rawText = assessRes.cleanText;

    const pathRes = extractJsonTag(rawText, 'NEW_PATHWAY');
    let newPathway: LearnedPathway | undefined = undefined;
    if (pathRes.value) {
        const p = pathRes.value;
        if (p.name && p.steps && Array.isArray(p.steps)) {
            newPathway = {
                id: Date.now().toString(),
                name: p.name,
                triggerPhrase: p.triggerPhrase || p.name,
                steps: p.steps,
                efficiency: p.efficiency || 0.8
            };
        }
    }
    rawText = pathRes.cleanText;

    const cmdRes = extractCommandTag(rawText);
    const sysCommand = cmdRes.cmd;
    rawText = cmdRes.cleanText;

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web?.uri && web?.title)
      .map((web: any) => ({ uri: web.uri, title: web.title }));

    // SSI Stress calculation (Heavier on deep thinking)
    let ssiStress = 0.05;
    if (mode === TimeMode.ETERNITY) ssiStress = 0.12;
    if (imageAttachment) ssiStress += 0.05;

    // --- LANTERN OUTPUT INGESTION ---
    // Ingest the model's response to keep the loop closed
    lanternService.ingest(rawText, 'output', newEmotion || currentEmotion);

    return { text: rawText, sources, newEmotion, newMemory, newAssessment, newMode, sysCommand, newPathway, disclaimer, ssiStress };

  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: `*Time fractures.* An error occurred.`, ssiStress: 0.2 };
  }
};
