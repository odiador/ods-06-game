import { Scene } from 'phaser';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';

export class HudScene extends Scene {
    private speedText!: Phaser.GameObjects.Text;
    private distanceText!: Phaser.GameObjects.Text;
    private energyText!: Phaser.GameObjects.Text;
    private trackBarGfx!: Phaser.GameObjects.Graphics;
    private racerDot!: Phaser.GameObjects.Graphics;
    private muteIcon!: Phaser.GameObjects.Sprite;

    private targetDistance: number = 2030;

    constructor() {
        super('HudScene');
    }

    init(data: { targetDistance?: number }): void {
        this.targetDistance = data.targetDistance || 2030;
    }

    create(): void {
        const { width } = this.scale;

        // Top HUD Panel (Light Mode Solid Dashboard)
        const panel = this.add.graphics();
        panel.fillStyle(0xFFFFFF, 1);
        panel.fillRect(0, 0, width, 88);
        panel.fillStyle(0xCBD5E1, 1);
        panel.fillRect(0, 87, width, 1);

        // Speedometer (Top Left)
        this.add.text(22, 14, 'VELOCIDAD', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        });

        this.speedText = this.add.text(22, 28, '45 km/h', {
            fontSize: '12px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7'
        });

        // Audio Mute Icon (Center Top)
        const soundKey = SoundFX.getMuted() ? 'sound_off' : 'sound_on';
        this.muteIcon = this.add.sprite(width / 2, 30, soundKey)
            .setScale(1.3)
            .setInteractive({ useHandCursor: true });

        this.muteIcon.on('pointerdown', () => {
            const muted = SoundFX.toggleMute();
            this.muteIcon.setTexture(muted ? 'sound_off' : 'sound_on');
        });

        // Energy Harvested (Top Right)
        this.add.text(width - 22, 14, 'ENERGIA LIMPIA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(1, 0);

        this.energyText = this.add.text(width - 22, 28, '0 kWh', {
            fontSize: '12px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#D97706'
        }).setOrigin(1, 0);

        // Track Distance & Linear Race Bar (Bottom of HUD)
        this.distanceText = this.add.text(22, 52, `META 2030: 0m / ${this.targetDistance}m`, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569'
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
            this.speedText.setColor('#D97706'); // Orange/Amber for Turbo
        } else {
            this.speedText.setColor('#0284C7');
        }
    }

    private updateDistance(data: { current: number; target: number; progress: number }): void {
        this.distanceText.setText(`META 2030: ${data.current}m / ${data.target}m`);
        this.renderRaceTrack(data.progress);
    }

    private updateScore(score: number): void {
        this.energyText.setText(`${score} kWh`);
    }

    private renderRaceTrack(progress: number): void {
        const { width } = this.scale;
        const barX = 22;
        const barY = 68;
        const barWidth = width - 44;
        const barHeight = 8;

        this.trackBarGfx.clear();
        this.racerDot.clear();

        // Track background
        this.trackBarGfx.fillStyle(0xE2E8F0, 1);
        this.trackBarGfx.fillRect(barX, barY, barWidth, barHeight);

        // Track progress fill
        const clamped = Math.max(0, Math.min(100, progress));
        const fillW = (clamped / 100) * barWidth;
        this.trackBarGfx.fillStyle(0x0284C7, 1);
        this.trackBarGfx.fillRect(barX, barY, fillW, barHeight);

        // Finish flag marker at 100%
        this.trackBarGfx.fillStyle(0xD97706, 1);
        this.trackBarGfx.fillRect(barX + barWidth - 4, barY - 2, 4, barHeight + 4);

        // Player racer icon
        const racerX = barX + fillW;
        this.racerDot.fillStyle(0x0F172A, 1);
        this.racerDot.fillCircle(racerX, barY + barHeight / 2, 4);
    }
}
