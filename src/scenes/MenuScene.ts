import { Scene } from 'phaser';
import { GameModeId, MAIN_CIRCUIT } from '../types/game';
import { EventBus, GameEvents } from '../systems/EventBus';
import { networkManager } from '../systems/NetworkManager';

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

    private multiBtnBg!: Phaser.GameObjects.Graphics;
    private multiBtnText!: Phaser.GameObjects.Text;
    private multiBtnHitZone!: Phaser.GameObjects.Zone;

    // Multiplayer Modal state
    private multiplayerModal?: Phaser.GameObjects.Container;
    private currentRoomKey: string = 'ODS7';
    private currentPilotName: string = 'Piloto';

    constructor() {
        super('MenuScene');
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // Generate clean random default name
        this.currentPilotName = `Piloto ${Math.floor(Math.random() * 89 + 10)}`;

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

        // ── 4. Mode Details Card ──
        const cardX = 24;
        const cardW = width - 48;
        const cardY = 145;
        const cardH = 345;

        const infoCard = this.add.graphics();
        infoCard.fillStyle(0xFFFFFF, 1);
        infoCard.fillRect(cardX, cardY, cardW, cardH);
        infoCard.lineStyle(1, 0xCBD5E1, 1);
        infoCard.strokeRect(cardX, cardY, cardW, cardH);

        this.modeTitleText = this.add.text(width / 2, cardY + 20, '', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7',
            align: 'center'
        }).setOrigin(0.5);

        this.modeSubtitleText = this.add.text(width / 2, cardY + 40, '', {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            color: '#64748B'
        }).setOrigin(0.5);

        // Animated Showcase Sprites
        const showcaseY = cardY + 110;
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
        this.instructionsText = this.add.text(width / 2, cardY + 235, '', {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            color: '#334155',
            align: 'center',
            lineSpacing: 6,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true }
        }).setOrigin(0.5);

        // ── 5. Primary Start Button ──
        const btnY = 535;
        const btnW = 280;
        const btnH = 48;
        const btnX = width / 2 - btnW / 2;

        this.startBtnBg = this.add.graphics();
        this.renderStartBtn(false, btnX, btnY, btnW, btnH);

        this.startBtnText = this.add.text(width / 2, btnY + btnH / 2 - 1, 'INICIAR CARRERA (SOLO)', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        this.startBtnHitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.startBtnHitZone.on('pointerover', () => this.renderStartBtn(true, btnX, btnY, btnW, btnH));
        this.startBtnHitZone.on('pointerout', () => this.renderStartBtn(false, btnX, btnY, btnW, btnH));
        this.startBtnHitZone.on('pointerdown', () => this.launchActiveMode());

        // ── 6. Multiplayer Room Button ──
        const multiBtnY = 595;
        const multiBtnH = 42;
        this.multiBtnBg = this.add.graphics();
        this.renderMultiBtn(false, btnX, multiBtnY, btnW, multiBtnH);

        this.multiBtnText = this.add.text(width / 2, multiBtnY + multiBtnH / 2 - 1, 'SALA MULTIJUGADOR (CLAVE)', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.multiBtnHitZone = this.add.zone(width / 2, multiBtnY + multiBtnH / 2, btnW, multiBtnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.multiBtnHitZone.on('pointerover', () => this.renderMultiBtn(true, btnX, multiBtnY, btnW, multiBtnH));
        this.multiBtnHitZone.on('pointerout', () => this.renderMultiBtn(false, btnX, multiBtnY, btnW, multiBtnH));
        this.multiBtnHitZone.on('pointerdown', () => this.openMultiplayerModal());

        // Controls Hint
        this.add.text(width / 2, 654, 'CONTROLES: [ < ] [ > ] O TECLAS [ A ] [ D ] · RATON O TACTIL', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5);

        // Initial view
        this.switchGameMode('race');

        // Check for ?room= URL parameter for instant testing
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const nameParam = params.get('name');
        if (roomParam) {
            this.openMultiplayerModal(roomParam.toUpperCase(), nameParam || undefined);
        }
    }

    private renderStartBtn(hover: boolean, x: number, y: number, w: number, h: number): void {
        this.startBtnBg.clear();
        this.startBtnBg.fillStyle(0x0F172A, 1);
        this.startBtnBg.fillRect(x, y, w, h);
        this.startBtnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
        this.startBtnBg.fillRect(x + 2, y + 2, w - 4, h - 4);
        this.startBtnBg.fillStyle(0xB45309, 1);
        this.startBtnBg.fillRect(x + 2, y + h - 6, w - 4, 4);
    }

    private renderMultiBtn(hover: boolean, x: number, y: number, w: number, h: number): void {
        this.multiBtnBg.clear();
        this.multiBtnBg.fillStyle(0x0F172A, 1);
        this.multiBtnBg.fillRect(x, y, w, h);
        this.multiBtnBg.fillStyle(hover ? 0x0284C7 : 0x0369A1, 1);
        this.multiBtnBg.fillRect(x + 2, y + 2, w - 4, h - 4);
        this.multiBtnBg.fillStyle(0x0C4A6E, 1);
        this.multiBtnBg.fillRect(x + 2, y + h - 6, w - 4, 4);
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
            this.startBtnText.setText('INICIAR CARRERA (SOLO)');
            this.multiBtnHitZone.setInteractive();
            this.multiBtnBg.setVisible(true);
            this.multiBtnText.setVisible(true);
        } else {
            this.showCatcherModeInfo();
            this.startBtnText.setText('JUGAR ATRAPA-ENERGIA');
            this.multiBtnHitZone.disableInteractive();
            this.multiBtnBg.setVisible(false);
            this.multiBtnText.setVisible(false);
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
            '• Circuito continuo de descenso vertiginoso.',
            '• Turbos de viento suman +50 km/h y energía limpia.',
            '• Esquiva rocas y postes para evitar trompos.',
            '• Modo Solo o Multijugador en tiempo real por Salas.'
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
            '• Atrapa Sol (+10), Viento (+15), Hidro (+20) y Baterías (+35).',
            '• CUIDADO: si dejas caer energía limpia pierdes 1 vida.',
            '• Esquiva barriles de petróleo, carbón y sobrecargas.',
            '• Cuentas con 5 vidas de estabilidad en la red.'
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

    // ── MULTIPLAYER ROOM MODAL & LOBBY ──
    public openMultiplayerModal(initialRoom?: string, initialName?: string): void {
        if (this.multiplayerModal) {
            this.multiplayerModal.destroy();
        }

        if (initialRoom) this.currentRoomKey = initialRoom;
        if (initialName) this.currentPilotName = initialName;

        const { width, height } = this.scale;
        this.multiplayerModal = this.add.container(0, 0).setDepth(1000);

        // Dark scrim
        const scrim = this.add.graphics();
        scrim.fillStyle(0x0F172A, 0.65);
        scrim.fillRect(0, 0, width, height);
        this.multiplayerModal.add(scrim);

        // Card setup
        const cardW = 430;
        const cardH = 460;
        const cardX = (width - cardW) / 2;
        const cardY = (height - cardH) / 2;

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x000000, 0.15);
        cardBg.fillRect(cardX + 4, cardY + 4, cardW, cardH);
        cardBg.fillStyle(0xFFFFFF, 1);
        cardBg.fillRect(cardX, cardY, cardW, cardH);
        cardBg.lineStyle(2, 0xCBD5E1, 1);
        cardBg.strokeRect(cardX, cardY, cardW, cardH);
        this.multiplayerModal.add(cardBg);

        // Header Badge
        const badgeGfx = this.add.graphics();
        badgeGfx.fillStyle(0xDCFCE7, 1);
        badgeGfx.fillRect(width / 2 - 140, cardY + 16, 280, 22);
        badgeGfx.lineStyle(1.5, 0x16A34A, 1);
        badgeGfx.strokeRect(width / 2 - 140, cardY + 16, 280, 22);
        this.multiplayerModal.add(badgeGfx);

        const badgeText = this.add.text(width / 2, cardY + 27, 'MULTIPLAYER ONLINE · SALA EN VIVO', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#15803D'
        }).setOrigin(0.5);
        this.multiplayerModal.add(badgeText);

        // Title
        const titleText = this.add.text(width / 2, cardY + 48, 'SALA DE CARRERA MULTIJUGADOR', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7'
        }).setOrigin(0.5);
        this.multiplayerModal.add(titleText);

        const subtitleText = this.add.text(width / 2, cardY + 70, 'Compite en vivo ingresando la misma clave de sala', {
            fontSize: '12px',
            fontFamily: "'Outfit', sans-serif",
            color: '#64748B'
        }).setOrigin(0.5);
        this.multiplayerModal.add(subtitleText);

        // Render Room Form (or Lobby if already joined)
        if (networkManager.isMultiplayerActive()) {
            this.renderLobbyView(cardX, cardY, cardW);
        } else {
            this.renderJoinFormView(cardX, cardY, cardW);
        }

        // Setup Network Listeners
        this.setupMultiplayerListeners();

        // If initial room provided via URL, auto-join
        if (initialRoom && !networkManager.isMultiplayerActive()) {
            networkManager.joinRoom(this.currentRoomKey, this.currentPilotName);
        }
    }

    private renderJoinFormView(cardX: number, cardY: number, cardW: number): void {
        if (!this.multiplayerModal) return;
        const width = this.scale.width;

        // Container for form elements
        const formContainer = this.add.container(0, 0);
        this.multiplayerModal.add(formContainer);

        // Section 1: Clave de Sala
        const keyBoxY = cardY + 100;
        const keyBoxGfx = this.add.graphics();
        keyBoxGfx.fillStyle(0xF8FAFC, 1);
        keyBoxGfx.fillRect(cardX + 16, keyBoxY, cardW - 32, 90);
        keyBoxGfx.lineStyle(1, 0xE2E8F0, 1);
        keyBoxGfx.strokeRect(cardX + 16, keyBoxY, cardW - 32, 90);
        formContainer.add(keyBoxGfx);

        const keyLabel = this.add.text(cardX + 28, keyBoxY + 12, 'CLAVE DE SALA (ROOM KEY)', {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            fontStyle: 'bold',
            color: '#0284C7'
        });
        formContainer.add(keyLabel);

        const keyValueText = this.add.text(cardX + 28, keyBoxY + 34, `SALA: [ ${this.currentRoomKey} ]`, {
            fontSize: '13px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        });
        formContainer.add(keyValueText);

        // Quick Preset Keys
        const keys = ['ODS7', '2030', 'SALA1', 'CAMBIAR'];
        const kw = 78;
        keys.forEach((k, idx) => {
            const kx = cardX + 28 + idx * (kw + 8);
            const ky = keyBoxY + 58;
            const kGfx = this.add.graphics();
            kGfx.fillStyle(0xE2E8F0, 1);
            kGfx.fillRect(kx, ky, kw, 22);
            formContainer.add(kGfx);

            const kText = this.add.text(kx + kw / 2, ky + 11, k, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#334155'
            }).setOrigin(0.5);
            formContainer.add(kText);

            const kHit = this.add.zone(kx + kw / 2, ky + 11, kw, 22).setOrigin(0.5).setInteractive({ useHandCursor: true });
            formContainer.add(kHit);
            kHit.on('pointerdown', () => {
                if (k === 'CAMBIAR') {
                    const customKey = window.prompt('Ingresa la clave de sala (ej. ODS7, SALA1):', this.currentRoomKey);
                    if (customKey && customKey.trim()) {
                        this.currentRoomKey = customKey.trim().toUpperCase().slice(0, 8);
                        keyValueText.setText(`SALA: [ ${this.currentRoomKey} ]`);
                    }
                } else {
                    this.currentRoomKey = k;
                    keyValueText.setText(`SALA: [ ${this.currentRoomKey} ]`);
                }
            });
        });

        // Section 2: Nombre de Piloto
        const nameBoxY = cardY + 205;
        const nameBoxGfx = this.add.graphics();
        nameBoxGfx.fillStyle(0xF8FAFC, 1);
        nameBoxGfx.fillRect(cardX + 16, nameBoxY, cardW - 32, 70);
        nameBoxGfx.lineStyle(1, 0xE2E8F0, 1);
        nameBoxGfx.strokeRect(cardX + 16, nameBoxY, cardW - 32, 70);
        formContainer.add(nameBoxGfx);

        const nameLabel = this.add.text(cardX + 28, nameBoxY + 12, 'TU NOMBRE DE PILOTO', {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            fontStyle: 'bold',
            color: '#16A34A'
        });
        formContainer.add(nameLabel);

        const nameValueText = this.add.text(cardX + 28, nameBoxY + 36, `PILOTO: [ ${this.currentPilotName} ]`, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        });
        formContainer.add(nameValueText);

        const editNameBtn = this.add.text(cardX + cardW - 130, nameBoxY + 36, '[ EDITAR ]', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7'
        }).setInteractive({ useHandCursor: true });
        formContainer.add(editNameBtn);
        editNameBtn.on('pointerdown', () => {
            const customName = window.prompt('Ingresa tu nombre de piloto:', this.currentPilotName);
            if (customName && customName.trim()) {
                this.currentPilotName = customName.trim().slice(0, 12);
                nameValueText.setText(`PILOTO: [ ${this.currentPilotName} ]`);
            }
        });

        // Action Buttons: ENTRAR A LA SALA & CANCELAR
        const actionY = cardY + 300;
        const enterBtn = this.add.graphics();
        enterBtn.fillStyle(0x0F172A, 1);
        enterBtn.fillRect(width / 2 - 130, actionY, 260, 42);
        enterBtn.fillStyle(0x0284C7, 1);
        enterBtn.fillRect(width / 2 - 128, actionY + 2, 256, 38);
        enterBtn.fillStyle(0x0369A1, 1);
        enterBtn.fillRect(width / 2 - 128, actionY + 36, 256, 4);
        formContainer.add(enterBtn);

        const enterText = this.add.text(width / 2, actionY + 21, 'ENTRAR A LA SALA', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);
        formContainer.add(enterText);

        const enterHit = this.add.zone(width / 2, actionY + 21, 260, 42).setOrigin(0.5).setInteractive({ useHandCursor: true });
        formContainer.add(enterHit);
        enterHit.on('pointerdown', async () => {
            enterText.setText('CONECTANDO...');
            const ok = await networkManager.joinRoom(this.currentRoomKey, this.currentPilotName);
            if (!ok) {
                enterText.setText('ERROR AL CONECTAR');
                this.time.delayedCall(1500, () => enterText.setText('ENTRAR A LA SALA'));
            }
        });

        // Cancel button
        const cancelText = this.add.text(width / 2, cardY + 375, '[ VOLVER AL MENU ]', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        formContainer.add(cancelText);
        cancelText.on('pointerdown', () => this.closeMultiplayerModal());
    }

    private renderLobbyView(cardX: number, cardY: number, cardW: number): void {
        if (!this.multiplayerModal) return;
        const width = this.scale.width;

        // Container for lobby elements
        const lobbyContainer = this.add.container(0, 0);
        this.multiplayerModal.add(lobbyContainer);

        // Room Status Banner
        const bannerY = cardY + 100;
        const bannerGfx = this.add.graphics();
        bannerGfx.fillStyle(0xF0FDF4, 1);
        bannerGfx.fillRect(cardX + 16, bannerY, cardW - 32, 40);
        bannerGfx.lineStyle(1.5, 0x16A34A, 1);
        bannerGfx.strokeRect(cardX + 16, bannerY, cardW - 32, 40);
        lobbyContainer.add(bannerGfx);

        const roomInfoText = this.add.text(width / 2, bannerY + 20, `SALA ACTIVA: [ ${networkManager.roomCode} ]`, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#15803D'
        }).setOrigin(0.5);
        lobbyContainer.add(roomInfoText);

        // Players Box
        const playersBoxY = cardY + 150;
        const playersBoxGfx = this.add.graphics();
        playersBoxGfx.fillStyle(0xF8FAFC, 1);
        playersBoxGfx.fillRect(cardX + 16, playersBoxY, cardW - 32, 130);
        playersBoxGfx.lineStyle(1, 0xE2E8F0, 1);
        playersBoxGfx.strokeRect(cardX + 16, playersBoxY, cardW - 32, 130);
        lobbyContainer.add(playersBoxGfx);

        const playersHeader = this.add.text(cardX + 28, playersBoxY + 12, `JUGADORES CONECTADOS (${networkManager.roomPlayers.length}/50)`, {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            fontStyle: 'bold',
            color: '#0284C7'
        });
        lobbyContainer.add(playersHeader);

        // List up to 4 players, then show count for remaining to avoid box overflow
        const visiblePlayers = networkManager.roomPlayers.slice(0, 4);
        visiblePlayers.forEach((p, idx) => {
            const py = playersBoxY + 36 + idx * 22;
            const isLocal = p.id === networkManager.playerId;
            const roleTag = p.isHost ? '(ANFITRIÓN)' : '(LISTO)';
            const colorDot = isLocal ? '•' : '○';

            const pText = this.add.text(cardX + 32, py, `${colorDot} ${p.name} ${roleTag}`, {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: isLocal ? '#0284C7' : '#334155'
            });
            lobbyContainer.add(pText);
        });

        if (networkManager.roomPlayers.length > 4) {
            const extraCount = networkManager.roomPlayers.length - 4;
            const extraText = this.add.text(cardX + 32, playersBoxY + 36 + 4 * 22, `+ ${extraCount} piloto(s) más en la sala`, {
                fontSize: '11px',
                fontFamily: "'Outfit', sans-serif",
                fontStyle: 'italic',
                color: '#64748B'
            });
            lobbyContainer.add(extraText);
        }

        // Instructions
        const roleMsg = networkManager.isHost
            ? 'Eres el anfitrión. Presiona "INICIAR CARRERA" cuando todos estén listos.'
            : 'Esperando a que el anfitrión inicie la carrera para todos...';

        const roleText = this.add.text(width / 2, cardY + 295, roleMsg, {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            color: '#64748B',
            align: 'center',
            wordWrap: { width: cardW - 40, useAdvancedWrap: true }
        }).setOrigin(0.5, 0);
        lobbyContainer.add(roleText);

        // Start button (active for host)
        const startY = cardY + 345;
        if (networkManager.isHost) {
            const startBtn = this.add.graphics();
            startBtn.fillStyle(0x0F172A, 1);
            startBtn.fillRect(width / 2 - 130, startY, 260, 42);
            startBtn.fillStyle(0x16A34A, 1);
            startBtn.fillRect(width / 2 - 128, startY + 2, 256, 38);
            startBtn.fillStyle(0x15803D, 1);
            startBtn.fillRect(width / 2 - 128, startY + 36, 256, 4);
            lobbyContainer.add(startBtn);

            const startText = this.add.text(width / 2, startY + 21, 'INICIAR CARRERA', {
                fontSize: '10px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#FFFFFF'
            }).setOrigin(0.5);
            lobbyContainer.add(startText);

            const startHit = this.add.zone(width / 2, startY + 21, 260, 42).setOrigin(0.5).setInteractive({ useHandCursor: true });
            lobbyContainer.add(startHit);
            startHit.on('pointerdown', () => {
                startHit.disableInteractive();
                startText.setText('INICIANDO...');
                networkManager.startRace();
            });
        }

        // Leave Room Button
        const leaveText = this.add.text(width / 2, cardY + 405, '[ SALIR DE LA SALA ]', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#DC2626'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        lobbyContainer.add(leaveText);
        leaveText.on('pointerdown', () => {
            networkManager.leaveRoom();
            this.openMultiplayerModal();
        });
    }

    private setupMultiplayerListeners(): void {
        this.removeMultiplayerListeners();
        EventBus.on(GameEvents.ROOM_JOINED, this.handleRoomJoined, this);
        EventBus.on(GameEvents.ROOM_UPDATED, this.handleRoomUpdated, this);
        EventBus.on(GameEvents.RACE_COUNTDOWN, this.handleRaceCountdown, this);
        EventBus.on(GameEvents.RACE_STARTED, this.handleRaceStarted, this);

        this.events.once('shutdown', () => {
            this.removeMultiplayerListeners();
        });
    }

    private removeMultiplayerListeners(): void {
        EventBus.off(GameEvents.ROOM_JOINED, this.handleRoomJoined, this);
        EventBus.off(GameEvents.ROOM_UPDATED, this.handleRoomUpdated, this);
        EventBus.off(GameEvents.RACE_COUNTDOWN, this.handleRaceCountdown, this);
        EventBus.off(GameEvents.RACE_STARTED, this.handleRaceStarted, this);
    }

    private handleRoomJoined = (): void => {
        if (this.multiplayerModal) {
            this.multiplayerModal.removeAll(true);
            this.openMultiplayerModal();
        }
    };

    private handleRoomUpdated = (): void => {
        if (this.multiplayerModal && networkManager.isMultiplayerActive()) {
            this.multiplayerModal.removeAll(true);
            this.openMultiplayerModal();
        }
    };

    private handleRaceCountdown = (data: { countdownSeconds: number }): void => {
        this.closeMultiplayerModal();
        this.cameras.main.fadeOut(150, 241, 245, 249);
        this.time.delayedCall(150, () => {
            this.scene.start('MainScene', {
                multiplayer: true,
                roomCode: networkManager.roomCode,
                skipGuide: true,
                countdownSeconds: data?.countdownSeconds || 3,
            });
        });
    };

    private handleRaceStarted = (): void => {
        this.closeMultiplayerModal();
        this.cameras.main.fadeOut(150, 241, 245, 249);
        this.time.delayedCall(150, () => {
            this.scene.start('MainScene', {
                multiplayer: true,
                roomCode: networkManager.roomCode,
                skipGuide: true,
                countdownSeconds: 0,
            });
        });
    };

    private closeMultiplayerModal(): void {
        if (this.multiplayerModal) {
            this.multiplayerModal.destroy();
            this.multiplayerModal = undefined;
        }
        this.removeMultiplayerListeners();
    }
}
