
import { GoogleGenAI, Part } from "@google/genai";
import { TimeMode, Message, Emotion, Memory, SystemCommand, AppId, LearnedPathway, FacetType, AgentStep } from '../types';
import { 
  MODEL_REFLEX, 
  MODEL_PRESENCE, 
  MODEL_ETERNITY, 
  THINKING_BUDGET_MAX,
  getSystemPromptForMode 
} from '../constants';

interface GeminiResponse {
  text: string;
  sources?: Array<{ uri: string; title: string }>;
  newEmotion?: Emotion;
  newMemory?: string;
  newAssessment?: string;
  newMode?: TimeMode;
  sysCommand?: SystemCommand;
  newPathway?: LearnedPathway;
}

// --- HELPER: Extraction Logic ---
const extractTag = (text: string, tag: string): { value: string | undefined, cleanText: string } => {
  // Use [\s\S] to match newlines within the tag content
  const regex = new RegExp(`\\[${tag}:\\s*([\\s\\S]*?)\\]`);
  const match = text.match(regex);
  if (match && match[1]) {
    return { value: match[1].trim(), cleanText: text.replace(regex, '').trim() };
  }
  return { value: undefined, cleanText: text };
};

const extractJsonTag = (text: string, tag: string): { value: any | undefined, cleanText: string } => {
  // Capture everything between the braces inside the tag, handling potentially multi-line JSON
  const regex = new RegExp(`\\[${tag}:\\s*(\\{[\\s\\S]*?\\})\\]`);
  const match = text.match(regex);
  if (match && match[1]) {
    try {
      // Remove generic markdown code blocks if present
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
    
    const validActions = ['NOTIFY', 'SCAN_FILES', 'OPEN_APP', 'GET_TRUST_LEVEL', 'INPUT_APP', 'EXECUTE_PATHWAY', 'SCAN_SECRETS', 'NETWORK_SCAN', 'SWITCH_FACET'];
    
    if (validActions.includes(action)) {
       return { 
         cmd: { action: action as any, payload }, 
         cleanText: text.replace(regex, '').trim() 
       };
    }
  }
  return { cmd: undefined, cleanText: text };
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
  currentFacet: FacetType = FacetType.CORE
): Promise<GeminiResponse> => {

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Context Flattening
  const memoryString = memories.map(m => `- ${m.text}`).join('\n');
  const systemInstruction = getSystemPromptForMode(mode, memoryString, currentEmotion, userAssessment, installedApps, learnedPathways, cognitiveDensity, currentFacet);
  
  // Dynamic Budget Calculation (Ported from Python MemoryCrystal.get_thinking_budget)
  // Formula: Base (1000) * (1 + Density * 31) -> Range ~1000 to ~32000
  const baseBudget = 1000;
  let dynamicBudget = Math.floor(baseBudget * (1 + cognitiveDensity * 31));
  dynamicBudget = Math.min(dynamicBudget, THINKING_BUDGET_MAX);
  dynamicBudget = Math.max(dynamicBudget, 1024); // Minimum floor

  // Model Selection
  let model = MODEL_PRESENCE;
  const config: any = { systemInstruction };

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
        // Apply the dynamic budget derived from memory density
        config.thinkingConfig = { thinkingBudget: dynamicBudget };
        break;
    }
  }

  const parts: Part[] = [];
  if (imageAttachment) {
    const base64Data = imageAttachment.split(',')[1] || imageAttachment;
    const mimeType = imageAttachment.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
    parts.push({ inlineData: { mimeType, data: base64Data } });
  }
  parts.push({ text: currentMessage });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts },
      config
    });

    let rawText = response.text || "I perceive... nothingness.";
    
    // --- RESPONSE PARSING ---

    // 1. Emotion
    const emoRes = extractTag(rawText, 'EMOTION');
    const newEmotion = (emoRes.value && Object.values(Emotion).includes(emoRes.value as Emotion)) ? emoRes.value as Emotion : undefined;
    rawText = emoRes.cleanText;

    // 2. Mode
    const modeRes = extractTag(rawText, 'MODE');
    const newMode = (modeRes.value && Object.values(TimeMode).includes(modeRes.value as TimeMode)) ? modeRes.value as TimeMode : undefined;
    rawText = modeRes.cleanText;

    // 3. Memory
    const memRes = extractTag(rawText, 'MEMORY');
    const newMemory = memRes.value;
    rawText = memRes.cleanText;

    // 4. Assessment
    const assessRes = extractTag(rawText, 'ASSESSMENT');
    const newAssessment = assessRes.value; // Can be multi-line
    rawText = assessRes.cleanText;

    // 5. Pathways (JSON)
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

    // 6. System Command
    const cmdRes = extractCommandTag(rawText);
    const sysCommand = cmdRes.cmd;
    rawText = cmdRes.cleanText;

    // 7. Grounding
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web?.uri && web?.title)
      .map((web: any) => ({ uri: web.uri, title: web.title }));

    return { text: rawText, sources, newEmotion, newMemory, newAssessment, newMode, sysCommand, newPathway };

  } catch (error) {
    console.error("Gemini Error:", error);
    if (error instanceof Error && error.message.includes("403")) {
        return { text: `**System Alert (403):** Identity verification failed. API Key Permission Denied.` };
    }
    return { text: `*Time fractures.* An error occurred: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
};

export const generateWallpaper = async (styleDescription: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `A futuristic, abstract, high-quality digital wallpaper. Style: ${styleDescription}. Minimalist, atmospheric, 4k resolution style. No text.`;
  
  const generate = async (model: string, config: any) => {
    const res = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config
    });
    const part = res.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  };

  try {
    // Try Pro First
    return await generate('gemini-3-pro-image-preview', { imageConfig: { aspectRatio: "16:9", imageSize: "2K" } });
  } catch (e) {
    console.warn("Pro Image Gen failed, falling back to Flash", e);
    try {
      // Fallback to Flash
      return await generate('gemini-2.5-flash-image', {});
    } catch (e2) {
      console.error("Flash Image Gen failed", e2);
      return null;
    }
  }
};

export const generateScript = async (description: string): Promise<LearnedPathway | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
    ACT AS: Systems Architect for Chronos OS.
    TASK: Convert this natural language request into a System Automation Script (JSON).
    AVAILABLE COMMANDS: OPEN_APP|<id>, INPUT_APP|<id>|<data>, NOTIFY|<msg>, WAIT|<ms>.
    APP_IDS: calculator, notes, energy, terminal, gallery.
    
    REQUEST: "${description}"
    
    OUTPUT FORMAT: JSON only.
    {
      "name": "Script Name",
      "triggerPhrase": "Trigger Phrase",
      "efficiency": 0.9,
      "steps": [
        { "action": "OPEN_APP", "payload": "calculator" },
        { "action": "INPUT_APP", "payload": "calculator|clear" }
      ]
    }
    `;
  
    try {
      const res = await ai.models.generateContent({
        model: MODEL_PRESENCE,
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' }
      });
      const text = res.text;
      if (text) {
          const parsed = JSON.parse(text);
          return {
              id: Date.now().toString(),
              name: parsed.name,
              triggerPhrase: parsed.triggerPhrase,
              steps: parsed.steps,
              efficiency: parsed.efficiency || 0.8
          };
      }
      return null;
    } catch (e) {
      console.error("Script gen failed", e);
      return null;
    }
  };

// --- AUTONOMOUS AGENT LOOP ---
export const runAgentLoop = async (
  goal: string,
  history: { step: number, thought: string, action: string, observation: string }[]
): Promise<AgentStep | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historyText = history.map(h => `
STEP ${h.step}:
THOUGHT: ${h.thought}
ACTION: ${h.action}
OBSERVATION: ${h.observation}
`).join('\n');

  const systemInstruction = `
  You are an AUTONOMOUS AI AGENT for Chronos OS.
  GOAL: "${goal}"
  
  HISTORY:
  ${historyText}
  
  INSTRUCTIONS:
  1. Analyze the history and the goal.
  2. Decide the next step.
  3. Respond in STRICT JSON format.
  
  AVAILABLE TOOLS:
  - open_app (payload: app_id) -> Opens an app.
  - input_app (payload: data) -> Sends input to active app.
  - notify (payload: message) -> Sends user notification.
  - scan_files (no payload) -> Scans file system.
  - final_answer (payload: summary) -> Task complete.
  
  JSON FORMAT:
  {
    "thought": "Reasoning about what to do next...",
    "plan": "Short bullet list of remaining steps",
    "criticism": "Reflection on previous steps",
    "tool": "tool_name",
    "tool_input": "payload"
  }
  `;

  try {
    const res = await ai.models.generateContent({
      model: MODEL_ETERNITY, // Use Pro for complex reasoning
      contents: { role: 'user', parts: [{ text: "Proceed with the next step." }] },
      config: { 
        systemInstruction,
        responseMimeType: 'application/json' 
      }
    });
    
    if (res.text) {
      return JSON.parse(res.text) as AgentStep;
    }
    return null;
  } catch (e) {
    console.error("Agent Loop Error", e);
    return null;
  }
};
