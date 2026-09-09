class SoundFXSystem {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private isUnlocked: boolean = false;

    constructor() {
        // AudioContext will be initialized on first user interaction
    }

    private getContext(): AudioContext | null {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public unlock(): void {
        if (this.isUnlocked) return;
        const ctx = this.getContext();
        if (ctx) {
            this.isUnlocked = true;
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    /**
     * Clean energy collection sound.
     * Frequency shifts upward as combo increases for harmonic gratification.
     */
    public playCollect(combo: number = 1): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const baseFreq = 523.25; // C5
        // Harmonic pentatonic steps: C5, D5, E5, G5, A5, C6
        const scaleMultipliers = [1.0, 1.125, 1.25, 1.5, 1.667, 2.0, 2.25];
        const multiplier = scaleMultipliers[Math.min(combo - 1, scaleMultipliers.length - 1)];
        const freq = baseFreq * multiplier;

        // Tone 1: Pure crystal bell (Sine)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);

        // For combo >= 3, add secondary octave sparkle
        if (combo >= 3) {
            const sparkleOsc = ctx.createOscillator();
            const sparkleGain = ctx.createGain();

            sparkleOsc.type = 'triangle';
            sparkleOsc.frequency.setValueAtTime(freq * 2, now + 0.04);
            sparkleOsc.frequency.exponentialRampToValueAtTime(freq * 3, now + 0.16);

            sparkleGain.gain.setValueAtTime(0.12, now + 0.04);
            sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            sparkleOsc.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);

            sparkleOsc.start(now + 0.04);
            sparkleOsc.stop(now + 0.2);
        }
    }

    /**
     * Hazard impact / electrical fault sound: low frequency saw drop + crackle
     */
    public playHazard(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Harsh buzz oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
    }

    /**
     * Fanfare for high combo milestones (e.g. x4, x5)
     */
    public playComboMilestone(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

        chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const timeOffset = now + idx * 0.05;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, timeOffset);

            gain.gain.setValueAtTime(0.15, timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.22);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(timeOffset);
            osc.stop(timeOffset + 0.22);
        });
    }

    /**
     * Victory song fanfare
     */
    public playWin(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [
            { f: 523.25, d: 0.12 }, // C
            { f: 659.25, d: 0.12 }, // E
            { f: 783.99, d: 0.12 }, // G
            { f: 1046.50, d: 0.35 } // High C
        ];

        let offset = now;
        notes.forEach((n) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, offset);

            gain.gain.setValueAtTime(0.2, offset);
            gain.gain.exponentialRampToValueAtTime(0.001, offset + n.d);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(offset);
            osc.stop(offset + n.d);
            offset += n.d + 0.02;
        });
    }

    /**
     * High speed wind boost whoosh sound
     */
    public playWindTurbo(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.35);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    /**
     * Obstacle collision / spin-out skid sound
     */
    public playSpinOut(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.3);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
    }

    /**
     * Game over blackout sound: winding pitch drop
     */
    public playGameOver(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
    }

    /**
     * UI button click / tap feedback
     */
    public playMenuClick(): void {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }
}

export const SoundFX = new SoundFXSystem();
