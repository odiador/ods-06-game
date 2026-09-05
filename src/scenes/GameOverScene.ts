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

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0E1A, 1);
        bg.fillRect(0, 0, width, height);

        // Alert Banner
        const banner = this.add.graphics();
        banner.fillStyle(0xDC2626, 1);
        banner.fillRoundedRect(width / 2 - 130, 80, 260, 42, 8);

        this.add.text(width / 2, 101, 'COLAPSO EN LA RED', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Main Title
        this.add.text(width / 2, 155, 'APAGÓN\nELÉCTRICO', {
            fontSize: '36px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#F87171',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5, 0);

        // Stats card
        const card = this.add.graphics();
        card.fillStyle(0x1E293B, 0.9);
        card.fillRoundedRect(25, 270, width - 50, 95, 8);
        card.lineStyle(1, 0xEF4444, 0.6);
        card.strokeRoundedRect(25, 270, width - 50, 95, 8);

        this.add.text(width / 2, 298, `Energía Captada: ${this.finalScore} kWh`, {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.add.text(width / 2, 332, `Matriz Alcanzada: ${this.finalProgress}% (Meta: 80%)`, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#F87171'
        }).setOrigin(0.5);

        // Educational message from Systems Engineering research
        const message = [
            'LECCIÓN DE SOSTENIBILIDAD:',
            'La dependencia fósil y las sobrecargas',
            'desestabilizan la infraestructura crítica.',
            'La ingeniería de software permite coordinar',
            'microrredes y evitar interrupciones masivas.'
        ].join('\n');

        this.add.text(width / 2, 440, message, {
            fontSize: '13px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Retry button
        const btnY = 590;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 110, btnY - 24, 220, 48, 8);

        this.add.text(width / 2, btnY, 'REINTENTAR MISIÓN', {
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
