import { Scene } from 'phaser';
import { GameModeId, getApplianceEquivalence, ROTATING_LESSONS, ApplianceComparison } from '../types/game';

interface WinSceneData {
    mode?: GameModeId;
    time: string;
    kwh: number;
    distance?: number;
}

export class WinScene extends Scene {
    private mode: GameModeId = 'race';
    private finalTime: string = '0.0';
    private finalKwh: number = 0;
    private finalCo2: number = 0;
    private currentLessonIdx: number = 0;

    private lessonTitleText!: Phaser.GameObjects.Text;
    private lessonBodyText!: Phaser.GameObjects.Text;

    constructor() {
        super('WinScene');
    }

    init(data: WinSceneData): void {
        this.mode = data.mode || 'race';
        this.finalTime = data.time || '45.0';
        this.finalKwh = Math.max(1, data.kwh || 120);
        this.finalCo2 = Math.round(this.finalKwh * 0.45);
        this.currentLessonIdx = Phaser.Math.Between(0, ROTATING_LESSONS.length - 1);
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // ── 1. Clean Light Mode Background ──
        const bg = this.add.graphics();
        bg.fillStyle(0xF1F5F9, 1);
        bg.fillRect(0, 0, width, height);

        // ── 2. Top Header Banner ──
        const bannerY = 36;
        const bannerW = width - 48;
        const bannerX = 24;

        const banner = this.add.graphics();
        banner.fillStyle(0xDCFCE7, 1);
        banner.fillRect(bannerX, bannerY, bannerW, 36);
        banner.lineStyle(1, 0x16A34A, 1);
        banner.strokeRect(bannerX, bannerY, bannerW, 36);

        const bannerTitle = this.mode === 'race'
            ? '¡CARRERA META 2030 COMPLETADA!'
            : '¡RESERVA BESS 2030 CARGADA!';

        this.add.text(width / 2, bannerY + 18, bannerTitle, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#15803D'
        }).setOrigin(0.5);

        // ── 3. Animated Mode Trophy / Mascot ──
        const spriteKey = this.mode === 'race' ? 'wind_glider' : 'battery';
        const trophy = this.add.sprite(width / 2, 110, spriteKey).setScale(2.6);
        this.tweens.add({
            targets: trophy,
            y: 102,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const subTitle = this.mode === 'race'
            ? 'CIRCUITO RED RENOVABLE 2030'
            : 'SISTEMA DE BATERIAS Y ESTABILIDAD';

        this.add.text(width / 2, 145, subTitle, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7'
        }).setOrigin(0.5);

        // ── 4. Card 1: Telemetria de Produccion ──
        const cardX = 24;
        const cardW = width - 48;
        const cardY = 168;
        const cardH = 150;

        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 1);
        card.fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0xCBD5E1, 1);
        card.strokeRect(cardX, cardY, cardW, cardH);

        this.add.text(cardX + 16, cardY + 14, 'BALANCE ENERGETICO ODS 7', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        });

        const stats = [
            { label: 'TIEMPO', val: `${this.finalTime} s`, color: '#0F172A' },
            { label: 'ENERGIA LIMPIA', val: `${this.finalKwh} kWh`, color: '#D97706' },
            { label: 'CO2 EVITADO', val: `~${this.finalCo2} kg`, color: '#16A34A' },
            { label: 'MODO', val: this.mode === 'race' ? 'CARRERA' : 'ATRAPA-BESS', color: '#0284C7' }
        ];

        stats.forEach((row, i) => {
            const yPos = cardY + 38 + i * 26;
            this.add.text(cardX + 16, yPos, row.label, {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#64748B'
            });

            this.add.text(cardX + cardW - 16, yPos, row.val, {
                fontSize: '10px',
                fontFamily: "'Press Start 2P', monospace",
                color: row.color
            }).setOrigin(1, 0);
        });

        // ── 5. Card 2: Equivalencia con Electrodomesticos Reales ──
        const appCardY = 332;
        const appCardH = 155;

        const appCard = this.add.graphics();
        appCard.fillStyle(0xFFFFFF, 1);
        appCard.fillRect(cardX, appCardY, cardW, appCardH);
        appCard.lineStyle(1, 0xCBD5E1, 1);
        appCard.strokeRect(cardX, appCardY, cardW, appCardH);

        this.add.text(cardX + 16, appCardY + 14, 'EQUIVALENCIA CON ELECTRODOMESTICOS', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#B45309'
        });

        const divider1 = this.add.graphics();
        divider1.fillStyle(0xE2E8F0, 1);
        divider1.fillRect(cardX + 16, appCardY + 28, cardW - 32, 1);

        const comparisons: ApplianceComparison[] = getApplianceEquivalence(this.finalKwh);
        const comp1 = comparisons[0]; // Fridge
        const comp2 = comparisons[2]; // AC or Washer

        this.add.text(cardX + 16, appCardY + 38, `${comp1.icon} ${comp1.appliance}:`, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        });

        this.add.text(cardX + 16, appCardY + 54, comp1.description, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569',
            lineSpacing: 4,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true }
        });

        this.add.text(cardX + 16, appCardY + 95, `${comp2.icon} ${comp2.appliance}:`, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        });

        this.add.text(cardX + 16, appCardY + 111, comp2.description, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569',
            lineSpacing: 4,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true }
        });

        // ── 6. Card 3: Leccion Rotativa ODS 7 ──
        const lessonCardY = 502;
        const lessonCardH = 175;

        const lessonCard = this.add.graphics();
        lessonCard.fillStyle(0xFFFFFF, 1);
        lessonCard.fillRect(cardX, lessonCardY, cardW, lessonCardH);
        lessonCard.lineStyle(1, 0xCBD5E1, 1);
        lessonCard.strokeRect(cardX, lessonCardY, cardW, lessonCardH);

        this.add.text(cardX + 16, lessonCardY + 14, 'DATO ODS 7 E INGENIERIA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7'
        });

        // Button to cycle through lessons
        const cycleBtn = this.add.text(cardX + cardW - 16, lessonCardY + 14, '[ OTRO DATO ]', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#D97706'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        cycleBtn.on('pointerover', () => cycleBtn.setColor('#B45309'));
        cycleBtn.on('pointerout', () => cycleBtn.setColor('#D97706'));
        cycleBtn.on('pointerdown', () => this.nextLesson(cardX, lessonCardY, cardW));

        const divider2 = this.add.graphics();
        divider2.fillStyle(0xE2E8F0, 1);
        divider2.fillRect(cardX + 16, lessonCardY + 28, cardW - 32, 1);

        const initialLesson = ROTATING_LESSONS[this.currentLessonIdx];

        this.lessonTitleText = this.add.text(cardX + 16, lessonCardY + 38, initialLesson.title, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        });

        this.lessonBodyText = this.add.text(cardX + 16, lessonCardY + 56, initialLesson.text, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569',
            lineSpacing: 6,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true }
        });

        // ── 7. Primary Action: REINTENTAR MODO ACTUAL ──
        const btnY = 700;
        const btnW = 260;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;

        const btnBg = this.add.graphics();
        const renderBtn = (hover: boolean): void => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };
        renderBtn(false);

        const restartLabel = this.mode === 'race' ? 'CORRER OTRA VEZ' : 'VOLVER A ATRAPAR';
        this.add.text(width / 2, btnY + btnH / 2 - 1, restartLabel, {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerRestart = (): void => {
            hitZone.disableInteractive();
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                if (this.mode === 'race') {
                    this.scene.start('MainScene');
                } else {
                    this.scene.start('CatcherScene');
                }
            });
        };

        hitZone.on('pointerover', () => renderBtn(true));
        hitZone.on('pointerout', () => renderBtn(false));
        hitZone.on('pointerdown', triggerRestart);

        // ── 8. Secondary Action: MENU PRINCIPAL ──
        const menuBtnY = 760;
        const menuBtnH = 40;
        const menuBtnX = width / 2 - btnW / 2;

        const menuBg = this.add.graphics();
        const renderMenuBtn = (hover: boolean): void => {
            menuBg.clear();
            menuBg.fillStyle(hover ? 0xE2E8F0 : 0xFFFFFF, 1);
            menuBg.fillRect(menuBtnX, menuBtnY, btnW, menuBtnH);
            menuBg.lineStyle(1, hover ? 0x94A3B8 : 0xCBD5E1, 1);
            menuBg.strokeRect(menuBtnX, menuBtnY, btnW, menuBtnH);
        };
        renderMenuBtn(false);

        this.add.text(width / 2, menuBtnY + menuBtnH / 2, 'MENU PRINCIPAL', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#334155'
        }).setOrigin(0.5);

        const menuHitZone = this.add.zone(width / 2, menuBtnY + menuBtnH / 2, btnW, menuBtnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerMenu = (): void => {
            menuHitZone.disableInteractive();
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MenuScene');
            });
        };

        menuHitZone.on('pointerover', () => renderMenuBtn(true));
        menuHitZone.on('pointerout', () => renderMenuBtn(false));
        menuHitZone.on('pointerdown', triggerMenu);

        // Keyboard triggers
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', triggerRestart);
            this.input.keyboard.once('keydown-ENTER', triggerRestart);
            this.input.keyboard.once('keydown-ESC', triggerMenu);
        }

        this.cameras.main.fadeIn(200, 241, 245, 249);
    }

    private nextLesson(_cardX: number, _cardY: number, _cardW: number): void {
        this.currentLessonIdx = (this.currentLessonIdx + 1) % ROTATING_LESSONS.length;
        const lesson = ROTATING_LESSONS[this.currentLessonIdx];
        this.lessonTitleText.setText(lesson.title);
        this.lessonBodyText.setText(lesson.text);
    }
}
