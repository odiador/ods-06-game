import { Scene } from 'phaser';

export class PreloaderScene extends Scene {
    constructor() {
        super({ key: 'PreloaderScene' });
    }

    preload(): void {
        const { width, height } = this.scale;

        // Dark background
        const bg = this.add.graphics();
        bg.fillStyle(0x0F172A, 1);
        bg.fillRect(0, 0, width, height);

        // ODS 7 Title
        this.add.text(width / 2, height / 2 - 80, 'ODS 7: ENERGÍA LIMPIA', {
            fontSize: '22px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#FCC30B',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Progress bar background
        const barBg = this.add.graphics();
        barBg.fillStyle(0x1E293B, 1);
        barBg.fillRoundedRect(width / 2 - 120, height / 2 - 10, 240, 20, 4);

        // Progress bar fill
        const barFill = this.add.graphics();

        const loadText = this.add.text(width / 2, height / 2 + 35, 'Iniciando Red Eléctrica 0%', {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#94A3B8'
        }).setOrigin(0.5);

        this.load.on('progress', (progress: number) => {
            barFill.clear();
            barFill.fillStyle(0xFACC15, 1);
            barFill.fillRoundedRect(width / 2 - 118, height / 2 - 8, 236 * progress, 16, 2);
            loadText.setText(`Iniciando Red Eléctrica ${Math.round(progress * 100)}%`);
        });

        // ── Load 2D Pixel Art Sprites ──
        this.load.image('player_idle', 'assets/player/player_idle.png');
        this.load.image('player_run', 'assets/player/player_run.png');

        // Items
        this.load.image('solar', 'assets/items/solar.png');
        this.load.image('wind', 'assets/items/wind.png');
        this.load.image('battery', 'assets/items/battery.png');
        this.load.image('hydro', 'assets/items/hydro.png');

        // Hazards
        this.load.image('coal', 'assets/hazards/coal.png');
        this.load.image('oil', 'assets/hazards/oil.png');
        this.load.image('co2', 'assets/hazards/co2.png');
        this.load.image('surge', 'assets/hazards/surge.png');

        // UI & VFX
        this.load.image('spark', 'assets/ui/spark.png');
        this.load.image('dust', 'assets/ui/dust.png');
        this.load.image('heart_pixel', 'assets/ui/heart_pixel.png');
        this.load.image('sound_on', 'assets/ui/sound_on.png');
        this.load.image('sound_off', 'assets/ui/sound_off.png');

        // Environment & Parallax
        this.load.image('substation_floor', 'assets/env/substation_floor.png');
        this.load.image('city_skyline', 'assets/env/city_skyline.png');
        this.load.image('clouds', 'assets/env/clouds.png');

        // Colinas Eólicas Track Assets
        this.load.image('wind_glider', 'assets/track/wind_glider.png');
        this.load.image('wind_gust', 'assets/track/wind_gust.png');
        this.load.image('track_rock', 'assets/track/track_rock.png');
        this.load.image('track_log', 'assets/track/track_log.png');
        this.load.image('finish_line', 'assets/track/finish_line.png');
        this.load.image('grass_border', 'assets/track/grass_border.png');
        this.load.image('canyon_track', 'assets/track/canyon_track.png');
        this.load.image('turbine_tower', 'assets/track/turbine_tower.png');
        this.load.image('turbine_blades', 'assets/track/turbine_blades.png');
    }

    create(): void {
        this.scene.start('MenuScene');
    }
}
