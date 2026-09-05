import { Scene } from 'phaser';

export class MenuScene extends Scene {
    constructor() {
        super('MenuScene');
    }

    create(): void {
        const { width, height } = this.scale;

        // ── 1. Smart Grid & Canyon Background ──
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x050811, 0x050811, 0x0B1D2A, 0x0E2822, 1);
        bg.fillRect(0, 0, width, height);

        // Distant clouds
        this.add.tileSprite(width / 2, 170, width, 48, 'clouds').setAlpha(0.45);

        // Rotating wind turbines in background
        const turbLeft = this.add.sprite(50, 110, 'wind').setScale(2.0).setAlpha(0.7);
        const turbRight = this.add.sprite(width - 50, 110, 'wind').setScale(2.0).setAlpha(0.7);
        this.tweens.add({
            targets: [turbLeft, turbRight],
            angle: 360,
            duration: 4000,
            repeat: -1
        });

        // Canyon floor strip at the bottom
        this.add.tileSprite(width / 2, height - 16, width, 32, 'grass_border');

        // ── 2. Header & ODS 7 Badge ──
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0xFCC30B, 1);
        badgeBg.fillRoundedRect(width / 2 - 120, 45, 240, 32, 6);

        this.add.text(width / 2, 61, 'ODS 7 · ENERGÍA SOSTENIBLE', {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        // Title
        this.add.text(width / 2, 115, 'SLED RACING', {
            fontSize: '38px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);

        this.add.text(width / 2, 165, 'COLINAS EÓLICAS ⚡', {
            fontSize: '18px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#00E5FF',
            align: 'center',
            letterSpacing: 2
        }).setOrigin(0.5);

        // Divider
        const divider = this.add.graphics();
        divider.lineStyle(2, 0x00E5FF, 0.7);
        divider.lineBetween(width / 2 - 140, 190, width / 2 + 140, 190);

        // ── 3. Animated Showcase: Wind Glider on Boost ──
        const showcaseY = 270;
        const boostPad = this.add.sprite(width / 2, showcaseY + 15, 'wind_gust').setScale(1.8).setAlpha(0.85);
        if (boostPad.preFX) boostPad.preFX.addGlow(0x00E5FF, 2, 0.5);

        const glider = this.add.sprite(width / 2, showcaseY, 'wind_glider').setScale(2.8);
        if (glider.preFX) glider.preFX.addGlow(0xFACC15, 2, 0.4);

        this.tweens.add({
            targets: glider,
            y: showcaseY - 12,
            angle: 8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── 4. Mission Instructions ──
        const instructions = [
            'MISIÓN DE CARRERA (2.030 METROS):',
            '• Conduce tu planeador por el cañón eólico.',
            '• Pasa sobre ráfagas de viento (Turbos a 150 km/h).',
            '• Recoge celdas de batería para acumular kWh.',
            '• Esquiva rocas y troncos para evitar trompos.'
        ].join('\n');

        this.add.text(width / 2, 395, instructions, {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // ── 5. Start Button ──
        const btnY = 530;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 120, btnY - 26, 240, 52, 10);

        const btnText = this.add.text(width / 2, btnY, 'INICIAR CARRERA [ GO! ]', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        const btnHitArea = this.add.zone(width / 2, btnY, 240, 52)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btnHitArea.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFEF08A, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 26, 240, 52, 10);
            btnText.setScale(1.05);
        });

        btnHitArea.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFACC15, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 26, 240, 52, 10);
            btnText.setScale(1);
        });

        btnHitArea.on('pointerdown', () => {
            this.cameras.main.fadeOut(250, 10, 14, 26);
            this.time.delayedCall(250, () => {
                this.scene.start('MainScene');
            });
        });

        // Controls hint
        this.add.text(width / 2, 620, 'Controles: Flechas ⬅ ➡ o Toca los laterales', {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#64748B'
        }).setOrigin(0.5);
    }
}
