import { Scene } from 'phaser';

interface GameOverData {
    score: number;
    progress: number;
}

export class GameOverScene extends Scene {
    private finalScore: number = 0;
    private finalProgress: number = 0;

    constructor() {
        super('GameOverScene');
    }

    init(data: GameOverData): void {
        this.finalScore = data.score || 0;
        this.finalProgress = Math.round(data.progress || 0);
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0E1A, 1);
        bg.fillRect(0, 0, width, height);

        // Alert Banner
        const banner = this.add.graphics();
        banner.fillStyle(0xDC2626, 1);
        banner.fillRoundedRect(width / 2 - 130, 75, 260, 36, 6);

        this.add.text(width / 2, 93, 'COLAPSO EN LA RED', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Main Title
        this.add.text(width / 2, 145, 'APAGON\nELECTRICO', {
            fontSize: '24px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#F87171',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5, 0);

        // Stats card
        const card = this.add.graphics();
        card.fillStyle(0x1E293B, 0.9);
        card.fillRoundedRect(22, 260, width - 44, 95, 8);
        card.lineStyle(1, 0xEF4444, 0.6);
        card.strokeRoundedRect(22, 260, width - 44, 95, 8);

        this.add.text(width / 2, 290, `ENERGIA CAPTADA: ${this.finalScore} kWh`, {
            fontSize: '13px',
            fontFamily: "'Silkscreen', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.add.text(width / 2, 325, `MATRIZ ALCANZADA: ${this.finalProgress}% (META: 80%)`, {
            fontSize: '12px',
            fontFamily: "'Silkscreen', monospace",
            color: '#F87171'
        }).setOrigin(0.5);

        // Educational message from Systems Engineering research
        const message = [
            'LECCION DE SOSTENIBILIDAD:',
            'La dependencia fosil y las sobrecargas',
            'desestabilizan la red electrica.',
            'La ingenieria de sistemas coordina',
            'microrredes y BESS para evitar apagones.'
        ].join('\n');

        this.add.text(width / 2, 430, message, {
            fontSize: '12px',
            fontFamily: "'Silkscreen', monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Retry button
        const btnY = 575;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);

        const btnText = this.add.text(width / 2, btnY, 'REINTENTAR MISION', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY, 240, 48)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const retry = (): void => {
            hitZone.disableInteractive();
            this.cameras.main.fadeOut(200, 10, 14, 26);
            this.time.delayedCall(200, () => {
                this.scene.start('MainScene');
            });
        };

        hitZone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFEF08A, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);
            btnText.setScale(1.05);
        });

        hitZone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFACC15, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);
            btnText.setScale(1);
        });

        hitZone.on('pointerdown', retry);

        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', retry);
            this.input.keyboard.once('keydown-ENTER', retry);
        }

        this.cameras.main.fadeIn(250, 10, 14, 26);
    }
}
