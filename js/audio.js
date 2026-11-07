/**
 * Kozminski Escape: Polowanie na ECTS
 * js/audio.js - Moduł syntezy dźwięków 8-bit Retro Web Audio API
 * 
 * Brak plików .mp3 / .wav - 100% czysta synteza proceduralna w przeglądarce:
 * AudioContext, OscillatorNode, GainNode
 */

class SoundSystemClass {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
  }

  /**
   * Inicjalizacja AudioContext (wywoływana przy pierwszej interakcji użytkownika)
   */
  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isInitialized = true;
  }

  /**
   * Przełączanie wyciszenia
   * @returns {boolean} aktualny stan wyciszenia
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Główna metoda odtwarzania efektów dźwiękowych
   * @param {'ects' | 'coffee' | 'shield' | 'freeze' | 'hit' | 'win'} type 
   */
  play(type) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'ects':
        this.playEcts(now);
        break;
      case 'coffee':
        this.playCoffee(now);
        break;
      case 'shield':
        this.playShield(now);
        break;
      case 'freeze':
        this.playFreeze(now);
        break;
      case 'hit':
        this.playHit(now);
        break;
      case 'win':
        this.playWin(now);
        break;
      default:
        console.warn(`[SoundSystem] Nieznany typ dźwięku: "${type}"`);
    }
  }

  // 1. 'ects': melodyjny dwuton monety (fala trójkątna)
  playEcts(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';

    // Pierwszy ton (B5 ~ 987.77 Hz), szybki skok na drugi ton (E6 ~ 1318.51 Hz)
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);

    // Obwiednia głośności (ADSR monety arcade)
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.setValueAtTime(0.25, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // 2. 'coffee': dźwięk przyspieszenia (rosnąca częstotliwość fali piłokształtnej)
  playCoffee(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';

    // Płynny wzrost częstotliwości (efekt turbo od 180 Hz do 960 Hz)
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.32);

    // Obwiednia głośności
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 3. 'shield': aktywacja legitymacji studenckiej (akord sinusoidalny)
  playShield(now) {
    // Akord C-dur z oktawą: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz), C6 (1046.50 Hz)
    const frequencies = [523.25, 659.25, 783.99, 1046.5];

    frequencies.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Subtelny phasing / vibrato dla efektu lśniącej tarczy ochronnej
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq + (index % 2 === 0 ? 4 : -4), now + 0.45);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.52);
    });
  }

  // 4. 'freeze': cyber-freeze AI po zadanym pytaniu (fala prostokątna)
  playFreeze(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';

    // Cybernetyczny skok częstotliwości (staccato freeze glitche)
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(800, now + 0.05);
    osc.frequency.setValueAtTime(1400, now + 0.1);
    osc.frequency.setValueAtTime(450, now + 0.15);
    osc.frequency.setValueAtTime(300, now + 0.22);

    // Kanciaste, cyfrowe wyciszenie
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.12, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.33);
  }

  // 5. 'hit': złapanie przez egzaminatora (dramatycznie opadający bas)
  playHit(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Głęboka fala piłokształtna dająca retro-arkadowy bas
    osc.type = 'sawtooth';

    // Dramatyczny zjazd częstotliwości: z 240 Hz w dół do głębokiego 45 Hz
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.55);

    // Mocne uderzenie (punch) i powolne wybrzmienie
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.62);
  }

  // 6. 'win': krótka, 4-tonowa fanfara sukcesu
  playWin(now) {
    // 4-tonowa klasyczna fanfara: G4 (392 Hz), C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
    const melody = [
      { freq: 392.0, time: 0.0, dur: 0.12 },
      { freq: 523.25, time: 0.13, dur: 0.12 },
      { freq: 659.25, time: 0.26, dur: 0.14 },
      { freq: 783.99, time: 0.41, dur: 0.45 }
    ];

    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      const noteStart = now + note.time;
      const noteEnd = noteStart + note.dur;

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.24, noteStart + 0.02);
      gain.gain.setValueAtTime(0.22, noteEnd - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.02);
    });
  }
}

// Eksport instancji SoundSystem
export const SoundSystem = new SoundSystemClass();
export const soundManager = SoundSystem;

// Rejestracja w oknie globalnym dla wygody integracji modułowej
if (typeof window !== 'undefined') {
  window.SoundSystem = SoundSystem;
  window.soundManager = SoundSystem;
}

export default SoundSystem;
