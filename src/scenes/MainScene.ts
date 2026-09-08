import { Scene, Types } from 'phaser';
import { TrackObstacle, ObstacleType } from '../gameobjects/TrackObstacle';
import { WindGlider } from '../gameobjects/WindGlider';
import { WindTurbo } from '../gameobjects/WindTurbo';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { MAIN_CIRCUIT, SingleCircuitConfig } from '../types/game';

interface RoadsideDecoration {
    main: Phaser.GameObjects.Sprite;
    extra?: Phaser.GameObjects.Sprite;
}

export class MainScene extends Scene {
    private glider!: WindGlider;
    private cursors!: Types.Input.Keyboard.CursorKeys;
    private keyA?: Phaser.Input.Keyboard.Key;
    private keyD?: Phaser.Input.Keyboard.Key;
    private keyW?: Phaser.Input.Keyboard.Key;

    // Single unified circuit configuration
    private currentCircuit: SingleCircuitConfig = MAIN_CIRCUIT;

    // Track layers
    private trackTile!: Phaser.GameObjects.TileSprite;
    private leftBorderTile!: Phaser.GameObjects.TileSprite;
    private rightBorderTile!: Phaser.GameObjects.TileSprite;

    // Roadside decorations
    private sideDecorations: RoadsideDecoration[] = [];

    // Groups
    private turbos!: Phaser.Physics.Arcade.Group;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private batteries!: Phaser.Physics.Arcade.Group;
    private finishLineObj?: Phaser.Physics.Arcade.Sprite;

    // Telemetry & Race state
    private distanceTraveled: number = 0; // meters (0 to 2,030)
    private readonly targetDistance: number = 2030;
    private cleanKwh: number = 0;
    private raceStartTime: number = 0;
    private isRaceActive: boolean = false;
    private hasSpawnedFinishLine: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(): void {
        this.distanceTraveled = 0;
        this.cleanKwh = 0;
        this.isRaceActive = true;
        this.hasSpawnedFinishLine = false;
        this.finishLineObj = undefined;
        this.sideDecorations = [];
        (window as any).__gameActive = true;
    }

    create(): void {
        const { width, height } = this.scale;
        this.raceStartTime = this.time.now;
        SoundFX.unlock();

        // Ensure clean HUD lifecycle
        this.scene.stop('HudScene');
        this.scene.launch('HudScene', { targetDistance: this.targetDistance });

        // ── 1. Track & Borders ──
        this.leftBorderTile = this.add.tileSprite(24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1);
        this.rightBorderTile = this.add.tileSprite(width - 24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1).setFlipX(true);

        // Center smooth aerodynamic racing lane
        this.trackTile = this.add.tileSprite(width / 2, height / 2, width - 96, height, this.currentCircuit.trackKey).setDepth(2);

        // Roadside environmental wind turbines
        for (let i = 0; i < 4; i++) {
            const leftY = 120 + i * 240;
            const rightY = 40 + i * 240;

            const leftTower = this.add.sprite(22, leftY, 'turbine_tower').setScale(1.5).setDepth(3);
            const leftBlades = this.add.sprite(22, leftY - 14, 'turbine_blades').setScale(1.5).setDepth(4);
            const rightTower = this.add.sprite(width - 22, rightY, 'turbine_tower').setScale(1.5).setDepth(3);
            const rightBlades = this.add.sprite(width - 22, rightY - 14, 'turbine_blades').setScale(1.5).setDepth(4);

            this.sideDecorations.push(
                { main: leftTower, extra: leftBlades },
                { main: rightTower, extra: rightBlades }
            );
        }

        // ── 2. Glider / Speeder ──
        this.glider = new WindGlider(this, width / 2, height - 160, this.currentCircuit.vehicleKey, this.currentCircuit.themeColorHex);

        // ── 3. Groups & Overlaps ──
        this.turbos = this.physics.add.group({ runChildUpdate: false });
        this.obstacles = this.physics.add.group({ runChildUpdate: false });
        this.batteries = this.physics.add.group({ runChildUpdate: false });

        this.physics.add.overlap(
            this.glider,
            this.turbos,
            this.handleTurboCollect as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.glider,
            this.obstacles,
            this.handleObstacleHit as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.glider,
            this.batteries,
            this.handleBatteryCollect as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // ── 4. Input ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
            this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        }

        // ── 5. Spawner Timers ──
        this.time.addEvent({
            delay: 650,
            callback: this.spawnTrackElements,
            callbackScope: this,
            loop: true
        });

        this.cameras.main.fadeIn(200, 241, 245, 249);
    }

    update(_time: number, delta: number): void {
        if (!this.isRaceActive) return;

        const dt = delta / 1000;
        const currentSpeedKmh = this.glider.speed;

        // Metres per frame: (km/h) / 3.6 * dt
        const speedMps = currentSpeedKmh / 3.6;
        const metersThisFrame = speedMps * dt;
        this.distanceTraveled = Math.min(this.targetDistance, this.distanceTraveled + metersThisFrame);

        // Telemetry Events
        EventBus.emit(GameEvents.SPEED_UPDATED, Math.round(currentSpeedKmh));
        EventBus.emit(GameEvents.DISTANCE_UPDATED, {
            current: Math.round(this.distanceTraveled),
            target: this.targetDistance,
            progress: (this.distanceTraveled / this.targetDistance) * 100
        });

        // Vertical visual parallax scrolling (speed-proportional)
        const scrollSpeed = (currentSpeedKmh / 3.6) * dt * 38;
        this.trackTile.tilePositionY -= scrollSpeed;
        this.leftBorderTile.tilePositionY -= scrollSpeed;
        this.rightBorderTile.tilePositionY -= scrollSpeed;

        // Move roadside environmental structures
        const { height } = this.scale;
        this.sideDecorations.forEach(({ main, extra }) => {
            main.y += scrollSpeed * 0.75;
            if (extra) {
                extra.y = main.y - 14;
                extra.angle += 3.5;
            }
            if (main.y > height + 60) {
                main.y = -60;
                if (extra) extra.y = main.y - 14;
            }
        });

        // Steering Controls (Arrows, A/D, or pointer drag)
        const touch = (window as any).__touchControls;
        const left = (this.cursors && this.cursors.left.isDown) || (this.keyA && this.keyA.isDown) || (touch && touch.left);
        const right = (this.cursors && this.cursors.right.isDown) || (this.keyD && this.keyD.isDown) || (touch && touch.right);
        const accel = (this.cursors && this.cursors.up.isDown) || (this.keyW && this.keyW.isDown);

        if (accel) {
            this.glider.manualAccelerate(dt);
        }

        // Keep glider inside canyon track lane
        const minX = 64;
        const maxX = this.scale.width - 64;

        if (left && this.glider.x > minX) {
            this.glider.steerLeft();
        } else if (right && this.glider.x < maxX) {
            this.glider.steerRight();
        } else {
            this.glider.centerSteering();
        }

        // Clamp glider inside bounds
        if (this.glider.x < minX) this.glider.x = minX;
        if (this.glider.x > maxX) this.glider.x = maxX;

        // Move active track items toward player
        this.updateTrackObjects(scrollSpeed);

        // Check if finish line should spawn (within 50m of goal)
        if (this.distanceTraveled >= this.targetDistance - 50 && !this.hasSpawnedFinishLine) {
            this.spawnFinishLine();
        }

        // Cross finish line
        if (this.distanceTraveled >= this.targetDistance) {
            this.finishRace();
        }
    }

    private updateTrackObjects(scrollSpeed: number): void {
        const { height } = this.scale;

        // Move Turbos
        this.turbos.children.each((child) => {
            const turbo = child as WindTurbo;
            turbo.y += scrollSpeed;
            if (turbo.y > height + 60) turbo.destroy();
            return null;
        });

        // Move Obstacles
        this.obstacles.children.each((child) => {
            const obs = child as TrackObstacle;
            obs.y += scrollSpeed;
            if (obs.y > height + 60) obs.destroy();
            return null;
        });

        // Move Batteries
        this.batteries.children.each((child) => {
            const bat = child as Phaser.Physics.Arcade.Sprite;
            bat.y += scrollSpeed;
            if (bat.y > height + 60) bat.destroy();
            return null;
        });

        // Move Finish Line
        if (this.finishLineObj) {
            this.finishLineObj.y += scrollSpeed;
        }
    }

    private spawnTrackElements(): void {
        if (!this.isRaceActive || this.hasSpawnedFinishLine) return;

        const { width } = this.scale;
        const spawnX = Phaser.Math.Between(80, width - 80);
        const roll = Math.random();

        if (roll < 0.35) {
            // 35% Clean Energy Pack (+15 kWh)
            const battery = this.physics.add.sprite(spawnX, -40, this.currentCircuit.batteryKey);
            battery.setScale(2.0).setDepth(5);
            this.batteries.add(battery);
        } else if (roll < 0.65) {
            // 30% Turbo Boost Pad (+50 km/h)
            const turbo = new WindTurbo(this, spawnX, -40, this.currentCircuit.turboKey, this.currentCircuit.themeColorHex);
            this.turbos.add(turbo);
        } else {
            // 35% Track Obstacle (Rocks / Logs)
            const obsKey = Phaser.Math.RND.pick(this.currentCircuit.obstacleKeys);
            const obstacle = new TrackObstacle(this, spawnX, -40, obsKey as ObstacleType);
            this.obstacles.add(obstacle);
        }
    }

    private handleTurboCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        turboObj: Phaser.GameObjects.GameObject
    ): void {
        const turbo = turboObj as WindTurbo;
        if (turbo.isCollected) return;

        turbo.collect();
        this.glider.applyTurboBoost();

        SoundFX.playWindTurbo();
        this.showPopup(turbo.x, turbo.y, this.currentCircuit.turboPopup, '#D97706');
    }

    private handleObstacleHit(
        _gliderObj: Phaser.GameObjects.GameObject,
        obstacleObj: Phaser.GameObjects.GameObject
    ): void {
        const obs = obstacleObj as TrackObstacle;
        if (obs.isHit || this.glider.isSpinningOut) return;

        obs.hit();
        this.glider.triggerSpinOut();

        SoundFX.playSpinOut();
        this.cameras.main.shake(300, 0.015);
        this.showPopup(this.glider.x, this.glider.y - 40, '¡TROMPO! -VELOCIDAD', '#DC2626');
    }

    private handleBatteryCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        batteryObj: Phaser.GameObjects.GameObject
    ): void {
        const battery = batteryObj as Phaser.Physics.Arcade.Sprite;
        battery.destroy();

        this.cleanKwh += 15;
        SoundFX.playCollect(2);

        EventBus.emit(GameEvents.SCORE_UPDATED, this.cleanKwh);
        this.showPopup(battery.x, battery.y, '+15 kWh LIMPIA', '#16A34A');
    }

    private spawnFinishLine(): void {
        this.hasSpawnedFinishLine = true;
        const { width } = this.scale;
        this.finishLineObj = this.physics.add.sprite(width / 2, -50, 'finish_line');
        this.finishLineObj.setScale(2.5, 2.0).setDepth(6);
    }

    private showPopup(x: number, y: number, text: string, color: string): void {
        const popup = this.add.text(x, y, text, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: color
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: y - 35,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy()
        });
    }

    private finishRace(): void {
        if (!this.isRaceActive) return;
        this.isRaceActive = false;
        (window as any).__gameActive = false;

        const totalTimeSeconds = ((this.time.now - this.raceStartTime) / 1000).toFixed(1);
        SoundFX.playWin();

        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(250, 241, 245, 249);
        this.time.delayedCall(250, () => {
            this.scene.start('WinScene', {
                mode: 'race',
                time: totalTimeSeconds,
                kwh: this.cleanKwh,
                distance: this.targetDistance
            });
        });
    }
}
