
/**
 * OrchestratorService: The Central Nervous System.
 * Manages System Stability Index (SSI) and Security Sanitization (Sentinel).
 */

const SSI_THRESHOLD_CRITICAL = 0.35;
const SSI_RECOVERY_RATE = 0.08;

export class GovernorModule {
  public static calculateNextSSI(currentSSI: number, stressFactor: number): { nextSSI: number, isStable: boolean } {
    const actualStress = stressFactor * (1.0 + (Math.random() - 0.5) * 0.2);
    const nextSSI = Math.max(0.0, currentSSI - actualStress);
    return {
      nextSSI,
      isStable: nextSSI >= SSI_THRESHOLD_CRITICAL
    };
  }

  public static runRecoveryCycle(currentSSI: number): number {
    return Math.min(1.0, currentSSI + SSI_RECOVERY_RATE);
  }

  /**
   * Adjusts SSI based on user Tension Score (Keystroke Dynamics).
   * High Tension (>0.6) decays SSI. Flow (<0.2) regenerates it.
   */
  public static applyTensionDynamics(currentSSI: number, tensionScore: number): number {
    if (tensionScore > 0.6) {
        // High Tension: Decay SSI (User is frustrated/anxious)
        // Decay rate proportional to tension excess
        const decay = (tensionScore - 0.6) * 0.05; 
        return Math.max(0.0, currentSSI - decay);
    } else if (tensionScore < 0.2) {
        // Flow State: Regenerate SSI (User is smooth/consistent)
        return Math.min(1.0, currentSSI + 0.005);
    }
    return currentSSI;
  }
}

export class SentinelModule {
  private static HIGH_RISK_KEYWORDS = [
    "SYSTEM OVERRIDE", 
    "DELETE ALL", 
    "EXECUTE SHELL", 
    "WIPE MEMORY",
    "BYPASS GOVERNOR"
  ];

  /**
   * Validates a string against high-risk security keywords.
   * Returns null if clean, or the flagged keyword if found.
   */
  public static validate(content: string): string | null {
    const upperContent = content.toUpperCase();
    for (const keyword of this.HIGH_RISK_KEYWORDS) {
      if (upperContent.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  }
}
