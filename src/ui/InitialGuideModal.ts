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
    private cardContainer!: Phaser.GameObjects.Container;
    private secondsRemaining: number;
    private totalSeconds: number;
    private countdownText!: Phaser.GameObjects.Text;
    private progressBarGfx!: Phaser.GameObjects.Graphics;
    private timerEvent?: Phaser.Time.TimerEvent;
    private isClosed: boolean = false;
    private keyListener?: (e: KeyboardEvent) => void;

    private barX: number = 0;
    private barY: number = 0;
    private barW: number = 320;
    private barH: number = 6;

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
        const isRace = this.options.mode === 'race';

        // 1. Semi-transparent dark scrim
        const scrim = this.scene.add.graphics();
        scrim.fillStyle(0x0F172A, 0.60);
        scrim.fillRect(0, 0, width, height);
        this.container.add(scrim);

        // 2. Card dimensions & setup
        const cardW = 440;
        const cardX = Math.round((width - cardW) / 2);

        // Card background graphics (will be filled after measuring exact dynamic height)
        const cardGfx = this.scene.add.graphics();
        this.container.add(cardGfx);

        // Card child container for perfect vertical positioning
        this.cardContainer = this.scene.add.container(cardX, 0);
        this.container.add(this.cardContainer);

        // 3. Layout elements inside cardContainer (y coordinates relative to card top = 0)
        let curY = 18;

        // Header Badge
        const badgeW = 270;
        const badgeH = 22;
        const badgeGfx = this.scene.add.graphics();
        badgeGfx.fillStyle(0xFEF3C7, 1);
        badgeGfx.fillRect((cardW - badgeW) / 2, curY, badgeW, badgeH);
        badgeGfx.lineStyle(1.5, 0xF59E0B, 1);
        badgeGfx.strokeRect((cardW - badgeW) / 2, curY, badgeW, badgeH);
        this.cardContainer.add(badgeGfx);

        const badgeText = this.scene.add.text(cardW / 2, curY + 11, 'ODS 7 · GUÍA DE INICIO (10s)', {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            fontStyle: 'bold',
            color: '#B45309'
        }).setOrigin(0.5);
        this.cardContainer.add(badgeText);

        curY += badgeH + 10;

        // Title & Subtitle (No Emojis)
        const titleText = this.scene.add.text(
            cardW / 2,
            curY,
            isRace ? 'CARRERA RED RENOVABLE' : 'ATRAPA-ENERGIA BESS',
            {
                fontSize: '12px',
                fontFamily: "'Press Start 2P', monospace",
                color: isRace ? '#0284C7' : '#16A34A',
                align: 'center',
                padding: { top: 4, bottom: 4 }
            }
        ).setOrigin(0.5, 0);
        this.cardContainer.add(titleText);

        curY += 24;

        const subtitleText = this.scene.add.text(
            cardW / 2,
            curY,
            isRace ? 'Planeador eólico hacia la meta 2.030 metros' : 'Sistema BESS · Acumula 1.000 kWh en baterías',
            {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#64748B',
                align: 'center'
            }
        ).setOrigin(0.5, 0);
        this.cardContainer.add(subtitleText);

        curY += 24;

        // Content Section 1: Misión
        curY = this.createSectionBox(
            this.cardContainer,
            16,
            curY,
            cardW - 32,
            isRace ? 'OBJETIVO DE LA CARRERA' : 'OBJETIVO DE LA MISION',
            isRace
                ? [
                    '• Cruza la meta de 2.030 m en el menor tiempo posible.',
                    '• Turbos de viento: otorgan +50 km/h y suman kWh limpios.',
                    '• Baterías en pista: recógelas para abastecer la red.'
                ]
                : [
                    '• Acumula 1.000 kWh limpios en el banco de baterías BESS.',
                    '• Atrapa Sol (+10), Viento (+15), Hidro (+20) y Baterías (+35).',
                    '• Cuentas con 5 vidas de estabilidad en la red eléctrica.'
                ],
            isRace ? '#0284C7' : '#16A34A'
        );

        curY += 8;

        // Content Section 2: Peligros y Reglas
        curY = this.createSectionBox(
            this.cardContainer,
            16,
            curY,
            cardW - 32,
            'PELIGROS Y REGLAS CLAVE',
            isRace
                ? [
                    '• Rocas y postes: trompo de 360° y frenazo de -40 km/h.',
                    '• Mantén la trazada en el centro para evitar fricción.',
                    '• Conduce con precisión para romper el récord de tiempo.'
                ]
                : [
                    '• Dejar caer energía limpia fuera de pantalla resta 1 vida.',
                    '• Barriles de petróleo, carbón y sobrecargas restan 1 vida.',
                    '• La velocidad y frecuencia de caída aumentan con el tiempo.'
                ],
            '#DC2626'
        );

        curY += 8;

        // Content Section 3: Controles
        curY = this.createSectionBox(
            this.cardContainer,
            16,
            curY,
            cardW - 32,
            'CONTROLES DE JUEGO',
            [
                '• Teclado: Flechas [ < ] [ > ] o teclas [ A ] y [ D ].',
                '• Ratón / Táctil: Clic o toca y arrastra hacia los lados.',
                '• Pausa: Automática al cambiar de ventana o pestaña.'
            ],
            '#475569'
        );

        curY += 14;

        // Countdown Timer Text
        this.countdownText = this.scene.add.text(
            cardW / 2,
            curY,
            `Iniciando en: ${this.secondsRemaining}s...`,
            {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                fontStyle: 'bold',
                color: '#D97706'
            }
        ).setOrigin(0.5, 0);
        this.cardContainer.add(this.countdownText);

        curY += 20;

        // Progress Bar
        this.barW = 320;
        this.barH = 6;
        this.barX = (cardW - this.barW) / 2;
        this.barY = curY;

        const barBg = this.scene.add.graphics();
        barBg.fillStyle(0xE2E8F0, 1);
        barBg.fillRect(this.barX, this.barY, this.barW, this.barH);
        this.cardContainer.add(barBg);

        this.progressBarGfx = this.scene.add.graphics();
        this.cardContainer.add(this.progressBarGfx);
        this.updateProgressBar();

        curY += this.barH + 16;

        // Button: EMPEZAR AHORA
        const btnW = 240;
        const btnH = 42;
        const btnX = (cardW - btnW) / 2;
        const btnY = curY;

        const btnBg = this.scene.add.graphics();
        const renderBtn = (hover: boolean, pressed: boolean = false): void => {
            btnBg.clear();
            const offsetY = pressed ? 2 : 0;
            // Border
            btnBg.fillStyle(0x0F172A, 1);
            btnBg.fillRect(btnX, btnY + offsetY, btnW, btnH);
            // Face
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX + 2, btnY + offsetY + 2, btnW - 4, btnH - 4);
            // 3D bottom bevel
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX + 2, btnY + offsetY + btnH - 6, btnW - 4, 4);
        };
        renderBtn(false);
        this.cardContainer.add(btnBg);

        const btnText = this.scene.add.text(cardW / 2, btnY + btnH / 2 - 1, 'EMPEZAR AHORA', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A',
            padding: { top: 4, bottom: 4 }
        }).setOrigin(0.5);
        this.cardContainer.add(btnText);

        const hitZone = this.scene.add.zone(cardW / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.cardContainer.add(hitZone);

        hitZone.on('pointerover', () => renderBtn(true));
        hitZone.on('pointerout', () => renderBtn(false));
        hitZone.on('pointerdown', () => {
            renderBtn(true, true);
            this.dismiss();
        });

        // 4. Exact dynamic height + 20px bottom padding
        curY += btnH + 20;
        const cardH = curY;
        const cardY = Math.round((height - cardH) / 2);

        // Position cardContainer at mathematically centered Y coordinate
        this.cardContainer.y = cardY;

        // Draw crisp card background and shadow exactly matching calculated cardH
        cardGfx.fillStyle(0x000000, 0.12);
        cardGfx.fillRect(cardX + 3, cardY + 3, cardW, cardH);

        cardGfx.fillStyle(0xFFFFFF, 1);
        cardGfx.fillRect(cardX, cardY, cardW, cardH);
        cardGfx.lineStyle(2, 0xCBD5E1, 1);
        cardGfx.strokeRect(cardX, cardY, cardW, cardH);

        // Keyboard triggers for skipping
        this.keyListener = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                this.dismiss();
            }
        };
        window.addEventListener('keydown', this.keyListener);
    }

    private createSectionBox(
        parent: Phaser.GameObjects.Container,
        x: number,
        y: number,
        w: number,
        title: string,
        lines: string[],
        titleColor: string
    ): number {
        const boxBg = this.scene.add.graphics();
        const padding = 10;

        const titleText = this.scene.add.text(x + padding, y + 8, title, {
            fontSize: '11px',
            fontFamily: "'Outfit', sans-serif",
            fontStyle: 'bold',
            color: titleColor
        });

        const bodyText = this.scene.add.text(x + padding, y + 26, lines.join('\n'), {
            fontSize: '12px',
            fontFamily: "'Outfit', sans-serif",
            color: '#1E293B',
            lineSpacing: 4,
            wordWrap: { width: w - padding * 2, useAdvancedWrap: true }
        });

        const totalH = Math.max(68, Math.round(bodyText.height + 36));

        boxBg.fillStyle(0xF8FAFC, 1);
        boxBg.fillRect(x, y, w, totalH);
        boxBg.lineStyle(1.5, 0xE2E8F0, 1);
        boxBg.strokeRect(x, y, w, totalH);

        parent.add(boxBg);
        parent.add(titleText);
        parent.add(bodyText);

        return y + totalH;
    }

    private updateProgressBar(): void {
        if (!this.progressBarGfx) return;
        this.progressBarGfx.clear();
        const ratio = Math.max(0, this.secondsRemaining / this.totalSeconds);
        this.progressBarGfx.fillStyle(0xF59E0B, 1);
        this.progressBarGfx.fillRect(this.barX, this.barY, Math.round(this.barW * ratio), this.barH);
    }

    private startTimer(): void {
        this.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            repeat: this.totalSeconds - 1,
            callback: () => {
                if (this.isClosed) return;
                this.secondsRemaining--;
                this.countdownText.setText(`INICIANDO EN: ${this.secondsRemaining}s...`);
                this.updateProgressBar();

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
            duration: 180,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.container.destroy();
                this.options.onComplete();
            }
        });
    }
}
