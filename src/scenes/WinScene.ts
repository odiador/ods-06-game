import { Scene } from 'phaser';
import { BIOMES, BiomeConfig, BiomeMode } from '../types/game';

interface WinSceneData {
    time: string;
    kwh: number;
    distance: number;
    biome?: BiomeMode;
}

export class WinScene extends Scene {
    private finalTime: string = '0.0';
    private finalKwh: number = 0;
    private finalCo2: number = 0;
    private biome: BiomeConfig = BIOMES.wind;

    constructor() {
        super('WinScene');
    }

    init(data: WinSceneData): void {
        this.finalTime = data.time || '45.0';
        this.finalKwh = data.kwh || 120;
        const biomeKey = (data.biome || (window as any).__selectedBiome || 'wind') as BiomeMode;
        this.biome = BIOMES[biomeKey] || BIOMES.wind;
        this.finalCo2 = Math.round(this.finalKwh * this.biome.co2Factor);
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // ── 1. Solid Retro Background (No gradients, no AI glow) ──
        const bg = this.add.graphics();
        bg.fillStyle(0x080C16, 1);
        bg.fillRect(0, 0, width, height);

        // ── 2. Top Header Banner ──
        const banner = this.add.graphics();
        banner.fillStyle(0x14532D, 1);
        banner.fillRect(width / 2 - 140, 32, 280, 32);
        banner.lineStyle(1, 0x22C55E, 1);
        banner.strokeRect(width / 2 - 140, 32, 280, 32);

        this.add.text(width / 2, 48, 'META 2030 ALCANZADA', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#86EFAC'
        }).setOrigin(0.5);

        // ── 3. Vehicle Showcase (Crisp pixel sprite, no fake blur glow) ──
        const vehicle = this.add.sprite(width / 2, 108, this.biome.vehicleKey).setScale(2.8);
        this.tweens.add({
            targets: vehicle,
            y: 100,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(width / 2, 148, `CIRCUITO ${this.biome.name}`, {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: this.biome.themeColor
        }).setOrigin(0.5);

        // ── 4. Telemetry Card (Structured margins and crisp retro borders) ──
        const cardX = 24;
        const cardW = width - 48; // 372px
        const cardY = 175;
        const cardH = 150;

        const card = this.add.graphics();
        card.fillStyle(0x0D1322, 1);
        card.fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0x1E293B, 1);
        card.strokeRect(cardX, cardY, cardW, cardH);

        // Card title tag
        this.add.text(cardX + 16, cardY + 14, 'TELEMETRIA DE CARRERA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        });

        // Structured stats rows with fixed margins
        const rowData = [
            { label: 'TIEMPO', val: `${this.finalTime} s`, color: '#F8FAFC' },
            { label: 'DISTANCIA', val: '2.030 m', color: '#38BDF8' },
            { label: 'ENERGIA', val: `${this.finalKwh} kWh`, color: '#FACC15' },
            { label: 'CO2 EVITADO', val: `~${this.finalCo2} kg`, color: '#4ADE80' }
        ];

        rowData.forEach((row, i) => {
            const yPos = cardY + 38 + i * 26;
            this.add.text(cardX + 16, yPos, row.label, {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#94A3B8'
            });

            this.add.text(cardX + cardW - 16, yPos, row.val, {
                fontSize: '11px',
                fontFamily: "'Press Start 2P', monospace",
                color: row.color
            }).setOrigin(1, 0);
        });

        // ── 5. Sustainability Lesson Card (Proper margin wrap) ──
        const infoY = 345;
        const infoH = 175;

        const infoCard = this.add.graphics();
        infoCard.fillStyle(0x0D1322, 1);
        infoCard.fillRect(cardX, infoY, cardW, infoH);
        infoCard.lineStyle(1, 0x1E293B, 1);
        infoCard.strokeRect(cardX, infoY, cardW, infoH);

        // Header accent
        this.add.text(cardX + 16, infoY + 14, 'LECCION ODS 7 · RED ELECTRICA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: this.biome.themeColor
        });

        // Thin pixel divider
        const divider = this.add.graphics();
        divider.fillStyle(0x1E293B, 1);
        divider.fillRect(cardX + 16, infoY + 28, cardW - 32, 1);

        // Academic content with generous margin word wrapping
        const lessonBody = this.biome.academicText.slice(1).join(' ');
        this.add.text(cardX + 16, infoY + 38, lessonBody, {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#CBD5E1',
            lineSpacing: 6,
            wordWrap: {
                width: cardW - 32,
                useAdvancedWrap: true
            }
        });

        // ── 6. Primary Action: CORRER OTRA VEZ (Flat retro button) ──
        const btnY = 545;
        const btnW = 240;
        const btnH = 44;
        const btnX = width / 2 - btnW / 2;

        const btnBg = this.add.graphics();
        const renderBtn = (hover: boolean): void => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xFBBF24 : 0xF59E0B, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            // Crisp bottom edge for depth
            btnBg.fillStyle(0xB45309, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };
        renderBtn(false);

        this.add.text(width / 2, btnY + btnH / 2 - 1, 'CORRER OTRA VEZ', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerRestart = (): void => {
            hitZone.disableInteractive();
            this.cameras.main.fadeOut(180, 8, 12, 22);
            this.time.delayedCall(180, () => {
                this.scene.start('MainScene', { biome: this.biome.id });
            });
        };

        hitZone.on('pointerover', () => renderBtn(true));
        hitZone.on('pointerout', () => renderBtn(false));
        hitZone.on('pointerdown', triggerRestart);

        // ── 7. Secondary Action: MENU DE BIOMAS ──
        const menuBtnY = 605;
        const menuBtnH = 38;
        const menuBtnX = width / 2 - btnW / 2;

        const menuBg = this.add.graphics();
        const renderMenuBtn = (hover: boolean): void => {
            menuBg.clear();
            menuBg.fillStyle(hover ? 0x1E293B : 0x0F172A, 1);
            menuBg.fillRect(menuBtnX, menuBtnY, btnW, menuBtnH);
            menuBg.lineStyle(1, hover ? 0x64748B : 0x334155, 1);
            menuBg.strokeRect(menuBtnX, menuBtnY, btnW, menuBtnH);
        };
        renderMenuBtn(false);

        this.add.text(width / 2, menuBtnY + menuBtnH / 2, 'MENU DE BIOMAS', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#E2E8F0'
        }).setOrigin(0.5);

        const menuHitZone = this.add.zone(width / 2, menuBtnY + menuBtnH / 2, btnW, menuBtnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerMenu = (): void => {
            menuHitZone.disableInteractive();
            this.cameras.main.fadeOut(180, 8, 12, 22);
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

        this.cameras.main.fadeIn(200, 8, 12, 22);
    }
}
