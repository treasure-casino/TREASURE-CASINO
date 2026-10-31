/**
 * TREASURE CASINO - Reusable Global Sound Manager
 * Handles audio playback, volume controls, mute toggling, persistence, and Web Audio API synthesis fallback.
 */

export type SoundEffectType =
  | 'buttonClick'
  | 'gameStart'
  | 'diceRoll'
  | 'plinkoBounce'
  | 'plinkoLand'
  | 'cardReveal'
  | 'slotSpin'
  | 'slotStop'
  | 'multiplierTick'
  | 'crash'
  | 'win'
  | 'loss'
  | 'countdownBeep'
  | 'airplaneEngine'
  | 'cashoutSuccess'
  | 'tigerRoar'
  | 'coinClink'
  | 'lightningStrike'
  | 'hammerSmash'
  | 'treeRustle'
  | 'iceCrack'
  | 'laserShot'
  | 'glitchSound';

const SOUND_FILES: Record<SoundEffectType, string> = {
  buttonClick: '/assets/audio/button_click.wav',
  gameStart: '/assets/audio/game_start.wav',
  diceRoll: '/assets/audio/dice_roll.wav',
  plinkoBounce: '/assets/audio/plinko_bounce.wav',
  plinkoLand: '/assets/audio/plinko_land.wav',
  cardReveal: '/assets/audio/card_reveal.wav',
  slotSpin: '/assets/audio/slot_spin.wav',
  slotStop: '/assets/audio/slot_stop.wav',
  multiplierTick: '/assets/audio/multiplier_tick.wav',
  crash: '/assets/audio/crash_explosion.wav',
  win: '/assets/audio/win.wav',
  loss: '/assets/audio/loss.wav',
  countdownBeep: '/assets/audio/button_click.wav',
  airplaneEngine: '/assets/audio/game_start.wav',
  cashoutSuccess: '/assets/audio/win.wav',
  tigerRoar: '/assets/audio/slot_spin.wav',
  coinClink: '/assets/audio/button_click.wav',
  lightningStrike: '/assets/audio/crash_explosion.wav',
  hammerSmash: '/assets/audio/crash_explosion.wav',
  treeRustle: '/assets/audio/slot_spin.wav',
  iceCrack: '/assets/audio/card_reveal.wav',
  laserShot: '/assets/audio/button_click.wav',
  glitchSound: '/assets/audio/multiplier_tick.wav',
};

const MUTED_KEY = 'treasure_sound_muted';
const VOLUME_KEY = 'treasure_sound_volume';

class SoundManager {
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private lastPlayedTime: Map<string, number> = new Map();
  private hasUserInteracted: boolean = false;

  constructor() {
    // Read persisted sound preferences
    const storedMute = localStorage.getItem(MUTED_KEY);
    this.isMuted = storedMute === 'true';

    const storedVol = localStorage.getItem(VOLUME_KEY);
    if (storedVol) {
      const v = parseFloat(storedVol);
      if (!isNaN(v) && v >= 0 && v <= 1) {
        this.volume = v;
      }
    }

    // Attach initial interaction listener for browser autoplay policy
    const markInteraction = () => {
      this.hasUserInteracted = true;
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      window.removeEventListener('click', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };

    window.addEventListener('click', markInteraction, { once: true });
    window.addEventListener('keydown', markInteraction, { once: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    return this.audioContext;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem(MUTED_KEY, String(muted));
    window.dispatchEvent(new CustomEvent('sound_settings_changed', { detail: { isMuted: this.isMuted, volume: this.volume } }));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem(VOLUME_KEY, this.volume.toFixed(2));
    window.dispatchEvent(new CustomEvent('sound_settings_changed', { detail: { isMuted: this.isMuted, volume: this.volume } }));
  }

  /**
   * Primary play method: plays local WAV file, falling back to Web Audio synthesis
   */
  public play(type: SoundEffectType): void {
    if (this.isMuted || this.volume <= 0 || !this.hasUserInteracted) {
      return;
    }

    // Anti-clipping debounce for rapid sounds (e.g. tick/bounce)
    const now = performance.now();
    const lastTime = this.lastPlayedTime.get(type) || 0;
    const minInterval = type === 'multiplierTick' ? 60 : type === 'plinkoBounce' ? 50 : 80;

    if (now - lastTime < minInterval) {
      return;
    }
    this.lastPlayedTime.set(type, now);

    const soundPath = SOUND_FILES[type];
    if (soundPath) {
      try {
        let audio = this.audioCache.get(soundPath);
        if (!audio) {
          audio = new Audio(soundPath);
          audio.preload = 'auto';
          this.audioCache.set(soundPath, audio);
        }

        audio.volume = this.volume;
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((_err) => {
            // If HTMLAudio playback fails or is blocked, synthesize with Web Audio API
            this.synthesizeFallback(type);
          });
        }
        return;
      } catch (_e) {
        this.synthesizeFallback(type);
      }
    } else {
      this.synthesizeFallback(type);
    }
  }

  /**
   * Web Audio API Synthesizer Fallback
   */
  private synthesizeFallback(type: SoundEffectType): void {
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.5, now);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);

      switch (type) {
        case 'buttonClick':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
          gain.gain.setValueAtTime(0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'gameStart':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554.37, now + 0.08);
          osc.frequency.setValueAtTime(659.25, now + 0.16);
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
          break;

        case 'win':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
          osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
          osc.start(now);
          osc.stop(now + 0.55);
          break;

        case 'loss':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'crash':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
          gain.gain.setValueAtTime(0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;

        case 'countdownBeep':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case 'cashoutSuccess':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;

        case 'airplaneEngine':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(90, now);
          osc.frequency.linearRampToValueAtTime(180, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'tigerRoar':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;

        case 'coinClink':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2400, now);
          osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case 'lightningStrike':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
          gain.gain.setValueAtTime(0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;

        case 'hammerSmash':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
          gain.gain.setValueAtTime(0.9, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;

        case 'treeRustle':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.linearRampToValueAtTime(1600, now + 0.2);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;

        case 'iceCrack':
          osc.type = 'square';
          osc.frequency.setValueAtTime(3200, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'laserShot':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case 'glitchSound':
          osc.type = 'square';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.setValueAtTime(1200, now + 0.04);
          osc.frequency.setValueAtTime(250, now + 0.08);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        default:
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
      }
    } catch (_err) {
      // Graceful silence
    }
  }
}

export const soundManager = new SoundManager();

