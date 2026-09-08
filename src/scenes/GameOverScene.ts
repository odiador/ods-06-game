import { Scene } from 'phaser';
import { GameModeId } from '../types/game';

interface GameOverData {
    mode?: GameModeId;
    score: number;
    progress: number;
}

export class GameOverScene extends Scene {
    private mode: GameModeId = 'race';
    private finalScore: number = 0;
    private finalProgress: number = 0;

    constructor() {
        super('GameOverScene');
    }

    init(data: GameOverData): void {
        this.mode = data.mode || 'race';
        this.finalScore = data.score || 0;
        this.finalProgress = Math.round(data.progress || 0);
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // Light Mode Background
        const bg = this.add.graphics();
        bg.fillStyle(0xF1F5F9, 1);
        bg.fillRect(0, 0, width, height);

        // Alert Banner
        const banner = this.add.graphics();
        banner.fillStyle(0xFEE2E2, 1);
        banner.fillRect(width / 2 - 140, 80, 280, 36);
        banner.lineStyle(1, 0xDC2626, 1);
        banner.strokeRect(width / 2 - 140, 80, 280, 36);

        this.add.text(width / 2, 98, 'FALLA EN LA RED ELECTRICA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#DC2626'
        }).setOrigin(0.5);

        // Main Title
        this.add.text(width / 2, 145, 'APAGON\nDE SISTEMA', {
            fontSize: '22px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#991B1B',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5, 0);

        // Stats card
        const cardX = 24;
        const cardW = width - 48;
        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 1);
        card.fillRect(cardX, 260, cardW, 105);
        card.lineStyle(1, 0xFCA5A5, 1);
        card.strokeRect(cardX, 260, cardW, 105);

        this.add.text(width / 2, 290, `ENERGIA REUNIDA: ${this.finalScore} kWh`, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        this.add.text(width / 2, 325, `OBJETIVO ALCANZADO: ${this.finalProgress}%`, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#DC2626'
        }).setOrigin(0.5);

        // Educational message
        const message = [
            'LECCION DE SOSTENIBILIDAD:',
            'La dependencia de combustibles fosiles o la',
            'perdida de fuentes limpias desestabiliza la red.',
            'Los sistemas de almacenamiento BESS y micro-redes',
            'permiten recuperar la energia rapidamente.'
        ].join('\n');

        this.add.text(width / 2, 420, message, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#475569',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // Retry button
        const btnY = 540;
        const btnW = 250;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;

        const btnBg = this.add.graphics();
        const renderRetryBtn = (hover: boolean): void => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };
        renderRetryBtn(false);

        const retryLabel = this.mode === 'race' ? 'REINTENTAR CARRERA' : 'REINTENTAR ATRAPAR';
        this.add.text(width / 2, btnY + btnH / 2 - 1, retryLabel, {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const retry = (): void => {
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

        hitZone.on('pointerover', () => renderRetryBtn(true));
        hitZone.on('pointerout', () => renderRetryBtn(false));
        hitZone.on('pointerdown', retry);

        // Menu button
        const menuBtnY = 600;
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

        const toMenu = (): void => {
            menuHitZone.disableInteractive();
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MenuScene');
            });
        };

        menuHitZone.on('pointerover', () => renderMenuBtn(true));
        menuHitZone.on('pointerout', () => renderMenuBtn(false));
        menuHitZone.on('pointerdown', toMenu);

        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', retry);
            this.input.keyboard.once('keydown-ENTER', retry);
            this.input.keyboard.once('keydown-ESC', toMenu);
        }

        this.cameras.main.fadeIn(200, 241, 245, 249);
    }
}
