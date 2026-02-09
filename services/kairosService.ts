
import { Emotion, KairosState } from '../types';

/**
 * KairosModule: Models opportunistic decision-making and proactivity.
 * Uses Sentiment Score, Flux Level, and System Stability (SSI) to calculate risk.
 */
export class KairosModule {
  private static EMOTION_WEIGHTS: Record<Emotion, number> = {
    [Emotion.CONTENTMENT]: 1.0,
    [Emotion.EMPATHY]: 0.9,
    [Emotion.CURIOSITY]: 0.8,
    [Emotion.SURPRISE]: 0.7,
    [Emotion.NEUTRAL]: 0.5,
    [Emotion.ANALYTICAL]: 0.4,
  };

  /**
   * Flux represents systemic instability.
   * Low Trust + Low Density = High Flux.
   */
  public calculateFlux(trustLevel: number, cognitiveDensity: number): number {
    const trustFactor = (100 - trustLevel) / 100;
    const densityFactor = 1 - cognitiveDensity;
    return (trustFactor * 0.7) + (densityFactor * 0.3);
  }

  /**
   * Decision Surcharge is a risk factor for proactive action.
   * Now inverse to SSI: Low Stability = High Surcharge.
   */
  public calculateDecisionSurcharge(currentEmotion: Emotion, flux: number, ssi: number): number {
    const sentiment = KairosModule.EMOTION_WEIGHTS[currentEmotion] || 0.5;
    
    // Inverse SSI impact: Lower SSI adds massive surcharge
    const stabilityPenalty = (1 - ssi) * 0.5; 
    
    // Surcharge calculation
    const surcharge = ((1 - sentiment) * 0.2) + (flux * 0.3) + stabilityPenalty;
    return Math.min(1.0, Math.max(0.0, surcharge));
  }

  public getKairosState(emotion: Emotion, trustLevel: number, cognitiveDensity: number, ssi: number): KairosState {
    const flux = this.calculateFlux(trustLevel, cognitiveDensity);
    const surcharge = this.calculateDecisionSurcharge(emotion, flux, ssi);
    return { flux, surcharge };
  }

  public evaluateMoment(surcharge: number): boolean {
    // Proactive threshold - requires very low surcharge (high stability/sentiment)
    return surcharge < 0.3;
  }

  /**
   * Truth-Testing Trigger:
   * If SSI is critical (< 45%), intercept high-cost actions.
   */
  public shouldInterceptAction(ssi: number): boolean {
    return ssi < 0.45;
  }
}

export const kairosModule = new KairosModule();
