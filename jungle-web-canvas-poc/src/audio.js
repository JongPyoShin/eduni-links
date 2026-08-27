const DEFAULT_GAINS = { master: 0.32, sfx: 0.55, ambience: 0.08 };

export class AudioManager {
  constructor({ contextFactory } = {}) {
    this.contextFactory = contextFactory || (() => {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      return AudioContext ? new AudioContext() : null;
    });
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.gains = { ...DEFAULT_GAINS };
    this.unlocked = false;
    this.activeVoices = new Set();
    this.ambience = { forest: false, fire: false };
    this.eventCounts = new Map();
    this.lastEvent = null;
  }

  unlock() {
    if (!this.context) {
      try {
        this.context = this.contextFactory();
        if (this.context) {
          this.masterGain = this.context.createGain();
          this.sfxGain = this.context.createGain();
          this.ambienceGain = this.context.createGain();
          this.sfxGain.connect(this.masterGain);
          this.ambienceGain.connect(this.masterGain);
          this.masterGain.connect(this.context.destination);
          this._applyGains();
          for (const [name, enabled] of Object.entries(this.ambience)) if (enabled) this._startAmbience(name);
        }
      } catch {
        this.context = null;
      }
    }
    if (this.context?.state === "suspended") this.context.resume?.();
    this.unlocked = true;
    return Boolean(this.context);
  }

  setGain(bus, value) {
    if (!(bus in this.gains)) return;
    this.gains[bus] = Math.max(0, Math.min(1, value));
    this._applyGains();
  }

  play(name) {
    this.lastEvent = name;
    this.eventCounts.set(name, (this.eventCounts.get(name) || 0) + 1);
    if (!this.unlocked || !this.context || this.activeVoices.size >= 12) return false;
    const presets = {
      uiNavigate: [520, 0.045, "sine"], uiConfirm: [720, 0.09, "sine"], questStart: [440, 0.16, "triangle"],
      clueFound: [660, 0.14, "sine"], correct: [820, 0.12, "triangle"], wrong: [180, 0.1, "sine"],
      firePitComplete: [520, 0.35, "triangle"], ridgeArrival: [760, 0.28, "sine"], bluebird: [980, 0.22, "sine"], rewardFanfare: [1040, 0.45, "triangle"],
    };
    const [frequency, duration, type] = presets[name] || [440, 0.08, "sine"];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(90, frequency * 0.72), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.sfxGain);
    this.activeVoices.add(oscillator);
    oscillator.onended = () => this.activeVoices.delete(oscillator);
    oscillator.start(now); oscillator.stop(now + duration + 0.02);
    return true;
  }

  setAmbience(name, enabled) {
    if (!(name in this.ambience)) return;
    if (this.ambience[name] === enabled) return;
    this.ambience[name] = enabled;
    if (enabled) this._startAmbience(name);
  }

  _startAmbience(name) {
    if (!this.context || !this.unlocked) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = name === "fire" ? "triangle" : "sine";
    oscillator.frequency.value = name === "fire" ? 72 : 118;
    gain.gain.value = 0.0001;
    gain.gain.linearRampToValueAtTime(name === "fire" ? 0.08 : 0.035, this.context.currentTime + 0.35);
    oscillator.connect(gain); gain.connect(this.ambienceGain);
    oscillator.start();
    this[`${name}Voice`] = { oscillator, gain };
  }

  stopAmbience(name) {
    if (!(name in this.ambience)) return;
    this.ambience[name] = false;
    const voice = this[`${name}Voice`];
    if (voice && this.context) {
      voice.gain.gain.cancelScheduledValues(this.context.currentTime);
      voice.gain.gain.linearRampToValueAtTime(0.0001, this.context.currentTime + 0.18);
      voice.oscillator.stop(this.context.currentTime + 0.2);
      this[`${name}Voice`] = null;
    }
  }

  _applyGains() {
    if (!this.context) return;
    this.masterGain.gain.value = this.gains.master;
    this.sfxGain.gain.value = this.gains.sfx;
    this.ambienceGain.gain.value = this.gains.ambience;
  }
}
