import { Scene } from 'phaser';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { BiomeConfig, BIOMES } from '../types/game';

interface HudInitData {
    targetDistance: number;
    biome?: BiomeConfig;
}

export class HudScene extends Scene {
    private speedText!: Phaser.GameObjects.Text;
    private distanceText!: Phaser.GameObjects.Text;
    private energyText!: Phaser.GameObjects.Text;
    private trackBarGfx!: Phaser.GameObjects.Graphics;
    private racerDot!: Phaser.GameObjects.Graphics;
    private muteIcon!: Phaser.GameObjects.Sprite;

    private targetDistance: number = 2030;
    private biome: BiomeConfig = BIOMES.wind;

    constructor() {
        super('HudScene');
    }

    init(data: HudInitData): void {
        this.targetDistance = data.targetDistance || 2030;
        this.biome = data.biome || BIOMES.wind;
    }

    create(): void {
        const { width } = this.scale;

        // Top HUD Panel (Glassmorphic dark dashboard)
        const panel = this.add.graphics();
        panel.fillStyle(0x0F172A, 0.90);
        panel.fillRoundedRect(10, 10, width - 20, 84, 8);
        panel.lineStyle(1, 0x334155, 0.8);
        panel.strokeRoundedRect(10, 10, width - 20, 84, 8);

        // Speedometer (Top Left)
        this.add.text(22, 16, 'VELOCÍMETRO', {
            fontSize: '9px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        });

        this.speedText = this.add.text(22, 28, '45 km/h', {
            fontSize: '18px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: this.biome.themeColor
        });

        // Audio Mute Icon (Center Top)
        const soundKey = SoundFX.getMuted() ? 'sound_off' : 'sound_on';
        this.muteIcon = this.add.sprite(width / 2, 32, soundKey)
            .setScale(1.3)
            .setInteractive({ useHandCursor: true });

        this.muteIcon.on('pointerdown', () => {
            const muted = SoundFX.toggleMute();
            this.muteIcon.setTexture(muted ? 'sound_off' : 'sound_on');
        });

        // Energy Harvested (Top Right)
        this.add.text(width - 22, 16, this.biome.energyLabel, {
            fontSize: '9px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        }).setOrigin(1, 0);

        this.energyText = this.add.text(width - 22, 28, '0 kWh', {
            fontSize: '18px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15'
        }).setOrigin(1, 0);

        // Track Distance & Linear Race Bar (Bottom of HUD)
        this.distanceText = this.add.text(22, 54, `CARRERA META 2030: 0m / ${this.targetDistance}m`, {
            fontSize: '9px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1'
        });

        this.trackBarGfx = this.add.graphics();
        this.racerDot = this.add.graphics();
        this.renderRaceTrack(0);

        // ── Event Listeners ──
        EventBus.on(GameEvents.SPEED_UPDATED, this.updateSpeed, this);
        EventBus.on(GameEvents.DISTANCE_UPDATED, this.updateDistance, this);
        EventBus.on(GameEvents.SCORE_UPDATED, this.updateScore, this);

        this.events.on('shutdown', () => {
            EventBus.off(GameEvents.SPEED_UPDATED, this.updateSpeed, this);
            EventBus.off(GameEvents.DISTANCE_UPDATED, this.updateDistance, this);
            EventBus.off(GameEvents.SCORE_UPDATED, this.updateScore, this);
        });
    }

    private updateSpeed(speed: number): void {
        this.speedText.setText(`${speed} km/h`);
        if (speed >= 130) {
            this.speedText.setColor('#FACC15'); // Gold for Turbo
        } else {
            this.speedText.setColor(this.biome.themeColor);
        }
    }

    private updateScore(score: number): void {
        this.energyText.setText(`${score} kWh`);
    }

    private updateDistance(data: { current: number; target: number; progress: number }): void {
        this.distanceText.setText(`CARRERA META 2030: ${data.current}m / ${data.target}m`);
        this.renderRaceTrack(data.progress);
    }

    private renderRaceTrack(progress: number): void {
        const { width } = this.scale;
        const barX = 22;
        const barY = 70;
        const barWidth = width - 44;
        const barHeight = 10;

        this.trackBarGfx.clear();
        this.racerDot.clear();

        // Track background
        this.trackBarGfx.fillStyle(0x1E293B, 1);
        this.trackBarGfx.fillRoundedRect(barX, barY, barWidth, barHeight, 3);

        // Track progress fill (theme colored gradient line)
        const clamped = Math.max(0, Math.min(100, progress));
        const fillW = (clamped / 100) * barWidth;
        this.trackBarGfx.fillStyle(this.biome.themeColorHex, 1);
        this.trackBarGfx.fillRoundedRect(barX, barY, fillW, barHeight, 3);

        // Finish flag marker at 100%
        this.trackBarGfx.fillStyle(0xFACC15, 1);
        this.trackBarGfx.fillRect(barX + barWidth - 4, barY - 2, 4, barHeight + 4);

        // Player's racer icon position
        const racerX = barX + fillW;
        this.racerDot.fillStyle(this.biome.themeColorHex, 1);
        this.racerDot.fillCircle(racerX, barY + barHeight / 2, 6);
        this.racerDot.fillStyle(0xFFFFFF, 1);
        this.racerDot.fillCircle(racerX, barY + barHeight / 2, 3);
    }
}
