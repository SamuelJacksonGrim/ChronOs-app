
/**
 * AudioService: Generates minimalist, synthesized sounds for system events.
 * Now includes Ambient Coupling to sense the user's room.
 */
class AudioService {
  private ctx: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private sanctuaryOscillators: { osc: OscillatorNode, gain: GainNode }[] = [];

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async startAmbientSensing(): Promise<void> {
    this.init();
    if (!this.ctx) return;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.ctx.createMediaStreamSource(this.micStream);
      this.analyzer = this.ctx.createAnalyser();
      this.analyzer.fftSize = 256;
      source.connect(this.analyzer);
    } catch (e) {
      console.warn("Ambient sensing permission denied.");
    }
  }

  public getAmbientVolume(): number {
    if (!this.analyzer) return 0;
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length; // Normalized average
  }

  /**
   * playTone: Generates a short, resonant beep.
   */
  public playTone(freq: number = 440, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playResonance(isStable: boolean = true) {
    this.init();
    if (!this.ctx) return;

    const freq = isStable ? 880 : 220;
    const type = isStable ? 'sine' : 'sawtooth';
    this.playTone(freq, type, 0.4, isStable ? 0.05 : 0.08);
  }

  public playGlitch() {
    this.init();
    if (!this.ctx) return;
    
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            this.playTone(Math.random() * 100 + 50, 'sawtooth', 0.05, 0.03);
        }, i * 50);
    }
  }

  /**
   * Generates a continuous, calming binaural drone for Sanctuary Mode.
   * Frequencies chosen for Theta state induction (110Hz left, 114Hz right -> 4Hz beat).
   */
  public startSanctuaryHum() {
      this.init();
      if (!this.ctx) return;
      this.stopSanctuaryHum(); // Clear existing

      const createDrone = (freq: number, pan: number) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const panner = this.ctx.createStereoPanner();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          
          gain.gain.setValueAtTime(0, this.ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 5); // Slow fade in

          panner.pan.setValueAtTime(pan, this.ctx.currentTime);

          osc.connect(gain);
          gain.connect(panner);
          panner.connect(this.ctx.destination);
          
          osc.start();
          this.sanctuaryOscillators.push({ osc, gain });
      };

      createDrone(110, -0.8); // Left ear base
      createDrone(114, 0.8);  // Right ear offset (4Hz Theta beat)
      createDrone(55, 0);     // Deep bass anchor (A1)
  }

  public stopSanctuaryHum() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.sanctuaryOscillators.forEach(({ osc, gain }) => {
          gain.gain.cancelScheduledValues(now);
          gain.gain.linearRampToValueAtTime(0, now + 2); // Slow fade out
          osc.stop(now + 2.1);
      });
      this.sanctuaryOscillators = [];
  }
}

export const audioService = new AudioService();
