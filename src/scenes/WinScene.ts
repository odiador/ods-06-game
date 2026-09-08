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

        // Ensure global gameActive flag is clean
        (window as any).__gameActive = false;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x050811, 0x050811, 0x0A1C1A, 0x0E2E28, 1);
        bg.fillRect(0, 0, width, height);

        // Podium Banner
        const banner = this.add.graphics();
        banner.fillStyle(0x15803D, 1);
        banner.fillRoundedRect(width / 2 - 150, 40, 300, 36, 6);

        this.add.text(width / 2, 58, 'PODIO · META 2030', {
            fontSize: '13px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Trophy / Vehicle Showcase
        const vehicle = this.add.sprite(width / 2, 120, this.biome.vehicleKey).setScale(3.0);
        if (vehicle.preFX) vehicle.preFX.addGlow(this.biome.themeColorHex, 3, 0.6);

        this.tweens.add({
            targets: vehicle,
            y: 110,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Title
        this.add.text(width / 2, 165, `CIRCUITO ${this.biome.name}`, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: this.biome.themeColor
        }).setOrigin(0.5);

        // Telemetry Card
        const card = this.add.graphics();
        card.fillStyle(0x0F172A, 0.94);
        card.fillRoundedRect(20, 190, width - 40, 165, 8);
        card.lineStyle(1, 0x334155, 0.9);
        card.strokeRoundedRect(20, 190, width - 40, 165, 8);

        // Stats Lines
        this.add.text(32, 210, `[TIEMPO]   ${this.finalTime} s`, {
            fontSize: '13px',
            fontFamily: "'Silkscreen', monospace",
            color: '#F8FAFC'
        });

        this.add.text(32, 242, `[CARRERA]  2.030 metros`, {
            fontSize: '13px',
            fontFamily: "'Silkscreen', monospace",
            color: '#38BDF8'
        });

        this.add.text(32, 274, `[ENERGIA]  ${this.finalKwh} kWh (${this.biome.energyLabel})`, {
            fontSize: '13px',
            fontFamily: "'Silkscreen', monospace",
            color: '#FACC15'
        });

        this.add.text(32, 306, `[CLIMA]    CO2 Evitado: ~${this.finalCo2} kg`, {
            fontSize: '13px',
            fontFamily: "'Silkscreen', monospace",
            color: '#4ADE80'
        });

        // Academic / Systems Engineering Explanation Box
        const infoCard = this.add.graphics();
        infoCard.fillStyle(0x1E293B, 0.90);
        infoCard.fillRoundedRect(20, 370, width - 40, 175, 8);
        infoCard.lineStyle(1, this.biome.themeColorHex, 0.7);
        infoCard.strokeRoundedRect(20, 370, width - 40, 175, 8);

        this.add.text(width / 2, 395, 'LECCION DE INGENIERIA Y RED ELECTRICA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: this.biome.themeColor,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(width / 2, 470, this.biome.academicText.slice(1).join('\n'), {
            fontSize: '12px',
            fontFamily: "'Silkscreen', monospace",
            color: '#E2E8F0',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // ── Restart Button ("CORRER OTRA VEZ") ──
        const btnY = 580;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);

        const btnText = this.add.text(width / 2, btnY, 'CORRER OTRA VEZ', {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY, 240, 48)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerRestart = (): void => {
            hitZone.disableInteractive();
            this.cameras.main.fadeOut(200, 10, 14, 26);
            this.time.delayedCall(200, () => {
                this.scene.start('MainScene', { biome: this.biome.id });
            });
        };

        hitZone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFEF08A, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);
            btnText.setScale(1.05);
        });

        hitZone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0xFACC15, 1);
            btnBg.fillRoundedRect(width / 2 - 120, btnY - 24, 240, 48, 8);
            btnText.setScale(1);
        });

        hitZone.on('pointerdown', triggerRestart);

        // ── Menu Button ("CAMBIAR BIOMA") ──
        const menuBtnY = 645;
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x1E293B, 1);
        menuBg.fillRoundedRect(width / 2 - 120, menuBtnY - 20, 240, 40, 8);
        menuBg.lineStyle(1, 0x475569, 1);
        menuBg.strokeRoundedRect(width / 2 - 120, menuBtnY - 20, 240, 40, 8);

        const menuText = this.add.text(width / 2, menuBtnY, 'MENU DE BIOMAS', {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#E2E8F0'
        }).setOrigin(0.5);

        const menuHitZone = this.add.zone(width / 2, menuBtnY, 240, 40)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerMenu = (): void => {
            menuHitZone.disableInteractive();
            this.cameras.main.fadeOut(200, 10, 14, 26);
            this.time.delayedCall(200, () => {
                this.scene.start('MenuScene');
            });
        };

        menuHitZone.on('pointerover', () => {
            menuBg.clear();
            menuBg.fillStyle(0x334155, 1);
            menuBg.fillRoundedRect(width / 2 - 120, menuBtnY - 20, 240, 40, 8);
            menuText.setScale(1.05);
        });

        menuHitZone.on('pointerout', () => {
            menuBg.clear();
            menuBg.fillStyle(0x1E293B, 1);
            menuBg.fillRoundedRect(width / 2 - 120, menuBtnY - 20, 240, 40, 8);
            menuText.setScale(1);
        });

        menuHitZone.on('pointerdown', triggerMenu);

        // Keyboard triggers (Space/Enter to restart, Esc to go to menu)
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', triggerRestart);
            this.input.keyboard.once('keydown-ENTER', triggerRestart);
            this.input.keyboard.once('keydown-ESC', triggerMenu);
        }

        this.cameras.main.fadeIn(250, 10, 14, 26);
    }
}
