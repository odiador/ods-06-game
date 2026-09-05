import { Scene } from 'phaser';

interface WinSceneData {
    time: string;
    kwh: number;
    distance: number;
}

export class WinScene extends Scene {
    private finalTime: string = '0.0';
    private finalKwh: number = 0;
    private finalCo2: number = 0;

    constructor() {
        super('WinScene');
    }

    init(data: WinSceneData): void {
        this.finalTime = data.time || '45.0';
        this.finalKwh = data.kwh || 120;
        // ~0.42 kg CO2 avoided per kWh generated from clean wind energy
        this.finalCo2 = Math.round(this.finalKwh * 0.42);
    }

    create(): void {
        const { width, height } = this.scale;

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x050811, 0x050811, 0x0A1C1A, 0x0E2E28, 1);
        bg.fillRect(0, 0, width, height);

        // Podium Banner
        const banner = this.add.graphics();
        banner.fillStyle(0x15803D, 1);
        banner.fillRoundedRect(width / 2 - 140, 50, 280, 40, 8);

        this.add.text(width / 2, 70, '¡PODIO 1ER LUGAR · META 2030!', {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Trophy / Glider Showcase
        const glider = this.add.sprite(width / 2, 140, 'wind_glider').setScale(3.0);
        if (glider.preFX) glider.preFX.addGlow(0x00E5FF, 3, 0.6);

        this.tweens.add({
            targets: glider,
            y: 130,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Title
        this.add.text(width / 2, 185, 'CIRCUITO COLINAS EÓLICAS', {
            fontSize: '16px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15'
        }).setOrigin(0.5);

        // Telemetry Card
        const card = this.add.graphics();
        card.fillStyle(0x0F172A, 0.92);
        card.fillRoundedRect(22, 215, width - 44, 155, 8);
        card.lineStyle(1, 0x334155, 0.8);
        card.strokeRoundedRect(22, 215, width - 44, 155, 8);

        // Stats Lines
        this.add.text(36, 230, `⏱ Tiempo de Carrera: ${this.finalTime} seg`, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FFFFFF'
        });

        this.add.text(36, 260, `🏁 Distancia Completada: 2.030 metros`, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#38BDF8'
        });

        this.add.text(36, 290, `⚡ Energía Eólica Captada: ${this.finalKwh} kWh`, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#FACC15'
        });

        this.add.text(36, 320, `🌱 Emisiones CO₂ Evitadas: ~${this.finalCo2} kg CO₂`, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#4ADE80'
        });

        // Academic / Systems Engineering Explanation Box
        const infoCard = this.add.graphics();
        infoCard.fillStyle(0x1E293B, 0.85);
        infoCard.fillRoundedRect(22, 385, width - 44, 160, 8);
        infoCard.lineStyle(1, 0x0284C7, 0.6);
        infoCard.strokeRoundedRect(22, 385, width - 44, 160, 8);

        const academicText = [
            'LECCIÓN DE INGENIERÍA Y SOSTENIBILIDAD:',
            'El viento es variable y fluctuante. La ingeniería',
            'de sistemas aplica modelos de Deep Learning (CNN-LSTM)',
            'para predecir la velocidad del viento con horas de',
            'anticipación. Así se balancea la carga en la red',
            'inteligente sin requerir plantas térmicas fósiles.'
        ].join('\n');

        this.add.text(width / 2, 465, academicText, {
            fontSize: '11px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#E2E8F0',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // Restart button
        const btnY = 580;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFACC15, 1);
        btnBg.fillRoundedRect(width / 2 - 110, btnY - 24, 220, 48, 8);

        this.add.text(width / 2, btnY, 'CORRER OTRA VEZ', {
            fontSize: '15px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: '#0F172A'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY, 220, 48)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(250, 10, 14, 26);
            this.time.delayedCall(250, () => {
                this.scene.start('MainScene');
            });
        });

        this.cameras.main.fadeIn(300, 10, 14, 26);
    }
}
