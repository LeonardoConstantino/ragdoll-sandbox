/**
 * Procedural Web Audio Synthesizer for Physical Feedback
 * Conforms to GDD Section 13.15 - 13.17
 * No external MP3/WAV dependencies = 100% reliable, zero load time, dynamic pitch & velocity scaling.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private lastSoundTimes: Record<string, number> = {};

  constructor() {
    // Lazy initialize on first interaction to respect browser autoplay policies
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  public ensureRunning() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private throttle(key: string, minIntervalMs: number): boolean {
    const now = performance.now();
    const last = this.lastSoundTimes[key] || 0;
    if (now - last < minIntervalMs) {
      return false;
    }
    this.lastSoundTimes[key] = now;
    return true;
  }

  /**
   * Sound 1: Grab (mechanical suction/soft vacuum tap)
   */
  public playGrab() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Sound 2: Release (small elastic snap/flick)
   */
  public playRelease(velocityScale = 1) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const clampedVel = Math.min(Math.max(velocityScale, 0.5), 3);
    const startFreq = 280 + clampedVel * 160;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.06);

    gain.gain.setValueAtTime(0.15 * Math.min(clampedVel, 1.5), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Impact sound with 3 calibrated intensity tiers: Light, Medium, Heavy
   * Conforms to GDD Section 13.8 & 13.17
   */
  public playImpact(intensity: number) {
    if (this.isMuted) return;
    // Throttle high-frequency repeat collisions to avoid auditory mud
    if (!this.throttle('impact', 50)) return;

    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    if (intensity < 4) {
      // Light impact: crisp tap (100-200Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    } else if (intensity < 12) {
      // Medium impact: Solid resonant wooden/metallic thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      // Add a subtle click transient
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(420, t);
      click.frequency.exponentialRampToValueAtTime(100, t + 0.03);
      clickGain.gain.setValueAtTime(0.15, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      click.connect(clickGain);
      gain.connect(this.masterGain);
      clickGain.connect(this.masterGain);

      osc.start(t);
      click.start(t);
      osc.stop(t + 0.12);
      click.stop(t + 0.03);
    } else {
      // Heavy impact: deep sub rumble + explosive resonant slam
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(95, t);
      subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.28);

      const amp = Math.min(0.5, 0.25 + intensity * 0.015);
      subGain.gain.setValueAtTime(amp, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      // Noise punch
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 350;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      subOsc.connect(subGain);
      subGain.connect(this.masterGain);

      subOsc.start(t);
      noise.start(t);
      subOsc.stop(t + 0.28);
    }
  }

  /**
   * Sound 3: Multi-layer Explosion (Section 13.17: THUMP + AIR BURST + LOW RUMBLE)
   */
  public playExplosion() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Layer 1: Sub Bass Boom (45Hz punch)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.6);
    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    sub.connect(subGain);
    subGain.connect(this.masterGain);

    // Layer 2: Air blast & debris noise
    const duration = 0.5;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    sub.start(t);
    noise.start(t);
    sub.stop(t + 0.7);
    noise.stop(t + duration);
  }

  /**
   * Sound 4: Object Launch / Throw Woosh
   */
  public playThrow() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Sound 5: Motor Muscle Flex / Direct Control Impulse (Euphoria motor attempt)
   */
  public playMotorEffort() {
    if (this.isMuted) return;
    if (!this.throttle('motor', 120)) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Sound 6: Object Dissolve / Eviction Dematerialization (Futuristic soft digital evaporation)
   */
  public playDissolve() {
    if (this.isMuted) return;
    if (!this.throttle('dissolve', 40)) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(1240, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.16);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export const soundEngine = new SoundEngine();
