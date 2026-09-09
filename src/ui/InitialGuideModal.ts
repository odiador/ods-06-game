import { Scene } from 'phaser';
import { SoundFX } from '../systems/SoundFX';

export interface GuideModalOptions {
    mode: 'race' | 'catcher';
    onComplete: () => void;
    durationSeconds?: number;
}

export class InitialGuideModal {
    private scene: Scene;
    private options: GuideModalOptions;
    private container: Phaser.GameObjects.Container;
    private secondsRemaining: number;
    private totalSeconds: number;
    private countdownText!: Phaser.GameObjects.Text;
    private progressBarGfx!: Phaser.GameObjects.Graphics;
    private timerEvent?: Phaser.Time.TimerEvent;
    private isClosed: boolean = false;
    private keyListener?: (e: KeyboardEvent) => void;

    constructor(scene: Scene, options: GuideModalOptions) {
        this.scene = scene;
        this.options = options;
        this.totalSeconds = options.durationSeconds || 10;
        this.secondsRemaining = this.totalSeconds;

        this.container = this.scene.add.container(0, 0).setDepth(600);
        this.buildModal();
        this.startTimer();
    }

    private buildModal(): void {
        const { width, height } = this.scene.scale;

        // 1. Semi-transparent dark scrim
        const scrim = this.scene.add.graphics();
        scrim.fillStyle(0x0F172A, 0.60);
        scrim.fillRect(0, 0, width, height);
        this.container.add(scrim);

        // 2. Centered Card Container
        const cardW = 440;
        const cardH = 740;
        const cardX = (width - cardW) / 2;
        const cardY = (height - cardH) / 2;

        const cardGfx = this.scene.add.graphics();
        // Drop shadow
        cardGfx.fillStyle(0x000000, 0.12);
        cardGfx.fillRect(cardX + 4, cardY + 4, cardW, cardH);

        // Solid white surface
        cardGfx.fillStyle(0xFFFFFF, 1);
        cardGfx.fillRect(cardX, cardY, cardW, cardH);
        cardGfx.lineStyle(2, 0xCBD5E1, 1);
        cardGfx.strokeRect(cardX, cardY, cardW, cardH);
        this.container.add(cardGfx);

        // 3. Top Header Badge
        const badgeW = 280;
        const badgeH = 24;
        const badgeGfx = this.scene.add.graphics();
        badgeGfx.fillStyle(0xFEF3C7, 1);
        badgeGfx.fillRect(width / 2 - badgeW / 2, cardY + 18, badgeW, badgeH);
        badgeGfx.lineStyle(1, 0xF59E0B, 1);
        badgeGfx.strokeRect(width / 2 - badgeW / 2, cardY + 18, badgeW, badgeH);
        this.container.add(badgeGfx);

        const badgeText = this.scene.add.text(width / 2, cardY + 30, 'ODS 7 · GUIA INICIAL (10s)', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#B45309',
            resolution: 2
        }).setOrigin(0.5);
        this.container.add(badgeText);

        // 4. Title & Subtitle
        const isRace = this.options.mode === 'race';
        const titleText = this.scene.add.text(
            width / 2,
            cardY + 58,
            isRace ? 'CARRERA RED RENOVABLE' : 'ATRAPA-ENERGIA BESS',
            {
                fontSize: '11px',
                fontFamily: "'Press Start 2P', monospace",
                color: isRace ? '#0284C7' : '#16A34A',
                align: 'center',
                resolution: 2
            }
        ).setOrigin(0.5, 0);
        this.container.add(titleText);

        const subtitleText = this.scene.add.text(
            width / 2,
            cardY + 78,
            isRace ? 'DESPLAZA TU PLANEADOR HACIA LA META 2030' : 'ALMACENA 1.000 kWh EN BANCOS DE BATERIAS',
            {
                fontSize: '10px',
                fontFamily: "'Silkscreen', monospace",
                color: '#64748B',
                align: 'center',
                resolution: 2
            }
        ).setOrigin(0.5, 0);
        this.container.add(subtitleText);

        // 5. Sections Container
        let currentY = cardY + 105;

        // --- Section 1: Misión ---
        currentY = this.createSectionBox(
            cardX + 16,
            currentY,
            cardW - 32,
            isRace ? '🎯 OBJETIVO DE LA CARRERA' : '🎯 OBJETIVO DEL SISTEMA BESS',
            isRace
                ? [
                    '• Cruza la meta de 2.030 metros en el menor tiempo.',
                    '• Cada turbo de viento otorga +50 km/h y suma kWh limpios.',
                    '• Recolecta baterías para alimentar la red nacional.'
                ]
                : [
                    '• Almacena 1.000 kWh limpios en las baterías BESS.',
                    '• Atrapa Sol (+10), Viento (+15), Hidro (+20) y Baterías (+35).',
                    '• Cuentas con 5 vidas iniciales de estabilidad de red.'
                ],
            isRace ? '#0284C7' : '#16A34A'
        );

        // --- Section 2: Qué esquivar y reglas críticas ---
        currentY = this.createSectionBox(
            cardX + 16,
            currentY + 10,
            cardW - 32,
            '⚠️ REGLAS CRITICAS Y PELIGROS',
            isRace
                ? [
                    '• 🪨 Rocas y postes: causan trompo de 360° y frenan -40 km/h.',
                    '• ⚡ Turbos: impulsan la velocidad punta hasta 220 km/h.',
                    '• Optimiza tu trazada para lograr el récord de tiempo.'
                ]
                : [
                    '• 🚨 ¡CUIDADO! Si dejas caer energía limpia, PIERDES 1 VIDA.',
                    '• 🛢️ Barriles de petróleo, carbón y sobrecargas restan 1 vida.',
                    '• La velocidad y frecuencia de caída aumentan con el progreso.'
                ],
            '#DC2626'
        );

        // --- Section 3: Controles ---
        currentY = this.createSectionBox(
            cardX + 16,
            currentY + 10,
            cardW - 32,
            '🎮 CONTROLES (PC Y MOVIL)',
            [
                '• Teclado: Flechas [ ⬅ ➡ ] o teclas [ A ] y [ D ].',
                '• Ratón / Pantalla Táctil: Clic o toca y arrastra a los lados.',
                '• El juego se pausa automáticamente si cambias de ventana.'
            ],
            '#475569'
        );

        // 6. Bottom Countdown & Action Button
        const bottomY = cardY + cardH - 120;

        this.countdownText = this.scene.add.text(
            width / 2,
            bottomY,
            `⏱ INICIANDO EN: ${this.secondsRemaining}s...`,
            {
                fontSize: '10px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#D97706',
                resolution: 2
            }
        ).setOrigin(0.5);
        this.container.add(this.countdownText);

        // Progress Bar
        const barW = 340;
        const barH = 8;
        const barX = width / 2 - barW / 2;
        const barY = bottomY + 18;

        const barBg = this.scene.add.graphics();
        barBg.fillStyle(0xE2E8F0, 1);
        barBg.fillRect(barX, barY, barW, barH);
        this.container.add(barBg);

        this.progressBarGfx = this.scene.add.graphics();
        this.container.add(this.progressBarGfx);
        this.updateProgressBar(barX, barY, barW, barH);

        // Action Button: "EMPEZAR YA"
        const btnW = 260;
        const btnH = 44;
        const btnX = width / 2 - btnW / 2;
        const btnY = barY + 22;

        const btnBg = this.scene.add.graphics();
        const renderBtn = (hover: boolean): void => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };
        renderBtn(false);
        this.container.add(btnBg);

        const btnText = this.scene.add.text(width / 2, btnY + btnH / 2 - 1, 'EMPEZAR YA ➔', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A',
            resolution: 2
        }).setOrigin(0.5);
        this.container.add(btnText);

        const hitZone = this.scene.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.container.add(hitZone);

        hitZone.on('pointerover', () => renderBtn(true));
        hitZone.on('pointerout', () => renderBtn(false));
        hitZone.on('pointerdown', () => this.dismiss());

        // Keyboard triggers for skipping
        this.keyListener = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.dismiss();
            }
        };
        window.addEventListener('keydown', this.keyListener);
    }

    private createSectionBox(
        x: number,
        y: number,
        w: number,
        title: string,
        lines: string[],
        titleColor: string
    ): number {
        const boxBg = this.scene.add.graphics();
        const padding = 12;

        const titleText = this.scene.add.text(x + padding, y + 10, title, {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: titleColor,
            resolution: 2
        });

        const bodyText = this.scene.add.text(x + padding, y + 26, lines.join('\n'), {
            fontSize: '10px',
            fontFamily: "'Silkscreen', monospace",
            color: '#334155',
            lineSpacing: 5,
            wordWrap: { width: w - padding * 2, useAdvancedWrap: true },
            resolution: 2
        });

        const totalH = Math.max(76, bodyText.height + 38);

        boxBg.fillStyle(0xF8FAFC, 1);
        boxBg.fillRect(x, y, w, totalH);
        boxBg.lineStyle(1, 0xE2E8F0, 1);
        boxBg.strokeRect(x, y, w, totalH);

        this.container.add(boxBg);
        this.container.add(titleText);
        this.container.add(bodyText);

        return y + totalH;
    }

    private updateProgressBar(barX: number, barY: number, barW: number, barH: number): void {
        this.progressBarGfx.clear();
        const ratio = Math.max(0, this.secondsRemaining / this.totalSeconds);
        this.progressBarGfx.fillStyle(0xF59E0B, 1);
        this.progressBarGfx.fillRect(barX, barY, Math.round(barW * ratio), barH);
    }

    private startTimer(): void {
        const { width, height } = this.scene.scale;
        const cardH = 740;
        const cardY = (height - cardH) / 2;
        const bottomY = cardY + cardH - 120;
        const barW = 340;
        const barH = 8;
        const barX = width / 2 - barW / 2;
        const barY = bottomY + 18;

        this.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            repeat: this.totalSeconds - 1,
            callback: () => {
                if (this.isClosed) return;
                this.secondsRemaining--;
                this.countdownText.setText(`⏱ INICIANDO EN: ${this.secondsRemaining}s...`);
                this.updateProgressBar(barX, barY, barW, barH);

                if (this.secondsRemaining <= 0) {
                    this.dismiss();
                }
            }
        });
    }

    public dismiss(): void {
        if (this.isClosed) return;
        this.isClosed = true;

        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }

        if (this.keyListener) {
            window.removeEventListener('keydown', this.keyListener);
            this.keyListener = undefined;
        }

        SoundFX.playMenuClick();

        // Smooth fade out
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 200,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.container.destroy();
                this.options.onComplete();
            }
        });
    }
}
