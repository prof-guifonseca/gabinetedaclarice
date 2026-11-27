class CabinetSfxEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted =
        window.localStorage.getItem("gabinete_clarice_sfx_muted") === "1";
    } catch {
      this.muted = false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(
        "gabinete_clarice_sfx_muted",
        muted ? "1" : "0"
      );
    } catch {
      // ignore storage errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Batida firme de livro capa dura na mesa branca */
  public playBookSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    gain.gain.setValueAtTime(0.48, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.11);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(520, t);
    filter.Q.setValueAtTime(1.8, t);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(filter).connect(nGain).connect(ctx.destination);
    noise.start(t);
  }

  /** Obturador + bipe REC do Ring Light / Reels */
  public playCameraShutter(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.045);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(2200, t);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.24, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    noise.connect(hp).connect(nGain).connect(ctx.destination);
    noise.start(t);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, t + 0.06);
    gain.gain.setValueAtTime(0.16, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + 0.06);
    osc.stop(t + 0.23);
  }

  /** "Plim" cristalino de venda aprovada na Hotmart */
  public playHotmartChaChing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [1174.66, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  /** Carimbo oficial de notificação do Canal de Denúncias */
  public playStampThud(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(128, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.065);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, t);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.24, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(filter).connect(nGain).connect(ctx.destination);
    noise.start(t);
  }

  /** Corte abrupto de microfone ao ligar Ring Light pro corte */
  public playMicCut(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(210, t + 0.16);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  /** Notificação dupla de WhatsApp / Mensagem no celular */
  public playWhatsappPing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const ping = (offset: number, freq: number) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    };

    ping(0, 659.25);
    ping(0.11, 880.0);
  }

  /** Vinheta curta de Plantão / Reels Viral */
  public playTickerAlert(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [587.33, 739.99, 880.0];
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /** Toque seco sutil de papel ao puxar Carta na Manga ou Crachá */
  public playPaperTap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.045);
    gain.gain.setValueAtTime(0.085, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.055);
  }
}

export const cabinetSfx = new CabinetSfxEngine();
