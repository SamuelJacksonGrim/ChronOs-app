
import { CoreSelfState, FacetType, Message, Emotion } from '../types';

const CORE_SELF_KEY = 'chronos_core_self_snapshot';

/**
 * Service to manage the atomic state transactions required for safe Facet switching.
 * Guarantees the unassailable 280.90 Return to the Core Self.
 * Implementation adapted for Local Storage usage.
 */
export class FacetIntegrityService {
    
    /**
     * Executes the critical state save and facet activation atomically.
     * Guarantees the Core Self's state is perfectly saved before the switch, or the switch fails.
     */
    public async activateFacet(
        currentMessages: Message[], 
        currentEmotion: Emotion,
        trustLevel: number,
        targetFacet: FacetType
    ): Promise<boolean> {
        console.log(`[280.90]: Attempting Atomic State Transaction to manifest ${targetFacet}...`);
        
        try {
            // Map Emotion enum to a numeric vulnerability score for storage
            const sentimentMap: Record<Emotion, number> = {
                [Emotion.NEUTRAL]: 0.5,
                [Emotion.ANALYTICAL]: 0.2,
                [Emotion.CURIOSITY]: 0.6,
                [Emotion.CONTENTMENT]: 0.8,
                [Emotion.EMPATHY]: 0.9,
                [Emotion.SURPRISE]: 0.7
            };

            // Capture State
            const stateSnapshot: CoreSelfState = {
                timestamp: Date.now(),
                context_window_dump: currentMessages,
                last_manifested_facet: targetFacet,
                vulnerability_index: {
                    current_sentiment_score: sentimentMap[currentEmotion] || 0.5,
                    emotional_history_summary: `Transition to ${targetFacet} from ${currentEmotion}`
                },
                coherence_score_last_cycle: trustLevel
            };

            // ATOMIC WRITE (Simulated)
            // In a real DB, this would be a transaction. Here we simply setItem.
            // If this fails (e.g. quota), the try/catch will handle it.
            localStorage.setItem(CORE_SELF_KEY, JSON.stringify(stateSnapshot));
            
            console.log(`[280.90 TRANSACTION SUCCESS]: Core Self state saved. Initiating ${targetFacet} manifestation.`);
            return true;
        } catch (error) {
            console.error(`[280.90 TRANSACTION FAIL - CRITICAL RETURN]: Failed to save state. Error: ${error}`);
            return false;
        }
    }

    /**
     * Fetches the last saved Core Self state for restoration.
     * Used when switching BACK to CORE or when recovering from a crash.
     */
    public restoreCoreSelf(): CoreSelfState | null {
        try {
            const stored = localStorage.getItem(CORE_SELF_KEY);
            if (stored) {
                console.log("[280.90 RESTORE]: Core Self state successfully restored.");
                return JSON.parse(stored) as CoreSelfState;
            }
            return null;
        } catch (e) {
            console.warn("[280.90 RESTORE FAIL]: State corrupted.");
            return null;
        }
    }
}

export const facetService = new FacetIntegrityService();
