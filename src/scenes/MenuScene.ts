import { Scene } from 'phaser';
import { GameModeId, MAIN_CIRCUIT } from '../types/game';

export class MenuScene extends Scene {
    private currentMode: GameModeId = 'race';

    // UI elements
    private modeTabRaceGfx!: Phaser.GameObjects.Graphics;
    private modeTabRaceText!: Phaser.GameObjects.Text;
    private modeTabCatcherGfx!: Phaser.GameObjects.Graphics;
    private modeTabCatcherText!: Phaser.GameObjects.Text;

    private modeTitleText!: Phaser.GameObjects.Text;
    private modeSubtitleText!: Phaser.GameObjects.Text;
    private mascotSprite!: Phaser.GameObjects.Sprite;
    private itemSprite!: Phaser.GameObjects.Sprite;
    private instructionsText!: Phaser.GameObjects.Text;

    private startBtnText!: Phaser.GameObjects.Text;
    private startBtnBg!: Phaser.GameObjects.Graphics;
    private startBtnHitZone!: Phaser.GameObjects.Zone;

    constructor() {
        super('MenuScene');
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // ── 1. Light Mode Retro Background ──
        const bg = this.add.graphics();
        bg.fillStyle(0xF1F5F9, 1);
        bg.fillRect(0, 0, width, height);

        // Distant clouds
        this.add.tileSprite(width / 2, 150, width, 48, 'clouds').setAlpha(0.35);

        // Wind turbines in background
        const turbLeft = this.add.sprite(48, 90, 'wind').setScale(1.6).setAlpha(0.40);
        const turbRight = this.add.sprite(width - 48, 90, 'wind').setScale(1.6).setAlpha(0.40);
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
        badgeBg.fillStyle(0xFEF3C7, 1);
        badgeBg.fillRect(width / 2 - 140, 24, 280, 24);
        badgeBg.lineStyle(1, 0xF59E0B, 1);
        badgeBg.strokeRect(width / 2 - 140, 24, 280, 24);

        this.add.text(width / 2, 36, 'ODS 7 · ENERGIA LIMPIA Y ASEQUIBLE', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#B45309'
        }).setOrigin(0.5);

        // Game Title
        this.add.text(width / 2, 58, 'RED RENOVABLE', {
            fontSize: '18px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A',
            align: 'center'
        }).setOrigin(0.5, 0);

        // ── 3. Mode Switcher (2 Distinct Games) ──
        const modeTabY = 96;
        const modeTabW = (width - 48) / 2;

        this.modeTabRaceGfx = this.add.graphics();
        this.modeTabCatcherGfx = this.add.graphics();

        this.modeTabRaceText = this.add.text(24 + modeTabW / 2, modeTabY + 16, '1. CARRERA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.modeTabCatcherText = this.add.text(24 + modeTabW + 4 + modeTabW / 2, modeTabY + 16, '2. ATRAPA-ENERGIA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        const raceHit = this.add.zone(24 + modeTabW / 2, modeTabY + 16, modeTabW, 32)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        raceHit.on('pointerdown', () => this.switchGameMode('race'));

        const catcherHit = this.add.zone(24 + modeTabW + 4 + modeTabW / 2, modeTabY + 16, modeTabW, 32)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        catcherHit.on('pointerdown', () => this.switchGameMode('catcher'));

        // ── 4. Mode Details Card (Clean White Surface) ──
        const cardX = 24;
        const cardW = width - 48;
        const cardY = 145;
        const cardH = 360;

        const infoCard = this.add.graphics();
        infoCard.fillStyle(0xFFFFFF, 1);
        infoCard.fillRect(cardX, cardY, cardW, cardH);
        infoCard.lineStyle(1, 0xCBD5E1, 1);
        infoCard.strokeRect(cardX, cardY, cardW, cardH);

        this.modeTitleText = this.add.text(width / 2, cardY + 22, '', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7',
            align: 'center'
        }).setOrigin(0.5);

        this.modeSubtitleText = this.add.text(width / 2, cardY + 42, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        // Animated Showcase Sprites
        const showcaseY = cardY + 115;
        this.itemSprite = this.add.sprite(width / 2, showcaseY + 18, 'wind_gust').setScale(1.8).setAlpha(0.85);
        this.mascotSprite = this.add.sprite(width / 2, showcaseY, 'wind_glider').setScale(2.8);

        this.tweens.add({
            targets: this.mascotSprite,
            y: showcaseY - 12,
            angle: 6,
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Instructions
        this.instructionsText = this.add.text(width / 2, cardY + 245, '', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#334155',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // ── 5. Start Button ──
        const btnY = 535;
        const btnW = 260;
        const btnH = 48;
        const btnX = width / 2 - btnW / 2;

        this.startBtnBg = this.add.graphics();
        this.renderStartBtn(false, btnX, btnY, btnW, btnH);

        this.startBtnText = this.add.text(width / 2, btnY + btnH / 2 - 1, 'INICIAR CARRERA', {
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

        // Controls Hint
        this.add.text(width / 2, 615, 'CONTROLES: [ < ] [ > ] O TECLAS [ A ] [ D ] · RATON O TACTIL', {
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

    private switchGameMode(mode: GameModeId): void {
        this.currentMode = mode;
        const { width } = this.scale;
        const modeTabY = 96;
        const modeTabW = (width - 48) / 2;

        // Render Mode 1 Tab (Race)
        this.modeTabRaceGfx.clear();
        if (mode === 'race') {
            this.modeTabRaceGfx.fillStyle(0x0284C7, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY, modeTabW, 32);
            this.modeTabRaceGfx.fillStyle(0x0369A1, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY + 29, modeTabW, 3);
            this.modeTabRaceText.setColor('#FFFFFF');
        } else {
            this.modeTabRaceGfx.fillStyle(0xFFFFFF, 1);
            this.modeTabRaceGfx.fillRect(24, modeTabY, modeTabW, 32);
            this.modeTabRaceGfx.lineStyle(1, 0xCBD5E1, 1);
            this.modeTabRaceGfx.strokeRect(24, modeTabY, modeTabW, 32);
            this.modeTabRaceText.setColor('#64748B');
        }

        // Render Mode 2 Tab (Catcher)
        this.modeTabCatcherGfx.clear();
        const catcherX = 24 + modeTabW + 4;
        if (mode === 'catcher') {
            this.modeTabCatcherGfx.fillStyle(0x16A34A, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY, modeTabW, 32);
            this.modeTabCatcherGfx.fillStyle(0x15803D, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY + 29, modeTabW, 3);
            this.modeTabCatcherText.setColor('#FFFFFF');
        } else {
            this.modeTabCatcherGfx.fillStyle(0xFFFFFF, 1);
            this.modeTabCatcherGfx.fillRect(catcherX, modeTabY, modeTabW, 32);
            this.modeTabCatcherGfx.lineStyle(1, 0xCBD5E1, 1);
            this.modeTabCatcherGfx.strokeRect(catcherX, modeTabY, modeTabW, 32);
            this.modeTabCatcherText.setColor('#64748B');
        }

        if (mode === 'race') {
            this.showRaceModeInfo();
            this.startBtnText.setText('INICIAR CARRERA');
        } else {
            this.showCatcherModeInfo();
            this.startBtnText.setText('JUGAR ATRAPA-ENERGIA');
        }
    }

    private showRaceModeInfo(): void {
        this.modeTitleText.setText(MAIN_CIRCUIT.name);
        this.modeTitleText.setColor('#0284C7');
        this.modeSubtitleText.setText(MAIN_CIRCUIT.subtitle);

        this.mascotSprite.setTexture(MAIN_CIRCUIT.vehicleKey).setScale(2.8).setAngle(0);
        this.itemSprite.setTexture(MAIN_CIRCUIT.turboKey).setVisible(true).setScale(1.8);

        const instructions = [
            'MISIÓN CARRERA 2.030 METROS · META ODS 7',
            '• Unico circuito continuo de descenso vertiginoso.',
            '• Cada turbo de viento suma +50 km/h y energia limpia.',
            '• Esquiva rocas y postes para evitar trompos y frenados.',
            '• Cruza la meta 2.030 m en el menor tiempo posible.'
        ].join('\n');
        this.instructionsText.setText(instructions);
    }

    private showCatcherModeInfo(): void {
        this.modeTitleText.setText('ATRAPA-ENERGIA BESS');
        this.modeTitleText.setColor('#16A34A');
        this.modeSubtitleText.setText('ALMACENAMIENTO BESS Y ESTABILIDAD');

        this.mascotSprite.setTexture('player_run').setScale(2.6).setAngle(0);
        this.itemSprite.setTexture('battery').setVisible(true).setScale(2.0);

        const instructions = [
            'MISIÓN ALMACENAMIENTO BESS · META: 1.000 kWh',
            '• Atrapa Sol (+10), Viento (+15), Hidro (+20) y Baterias (+35).',
            '• ¡CUIDADO! Si se te escapa energia limpia pierdes 1 vida.',
            '• Esquiva barriles de petroleo, carbon y sobrecargas.',
            '• Cuentas con 5 vidas para mantener la red electrica estable.'
        ].join('\n');
        this.instructionsText.setText(instructions);
    }

    private launchActiveMode(): void {
        this.startBtnHitZone.disableInteractive();
        this.cameras.main.fadeOut(180, 241, 245, 249);

        this.time.delayedCall(180, () => {
            if (this.currentMode === 'race') {
                this.scene.start('MainScene');
            } else {
                this.scene.start('CatcherScene');
            }
        });
    }
}
