import { Scene } from 'phaser';
import { EventBus, GameEvents } from '../systems/EventBus';

interface HudInitData {
    targetProgress: number;
    initialLives: number;
}

export class HudScene extends Scene {
    private scoreText!: Phaser.GameObjects.Text;
    private progressText!: Phaser.GameObjects.Text;
    private progressBarGfx!: Phaser.GameObjects.Graphics;
    private heartSprites: Phaser.GameObjects.Sprite[] = [];
    private targetProgress: number = 80;

    constructor() {
        super('HudScene');
    }

    init(data: HudInitData): void {
        this.targetProgress = data.targetProgress || 80;
        this.heartSprites = [];
    }

    create(): void {
        const { width } = this.scale;

        // Top HUD Panel Background (Glassmorphic dark strip)
        const panel = this.add.graphics();
        panel.fillStyle(0x0F172A, 0.88);
        panel.fillRoundedRect(10, 10, width - 20, 84, 8);
        panel.lineStyle(1, 0x334155, 0.6);
        panel.strokeRoundedRect(10, 10, width - 20, 84, 8);

        // Score display (Top Left)
        this.add.text(22, 18, 'ENERGÍA GENERADA', {
            fontSize: '10px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        });

        this.scoreText = this.add.text(22, 30, '0 kWh', {
            fontSize: '18px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15'
        });

        // Grid Stability (Lives) display (Top Right)
        this.add.text(width - 22, 18, 'ESTABILIDAD RED', {
            fontSize: '10px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        }).setOrigin(1, 0);

        for (let i = 0; i < 3; i++) {
            const heart = this.add.sprite(width - 64 + i * 18, 40, 'heart_pixel').setScale(1.2);
            this.heartSprites.push(heart);
        }

        // Progress to 2030 (Bottom of HUD panel)
        this.add.text(22, 56, 'MATRIZ RENOVABLE (META 80%):', {
            fontSize: '10px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        });

        this.progressText = this.add.text(width - 22, 56, '0%', {
            fontSize: '11px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#4ADE80'
        }).setOrigin(1, 0);

        // Progress Bar Graphics
        this.progressBarGfx = this.add.graphics();
        this.renderProgressBar(0);

        // ── Event Listeners ──
        EventBus.on(GameEvents.SCORE_UPDATED, this.updateScore, this);
        EventBus.on(GameEvents.PROGRESS_UPDATED, this.updateProgress, this);
        EventBus.on(GameEvents.LIVES_UPDATED, this.updateLives, this);

        this.events.on('shutdown', () => {
            EventBus.off(GameEvents.SCORE_UPDATED, this.updateScore, this);
            EventBus.off(GameEvents.PROGRESS_UPDATED, this.updateProgress, this);
            EventBus.off(GameEvents.LIVES_UPDATED, this.updateLives, this);
        });
    }

    private updateScore(score: number): void {
        this.scoreText.setText(`${score} kWh`);
    }

    private updateProgress(progress: number): void {
        this.progressText.setText(`${Math.round(progress)}%`);
        this.renderProgressBar(progress);
    }

    private updateLives(lives: number): void {
        for (let i = 0; i < this.heartSprites.length; i++) {
            if (i < lives) {
                this.heartSprites[i].setAlpha(1);
                this.heartSprites[i].setTint(0xFFFFFF);
            } else {
                this.heartSprites[i].setAlpha(0.2);
                this.heartSprites[i].setTint(0x64748B);
            }
        }
    }

    private renderProgressBar(progress: number): void {
        const { width } = this.scale;
        const barX = 22;
        const barY = 72;
        const barWidth = width - 44;
        const barHeight = 12;

        this.progressBarGfx.clear();

        // Bar background
        this.progressBarGfx.fillStyle(0x1E293B, 1);
        this.progressBarGfx.fillRoundedRect(barX, barY, barWidth, barHeight, 3);

        // Fill
        const clamped = Math.max(0, Math.min(100, progress));
        const fillWidth = (clamped / 100) * barWidth;
        const fillColor = clamped >= this.targetProgress ? 0x22C55E : 0xFACC15;

        this.progressBarGfx.fillStyle(fillColor, 1);
        this.progressBarGfx.fillRoundedRect(barX, barY, fillWidth, barHeight, 3);

        // Target 80% marker line
        const targetMarkerX = barX + (this.targetProgress / 100) * barWidth;
        this.progressBarGfx.lineStyle(2, 0xFFFFFF, 0.85);
        this.progressBarGfx.lineBetween(targetMarkerX, barY - 2, targetMarkerX, barY + barHeight + 2);
    }
}
