import { Scene } from 'phaser';
import { BIOMES, BiomeMode } from '../types/game';

export class MenuScene extends Scene {
    private selectedBiomeKey: BiomeMode = 'wind';
    private biomeSubtitleText!: Phaser.GameObjects.Text;
    private biomeTitleText!: Phaser.GameObjects.Text;
    private vehicleSprite!: Phaser.GameObjects.Sprite;
    private boostSprite!: Phaser.GameObjects.Sprite;
    private instructionsText!: Phaser.GameObjects.Text;
    private tabBgs: Phaser.GameObjects.Graphics[] = [];
    private tabTexts: Phaser.GameObjects.Text[] = [];

    constructor() {
        super('MenuScene');
    }

    create(): void {
        const { width, height } = this.scale;
        this.selectedBiomeKey = (window as any).__selectedBiome || 'wind';

        // ── 1. Smart Grid & Canyon Background ──
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x050811, 0x050811, 0x0B1D2A, 0x0E2822, 1);
        bg.fillRect(0, 0, width, height);

        // Distant clouds
        this.add.tileSprite(width / 2, 150, width, 48, 'clouds').setAlpha(0.45);

        // Rotating wind turbines in background
        const turbLeft = this.add.sprite(50, 95, 'wind').setScale(1.8).setAlpha(0.65);
        const turbRight = this.add.sprite(width - 50, 95, 'wind').setScale(1.8).setAlpha(0.65);
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
        badgeBg.fillRoundedRect(width / 2 - 120, 30, 240, 28, 6);

        this.add.text(width / 2, 44, 'ODS 7 · ENERGÍA LIMPIA 2030', {
            fontSize: '11px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        // Game Title
        this.add.text(width / 2, 85, 'SLED RACING', {
            fontSize: '34px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);

        // ── 3. 3-Biome Selector Tabs ──
        const biomesList: BiomeMode[] = ['wind', 'solar', 'hydro'];
        const tabWidth = (width - 40) / 3;
        const tabY = 135;

        this.tabBgs = [];
        this.tabTexts = [];

        biomesList.forEach((bKey, idx) => {
            const tabX = 20 + idx * tabWidth;

            const tabBg = this.add.graphics();
            this.tabBgs.push(tabBg);

            const tabLabel = this.add.text(tabX + tabWidth / 2, tabY + 16, bKey.toUpperCase(), {
                fontSize: '12px',
                fontFamily: "'Courier New', Courier, monospace",
                fontStyle: 'bold',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            this.tabTexts.push(tabLabel);

            // Tab interactive hit zone
            const hitZone = this.add.zone(tabX + tabWidth / 2, tabY + 16, tabWidth - 4, 32)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            hitZone.on('pointerdown', () => {
                this.selectBiome(bKey);
            });
        });

        // Current Biome Title & Subtitle
        this.biomeTitleText = this.add.text(width / 2, 192, '', {
            fontSize: '17px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#00E5FF',
            align: 'center',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.biomeSubtitleText = this.add.text(width / 2, 212, '', {
            fontSize: '11px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        }).setOrigin(0.5);

        // ── 4. Animated Showcase: Vehicle & Boost pad ──
        const showcaseY = 285;
        this.boostSprite = this.add.sprite(width / 2, showcaseY + 15, 'wind_gust').setScale(1.8).setAlpha(0.85);
        this.vehicleSprite = this.add.sprite(width / 2, showcaseY, 'wind_glider').setScale(2.8);

        this.tweens.add({
            targets: this.vehicleSprite,
            y: showcaseY - 12,
            angle: 8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── 5. Mission Instructions ──
        this.instructionsText = this.add.text(width / 2, 400, '', {
            fontSize: '11px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // ── 6. Start Race Button ──
        const btnY = 530;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 125, btnY - 26, 250, 52, 10);

        const btnText = this.add.text(width / 2, btnY, 'INICIAR CARRERA [ GO! ]', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        const btnHitArea = this.add.zone(width / 2, btnY, 250, 52)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btnHitArea.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFEF08A, 1);
            btnBg.fillRoundedRect(width / 2 - 125, btnY - 26, 250, 52, 10);
            btnText.setScale(1.04);
        });

        btnHitArea.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFACC15, 1);
            btnBg.fillRoundedRect(width / 2 - 125, btnY - 26, 250, 52, 10);
            btnText.setScale(1);
        });

        btnHitArea.on('pointerdown', () => {
            this.cameras.main.fadeOut(250, 10, 14, 26);
            this.time.delayedCall(250, () => {
                this.scene.start('MainScene', { biome: this.selectedBiomeKey });
            });
        });

        // Controls hint
        this.add.text(width / 2, 620, 'Controles: Flechas ⬅ ➡ o Toca los laterales', {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        // Refresh view with initially selected biome
        this.selectBiome(this.selectedBiomeKey);
    }

    private selectBiome(key: BiomeMode): void {
        this.selectedBiomeKey = key;
        (window as any).__selectedBiome = key;
        const config = BIOMES[key];
        const biomesList: BiomeMode[] = ['wind', 'solar', 'hydro'];
        const { width } = this.scale;
        const tabWidth = (width - 40) / 3;
        const tabY = 135;

        // Update Tabs UI
        biomesList.forEach((bKey, idx) => {
            const isSelected = bKey === key;
            const bCfg = BIOMES[bKey];
            const tabX = 20 + idx * tabWidth;
            const gfx = this.tabBgs[idx];
            gfx.clear();

            if (isSelected) {
                gfx.fillStyle(bCfg.themeColorHex, 1);
                gfx.fillRoundedRect(tabX + 2, tabY, tabWidth - 4, 32, 6);
                this.tabTexts[idx].setColor('#0F172A');
                this.tabTexts[idx].setText(`[ ${bCfg.name.split(' ')[0]} ]`);
            } else {
                gfx.fillStyle(0x1E293B, 0.85);
                gfx.fillRoundedRect(tabX + 2, tabY, tabWidth - 4, 32, 6);
                gfx.lineStyle(1, 0x475569, 0.7);
                gfx.strokeRoundedRect(tabX + 2, tabY, tabWidth - 4, 32, 6);
                this.tabTexts[idx].setColor('#94A3B8');
                this.tabTexts[idx].setText(bCfg.name.split(' ')[0]);
            }
        });

        // Update Title and Subtitle
        this.biomeTitleText.setText(`${config.name} ⚡`);
        this.biomeTitleText.setColor(config.themeColor);
        this.biomeSubtitleText.setText(config.subtitle);

        // Update Showcase Vehicle & Boost
        this.vehicleSprite.setTexture(config.vehicleKey);
        this.boostSprite.setTexture(config.turboKey);

        // Update Instructions with clean word wrapping
        this.instructionsText.setWordWrapWidth(width - 50);
        const instructions = [
            `MISIÓN 2.030 METROS · ${config.energyLabel}`,
            `• ${config.description}`,
            `• Acelera con turbos hasta 170 km/h y acumula kWh.`,
            `• Esquiva obstáculos para evitar trompos y retrasos.`
        ].join('\n');
        this.instructionsText.setText(instructions);
    }
}
