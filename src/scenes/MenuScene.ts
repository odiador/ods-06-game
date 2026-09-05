import { Scene } from 'phaser';

export class MenuScene extends Scene {
    constructor() {
        super('MenuScene');
    }

    create(): void {
        const { width, height } = this.scale;

        // ── 1. Smart Grid & Skyline Background ──
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x050811, 0x050811, 0x0B132B, 0x0E1A38, 1);
        bg.fillRect(0, 0, width, height);

        // Distant clouds
        this.add.tileSprite(width / 2, 200, width, 48, 'clouds').setAlpha(0.4);

        // City skyline at the bottom
        this.add.tileSprite(width / 2, height - 80, width, 96, 'city_skyline')
            .setTileScale(2, 2)
            .setAlpha(0.75);

        // Substation floor at very bottom
        this.add.tileSprite(width / 2, height - 16, width, 32, 'substation_floor');

        // Grid lines simulating a smart digital power grid
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x1E293B, 0.35);
        for (let x = 0; x <= width; x += 30) {
            gridGfx.lineBetween(x, 0, x, height - 32);
        }
        for (let y = 0; y <= height - 32; y += 30) {
            gridGfx.lineBetween(0, y, width, y);
        }

        // Energy circuit nodes in background
        for (let i = 0; i < 8; i++) {
            const nodeX = Phaser.Math.Between(40, width - 40);
            const nodeY = Phaser.Math.Between(60, height - 120);
            const nodeDot = this.add.circle(nodeX, nodeY, 3, 0xFACC15, 0.35);
            this.tweens.add({
                targets: nodeDot,
                scale: 2.2,
                alpha: 0.1,
                duration: Phaser.Math.Between(1200, 2200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // ── 2. Header & ODS 7 Badge ──
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0xFCC30B, 1);
        badgeBg.fillRoundedRect(width / 2 - 110, 50, 220, 32, 6);

        this.add.text(width / 2, 66, 'ODS 7 · AGENDA 2030', {
            fontSize: '13px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        // Title
        this.add.text(width / 2, 130, 'ENERGÍA\nLIMPIA', {
            fontSize: '44px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5, 0);

        this.add.text(width / 2, 240, 'Y ASEQUIBLE', {
            fontSize: '20px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15',
            align: 'center',
            letterSpacing: 3
        }).setOrigin(0.5);

        // Divider
        const divider = this.add.graphics();
        divider.lineStyle(2, 0xFACC15, 0.7);
        divider.lineBetween(width / 2 - 140, 265, width / 2 + 140, 265);

        // ── 3. Animated Preview of Pixel Art Sprites ──
        const showcaseY = 330;
        const items = ['solar', 'wind', 'battery', 'hydro'];
        items.forEach((key, index) => {
            const xPos = width / 2 - 90 + index * 60;
            const sprite = this.add.sprite(xPos, showcaseY, key).setScale(2.2);
            if (sprite.preFX) {
                sprite.preFX.addGlow(0xFACC15, 2, 0.4);
            }
            this.tweens.add({
                targets: sprite,
                y: showcaseY - 8,
                duration: 900 + index * 150,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // ── 4. Mission Instructions ──
        const instructions = [
            'MISIÓN DE INGENIERÍA:',
            'Opera la Red Eléctrica Inteligente.',
            'Atrapa energías limpias (+ progreso).',
            'Evita emisiones fósiles y sobrecargas.',
            'Objetivo: 80% de matriz renovable.'
        ].join('\n');

        this.add.text(width / 2, 430, instructions, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // ── 5. Start Button ──
        const btnY = 560;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 120, btnY - 26, 240, 52, 10);

        const btnText = this.add.text(width / 2, btnY, 'INICIAR RED [ PLAY ]', {
            fontSize: '16px',
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
        this.add.text(width / 2, 650, 'Controles: Flechas ⬅ ➡ o Toca los laterales', {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#64748B'
        }).setOrigin(0.5);
    }
}
