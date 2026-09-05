import { Scene } from 'phaser';

interface WinSceneData {
    score: number;
    progress: number;
}

export class WinScene extends Scene {
    private finalScore: number = 0;
    private finalProgress: number = 0;

    constructor() {
        super('WinScene');
    }

    init(data: WinSceneData): void {
        this.finalScore = data.score || 0;
        this.finalProgress = Math.round(data.progress || 80);
    }

    create(): void {
        const { width, height } = this.scale;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0E1A, 1);
        bg.fillRect(0, 0, width, height);

        // Victory banner
        const banner = this.add.graphics();
        banner.fillStyle(0x15803D, 1);
        banner.fillRoundedRect(width / 2 - 140, 70, 280, 42, 8);

        this.add.text(width / 2, 91, '¡OBJETIVO 2030 LOGRADO!', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Main Title
        this.add.text(width / 2, 145, 'TRANSICIÓN\nENERGÉTICA', {
            fontSize: '36px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5, 0);

        // Showcase animated icons
        const iconKeys = ['solar', 'wind', 'battery', 'hydro'];
        iconKeys.forEach((key, index) => {
            const spr = this.add.sprite(width / 2 - 75 + index * 50, 260, key).setScale(2.2);
            if (spr.preFX) spr.preFX.addGlow(0x22C55E, 2, 0.4);
            this.tweens.add({
                targets: spr,
                y: 252,
                duration: 800 + index * 120,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // Stats card
        const card = this.add.graphics();
        card.fillStyle(0x1E293B, 0.9);
        card.fillRoundedRect(25, 305, width - 50, 100, 8);
        card.lineStyle(1, 0x334155, 0.8);
        card.strokeRoundedRect(25, 305, width - 50, 100, 8);

        this.add.text(width / 2, 330, `Energía Sostenible: ${this.finalScore} kWh`, {
            fontSize: '16px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.add.text(width / 2, 365, `Matriz Renovable Red: ${this.finalProgress}%`, {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#4ADE80'
        }).setOrigin(0.5);

        // Academic / Systems Engineering takeaways from ODS 7 research
        const insights = [
            'APORTE DE LA INGENIERÍA DE SISTEMAS:',
            '• Algoritmos de IA para pronóstico de energía renovable.',
            '• Redes inteligentes (Smart Grids) para balance de carga.',
            '• Gemelos digitales para monitoreo de microrredes.',
            '• Cómputo verde para reducir la huella digital.'
        ].join('\n');

        this.add.text(width / 2, 485, insights, {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Restart button
        const btnY = 620;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 110, btnY - 24, 220, 48, 8);

        this.add.text(width / 2, btnY, 'JUGAR DE NUEVO', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY, 220, 48)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(250, 10, 14, 26);
            this.time.delayedCall(250, () => {
                this.scene.start('MainScene');
            });
        });

        this.cameras.main.fadeIn(300, 10, 14, 26);
    }
}
