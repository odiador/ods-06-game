import { Scene } from 'phaser';
import { BIOMES, BiomeMode } from '../types/game';

type GameModeType = 'race' | 'catcher';

export class MenuScene extends Scene {
    private currentMode: GameModeType = 'race';
    private selectedBiomeKey: BiomeMode = 'wind';

    // UI elements
    private modeTabRaceGfx!: Phaser.GameObjects.Graphics;
    private modeTabRaceText!: Phaser.GameObjects.Text;
    private modeTabCatcherGfx!: Phaser.GameObjects.Graphics;
    private modeTabCatcherText!: Phaser.GameObjects.Text;

    private biomeSubtitleText!: Phaser.GameObjects.Text;
    private biomeTitleText!: Phaser.GameObjects.Text;
    private vehicleSprite!: Phaser.GameObjects.Sprite;
    private boostSprite!: Phaser.GameObjects.Sprite;
    private instructionsText!: Phaser.GameObjects.Text;

    private biomeTabsContainer!: Phaser.GameObjects.Container;
    private tabBgs: Phaser.GameObjects.Graphics[] = [];
    private tabTexts: Phaser.GameObjects.Text[] = [];

    private startBtnText!: Phaser.GameObjects.Text;
    private startBtnBg!: Phaser.GameObjects.Graphics;
    private startBtnHitZone!: Phaser.GameObjects.Zone;

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
        this.add.tileSprite(width / 2, 150, width, 48, 'clouds').setAlpha(0.40);

        // Rotating wind turbines in background
        const turbLeft = this.add.sprite(48, 90, 'wind').setScale(1.6).setAlpha(0.45);
        const turbRight = this.add.sprite(width - 48, 90, 'wind').setScale(1.6).setAlpha(0.45);
        this.tweens.add({
            targets: [turbLeft, turbRight],
            angle: 360,
            duration: 4000,
            repeat: -1
        });

        // Floor strip at bottom
        this.add.tileSprite(width / 2, height - 16, width, 32, 'grass_border');

        // ── 2. Top Header Badge ──
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0xD97706, 1);
        badgeBg.fillRect(width / 2 - 130, 20, 260, 22);
        badgeBg.lineStyle(1, 0xFBBF24, 1);
        badgeBg.strokeRect(width / 2 - 130, 20, 260, 22);

        this.add.text(width / 2, 31, 'ODS 7 · ENERGIA LIMPIA 2030', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FEF3C7'
        }).setOrigin(0.5);

        // Game Title
        this.add.text(width / 2, 54, 'RED SOSTENIBLE', {
            fontSize: '18px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5, 0);

        // ── 3. Mode Switcher (2 Distinct Games) ──
        const modeTabY = 88;
        const modeTabW = (width - 48) / 2;

        this.modeTabRaceGfx = this.add.graphics();
        this.modeTabCatcherGfx = this.add.graphics();

        this.modeTabRaceText = this.add.text(24 + modeTabW / 2, modeTabY + 14, '1. CARRERA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.modeTabCatcherText = this.add.text(24 + modeTabW + 4 + modeTabW / 2, modeTabY + 14, '2. ATRAPA (POU)', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#94A3B8'
        }).setOrigin(0.5);

        const raceHit = this.add.zone(24 + modeTabW / 2, modeTabY + 14, modeTabW, 28)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        raceHit.on('pointerdown', () => this.switchGameMode('race'));

        const catcherHit = this.add.zone(24 + modeTabW + 4 + modeTabW / 2, modeTabY + 14, modeTabW, 28)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        catcherHit.on('pointerdown', () => this.switchGameMode('catcher'));

        // ── 4. Biome Sub-Tabs Container (For Race Mode) ──
        this.biomeTabsContainer = this.add.container(0, 0);
        const biomesList: BiomeMode[] = ['wind', 'solar', 'hydro'];
        const subTabW = (width - 48) / 3;
        const subTabY = 126;

        this.tabBgs = [];
        this.tabTexts = [];

        biomesList.forEach((bKey, idx) => {
            const tabX = 24 + idx * subTabW;
            const tabBg = this.add.graphics();
            this.tabBgs.push(tabBg);
            this.biomeTabsContainer.add(tabBg);

            const tabLabel = this.add.text(tabX + subTabW / 2, subTabY + 14, bKey.toUpperCase(), {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#FFFFFF'
            }).setOrigin(0.5);
            this.tabTexts.push(tabLabel);
            this.biomeTabsContainer.add(tabLabel);

            const hitZone = this.add.zone(tabX + subTabW / 2, subTabY + 14, subTabW - 4, 28)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            hitZone.on('pointerdown', () => this.selectBiome(bKey));
            this.biomeTabsContainer.add(hitZone);
        });

        // ── 5. Mode Details: Title & Subtitle ──
        this.biomeTitleText = this.add.text(width / 2, 178, '', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#00E5FF',
            align: 'center'
        }).setOrigin(0.5);

        this.biomeSubtitleText = this.add.text(width / 2, 198, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#94A3B8'
        }).setOrigin(0.5);

        // ── 6. Animated Showcase ──
        const showcaseY = 275;
        this.boostSprite = this.add.sprite(width / 2, showcaseY + 15, 'wind_gust').setScale(1.8).setAlpha(0.85);
        this.vehicleSprite = this.add.sprite(width / 2, showcaseY, 'wind_glider').setScale(2.8);

        this.tweens.add({
            targets: this.vehicleSprite,
            y: showcaseY - 12,
            angle: 6,
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ── 7. Mission Instructions ──
        this.instructionsText = this.add.text(width / 2, 395, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#CBD5E1',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: width - 64, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // ── 8. Start Button (Flat retro arcade button) ──
        const btnY = 530;
        const btnW = 250;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;

        this.startBtnBg = this.add.graphics();
        this.renderStartBtn(false, btnX, btnY, btnW, btnH);

        this.startBtnText = this.add.text(width / 2, btnY + btnH / 2 - 1, 'INICIAR JUEGO', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        this.startBtnHitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.startBtnHitZone.on('pointerover', () => this.renderStartBtn(true, btnX, btnY, btnW, btnH));
        this.startBtnHitZone.on('pointerout', () => this.renderStartBtn(false, btnX, btnY, btnW, btnH));
        this.startBtnHitZone.on('pointerdown', () => this.launchActiveMode());

        // ── 9. Controls Hint ──
        this.add.text(width / 2, 615, 'CONTROLES: ⬅ ➡ o A / D · CLIC Y ARRASTRA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        // Keyboard triggers
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => this.launchActiveMode());
            this.input.keyboard.on('keydown-ENTER', () => this.launchActiveMode());
            this.input.keyboard.on('keydown-ONE', () => this.switchGameMode('race'));
            this.input.keyboard.on('keydown-TWO', () => this.switchGameMode('catcher'));
        }

        // Initialize view
        this.switchGameMode('race');
    }

    private renderStartBtn(hover: boolean, x: number, y: number, w: number, h: number): void {
        this.startBtnBg.clear();
        this.startBtnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
        this.startBtnBg.fillRect(x, y, w, h);
        this.startBtnBg.fillStyle(0xB45309, 1);
        this.startBtnBg.fillRect(x, y + h - 3, w, 3);
    }

    private switchGameMode(mode: GameModeType): void {
        this.currentMode = mode;
        const { width } = this.scale;
        const modeTabY = 88;
        const modeTabW = (width - 48) / 2;

        // Render Mode 1 Tab
        this.modeTabRaceGfx.clear();
        if (mode === 'race') {
            this.modeTabRaceGfx.fillStyle(0x0284C7, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY, modeTabW, 28);
            this.modeTabRaceGfx.fillStyle(0x0369A1, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY + 25, modeTabW, 3);
            this.modeTabRaceText.setColor('#FFFFFF');
        } else {
            this.modeTabRaceGfx.fillStyle(0x0F172A, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY, modeTabW, 28);
            this.modeTabRaceGfx.lineStyle(1, 0x1E293B, 1);
            this.modeTabRaceGfx.strokeRect(24, modeTabY, modeTabW, 28);
            this.modeTabRaceText.setColor('#64748B');
        }

        // Render Mode 2 Tab
        this.modeTabCatcherGfx.clear();
        const catcherX = 24 + modeTabW + 4;
        if (mode === 'catcher') {
            this.modeTabCatcherGfx.fillStyle(0x16A34A, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY, modeTabW, 28);
            this.modeTabCatcherGfx.fillStyle(0x15803D, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY + 25, modeTabW, 3);
            this.modeTabCatcherText.setColor('#FFFFFF');
        } else {
            this.modeTabCatcherGfx.fillStyle(0x0F172A, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY, modeTabW, 28);
            this.modeTabCatcherGfx.lineStyle(1, 0x1E293B, 1);
            this.modeTabCatcherGfx.strokeRect(catcherX, modeTabY, modeTabW, 28);
            this.modeTabCatcherText.setColor('#64748B');
        }

        if (mode === 'race') {
            this.biomeTabsContainer.setVisible(true);
            this.selectBiome(this.selectedBiomeKey);
            this.startBtnText.setText('INICIAR CARRERA');
        } else {
            this.biomeTabsContainer.setVisible(false);
            this.showCatcherModeInfo();
            this.startBtnText.setText('JUGAR ATRAPA-ENERGIA');
        }
    }

    private selectBiome(key: BiomeMode): void {
        this.selectedBiomeKey = key;
        (window as any).__selectedBiome = key;
        const config = BIOMES[key];
        const biomesList: BiomeMode[] = ['wind', 'solar', 'hydro'];
        const { width } = this.scale;
        const subTabW = (width - 48) / 3;
        const subTabY = 126;

        biomesList.forEach((bKey, idx) => {
            const isSelected = bKey === key;
            const bCfg = BIOMES[bKey];
            const tabX = 24 + idx * subTabW;
            const gfx = this.tabBgs[idx];
            gfx.clear();

            if (isSelected) {
                gfx.fillStyle(bCfg.themeColorHex, 1);
                gfx.fillRect(tabX, subTabY, subTabW - 4, 28);
                this.tabTexts[idx].setColor('#0F172A');
                this.tabTexts[idx].setText(`> ${bCfg.name.split(' ')[0]}`);
            } else {
                gfx.fillStyle(0x0F172A, 1);
                gfx.fillRect(tabX, subTabY, subTabW - 4, 28);
                gfx.lineStyle(1, 0x1E293B, 1);
                gfx.strokeRect(tabX, subTabY, subTabW - 4, 28);
                this.tabTexts[idx].setColor('#64748B');
                this.tabTexts[idx].setText(bCfg.name.split(' ')[0]);
            }
        });

        this.biomeTitleText.setText(config.name);
        this.biomeTitleText.setColor(config.themeColor);
        this.biomeSubtitleText.setText(config.subtitle);

        this.vehicleSprite.setTexture(config.vehicleKey).setScale(2.8).setAngle(0);
        this.boostSprite.setTexture(config.turboKey).setVisible(true);

        const instructions = [
            `MISIÓN CARRERA 2.030m · ${config.energyLabel}`,
            `• ${config.description}`,
            `• Cada turbo suma +50 km/h y energia limpia.`,
            `• Esquiva rocas y obstaculos para no frenar.`
        ].join('\n');
        this.instructionsText.setText(instructions);
    }

    private showCatcherModeInfo(): void {
        this.biomeTitleText.setText('ATRAPA-ENERGIA (MODO POU)');
        this.biomeTitleText.setColor('#4ADE80');
        this.biomeSubtitleText.setText('ALMACENAMIENTO BESS Y ESTABILIDAD');

        this.vehicleSprite.setTexture('player_run').setScale(2.6).setAngle(0);
        this.boostSprite.setTexture('battery').setVisible(true).setScale(2.0);

        const instructions = [
            'MISIÓN ALMACENAMIENTO BESS · META: 350 kWh',
            '• Atrapa Sol (+10), Viento (+15), Hidro (+20) y Baterias (+30).',
            '• Esquiva barriles de petroleo, carbon y sobrecargas electricas.',
            '• Encadena capturas limpias para obtener combo 2x y 3x.',
            '• Dispones de 3 vidas para mantener la estabilidad de red.'
        ].join('\n');
        this.instructionsText.setText(instructions);
    }

    private launchActiveMode(): void {
        this.startBtnHitZone.disableInteractive();
        this.cameras.main.fadeOut(200, 8, 12, 22);

        this.time.delayedCall(200, () => {
            if (this.currentMode === 'race') {
                this.scene.start('MainScene', { biome: this.selectedBiomeKey });
            } else {
                this.scene.start('CatcherScene');
            }
        });
    }
}
