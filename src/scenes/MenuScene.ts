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
        (window as any).__gameActive = false;

        // ── 1. Background (Solid retro dark tone) ──
        const bg = this.add.graphics();
        bg.fillStyle(0x080C16, 1);
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
        badgeBg.fillStyle(0xD97706, 1);
        badgeBg.fillRect(width / 2 - 130, 26, 260, 24);
        badgeBg.lineStyle(1, 0xFBBF24, 1);
        badgeBg.strokeRect(width / 2 - 130, 26, 260, 24);

        this.add.text(width / 2, 38, 'ODS 7 · ENERGIA LIMPIA 2030', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FEF3C7'
        }).setOrigin(0.5);

        // Game Title
        this.add.text(width / 2, 68, 'SLED RACING', {
            fontSize: '20px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);

        // ── 3. 3-Biome Selector Tabs ──
        const biomesList: BiomeMode[] = ['wind', 'solar', 'hydro'];
        const tabWidth = (width - 40) / 3;
        const tabY = 125;

        this.tabBgs = [];
        this.tabTexts = [];

        biomesList.forEach((bKey, idx) => {
            const tabX = 20 + idx * tabWidth;

            const tabBg = this.add.graphics();
            this.tabBgs.push(tabBg);

            const tabLabel = this.add.text(tabX + tabWidth / 2, tabY + 16, bKey.toUpperCase(), {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
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
        this.biomeTitleText = this.add.text(width / 2, 185, '', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#00E5FF',
            align: 'center'
        }).setOrigin(0.5);

        this.biomeSubtitleText = this.add.text(width / 2, 208, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
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

        // ── 5. Mission Instructions (With comfortable margins) ──
        this.instructionsText = this.add.text(width / 2, 400, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: width - 64, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // ── 6. Start Race Button (Flat retro arcade button) ──
        const btnY = 530;
        const btnW = 240;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;

        const btnBg = this.add.graphics();
        const renderStartBtn = (hover: boolean): void => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };
        renderStartBtn(false);

        this.add.text(width / 2, btnY + btnH / 2 - 1, 'INICIAR CARRERA', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const btnHitArea = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const startRace = (): void => {
            btnHitArea.disableInteractive();
            this.cameras.main.fadeOut(200, 8, 12, 22);
            this.time.delayedCall(200, () => {
                this.scene.start('MainScene', { biome: this.selectedBiomeKey });
            });
        };

        btnHitArea.on('pointerover', () => renderStartBtn(true));
        btnHitArea.on('pointerout', () => renderStartBtn(false));
        btnHitArea.on('pointerdown', startRace);

        // Keyboard triggers (Space / Enter to launch, 1, 2, 3 to switch biome)
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', startRace);
            this.input.keyboard.on('keydown-ENTER', startRace);
            this.input.keyboard.on('keydown-ONE', () => this.selectBiome('wind'));
            this.input.keyboard.on('keydown-TWO', () => this.selectBiome('solar'));
            this.input.keyboard.on('keydown-THREE', () => this.selectBiome('hydro'));
        }

        // Controls hint
        this.add.text(width / 2, 615, 'CONTROLES: ⬅ ➡ o A / D · W ACELERA', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        this.add.text(width / 2, 640, 'Manten presionado y arrastra para girar', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569'
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
        const tabY = 125;

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
                this.tabTexts[idx].setText(`> ${bCfg.name.split(' ')[0]}`);
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
        this.biomeTitleText.setText(config.name);
        this.biomeTitleText.setColor(config.themeColor);
        this.biomeSubtitleText.setText(config.subtitle);

        // Update Showcase Vehicle & Boost
        this.vehicleSprite.setTexture(config.vehicleKey);
        this.boostSprite.setTexture(config.turboKey);

        // Update Instructions with clean word wrapping
        this.instructionsText.setWordWrapWidth(width - 50);
        const instructions = [
            `MISION 2.030 METROS · ${config.energyLabel}`,
            `• ${config.description}`,
            `• Cada turbo suma +50 km/h y energia limpia.`,
            `• Evita obstaculos para no perder velocidad.`
        ].join('\n');
        this.instructionsText.setText(instructions);
    }
}
