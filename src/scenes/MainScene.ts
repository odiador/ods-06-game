import { Scene, Types } from 'phaser';
import { TrackObstacle } from '../gameobjects/TrackObstacle';
import { WindGlider } from '../gameobjects/WindGlider';
import { WindTurbo } from '../gameobjects/WindTurbo';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';

export class MainScene extends Scene {
    private glider!: WindGlider;
    private cursors!: Types.Input.Keyboard.CursorKeys;

    // Track layers
    private trackTile!: Phaser.GameObjects.TileSprite;
    private leftGrassTile!: Phaser.GameObjects.TileSprite;
    private rightGrassTile!: Phaser.GameObjects.TileSprite;

    // Wind turbines along the canyon sides
    private leftTurbines: Phaser.GameObjects.Sprite[] = [];
    private rightTurbines: Phaser.GameObjects.Sprite[] = [];

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
        window.__gameActive = true;
        this.leftTurbines = [];
        this.rightTurbines = [];
    }

    create(): void {
        const { width, height } = this.scale;
        this.raceStartTime = this.time.now;
        SoundFX.unlock();

        // ── 1. Track & Canyon Borders ──
        // Canyon grass borders (left: 0..40, right: 380..420)
        this.leftGrassTile = this.add.tileSprite(20, height / 2, 40, height, 'grass_border').setDepth(1);
        this.rightGrassTile = this.add.tileSprite(width - 20, height / 2, 40, height, 'grass_border').setDepth(1);

        // Center gravel/dirt aerodynamic racing lane
        this.trackTile = this.add.tileSprite(width / 2, height / 2, width - 80, height, 'substation_floor')
            .setDepth(2)
            .setAlpha(0.92);

        // Rotating wind turbines along canyon ridges
        for (let i = 0; i < 4; i++) {
            const leftTurb = this.add.sprite(20, 150 + i * 220, 'wind').setScale(1.5).setDepth(3);
            const rightTurb = this.add.sprite(width - 20, 80 + i * 220, 'wind').setScale(1.5).setDepth(3);
            this.leftTurbines.push(leftTurb);
            this.rightTurbines.push(rightTurb);
        }

        // ── 2. Glider (Sled) ──
        // Positioned at lower third of screen
        this.glider = new WindGlider(this, width / 2, height - 160);

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
        }

        // ── 5. Spawner Timers ──
        this.time.addEvent({
            delay: 650,
            callback: this.spawnTrackElements,
            callbackScope: this,
            loop: true
        });

        // ── 6. Launch Racing HUD ──
        this.scene.launch('HudScene', {
            targetDistance: this.targetDistance
        });

        this.cameras.main.fadeIn(300, 10, 14, 26);
    }

    update(_time: number, delta: number): void {
        if (!this.isRaceActive) return;

        // Current speed factor in m/s (e.g. 90 km/h = 25 m/s)
        const metersPerSecond = (this.glider.speed / 3.6);
        const metersThisFrame = metersPerSecond * (delta / 1000);
        this.distanceTraveled = Math.min(this.targetDistance, this.distanceTraveled + metersThisFrame);

        // Scroll track and grass tiles proportionally to speed
        const scrollSpeed = this.glider.speed * (delta / 1000) * 12;
        this.trackTile.tilePositionY -= scrollSpeed;
        this.leftGrassTile.tilePositionY -= scrollSpeed;
        this.rightGrassTile.tilePositionY -= scrollSpeed;

        // Move roadside turbines
        const { height } = this.scale;
        [...this.leftTurbines, ...this.rightTurbines].forEach((t) => {
            t.y += scrollSpeed * 0.8;
            t.angle += 3; // Spin blades
            if (t.y > height + 50) {
                t.y = -50;
            }
        });

        // Steering Controls
        const touch = window.__touchControls;
        const left = (this.cursors && this.cursors.left.isDown) || (touch && touch.left);
        const right = (this.cursors && this.cursors.right.isDown) || (touch && touch.right);

        // Keep glider inside canyon track lane
        const minX = 60;
        const maxX = this.scale.width - 60;

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

        // Move active track items toward player (simulate downward descent)
        this.updateTrackObjects(scrollSpeed);

        // Check if finish line should spawn (when within 50m of goal)
        if (this.distanceTraveled >= this.targetDistance - 50 && !this.hasSpawnedFinishLine) {
            this.spawnFinishLine();
        }

        // Check race finish condition
        if (this.distanceTraveled >= this.targetDistance) {
            this.finishRace();
        }

        // Emit telemetry to HUD
        EventBus.emit(GameEvents.SPEED_UPDATED, Math.round(this.glider.speed));
        EventBus.emit(GameEvents.DISTANCE_UPDATED, {
            current: Math.round(this.distanceTraveled),
            target: this.targetDistance,
            progress: (this.distanceTraveled / this.targetDistance) * 100
        });
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

        // Move Finish Line if spawned
        if (this.finishLineObj) {
            this.finishLineObj.y += scrollSpeed;
            if (this.finishLineObj.y >= this.glider.y && this.isRaceActive) {
                this.finishRace();
            }
        }
    }

    private spawnTrackElements(): void {
        if (!this.isRaceActive || this.hasSpawnedFinishLine) return;

        const { width } = this.scale;
        const laneMinX = 75;
        const laneMaxX = width - 75;
        const spawnX = Phaser.Math.Between(laneMinX, laneMaxX);

        const rand = Math.random();

        if (rand < 0.45) {
            // 45% Wind Turbo Boost Pad
            const turbo = new WindTurbo(this, spawnX, -40);
            this.turbos.add(turbo);
        } else if (rand < 0.80) {
            // 35% Rock or Log Obstacle
            const isRock = Math.random() < 0.6;
            const obs = new TrackObstacle(this, spawnX, -40, isRock ? 'track_rock' : 'track_log');
            this.obstacles.add(obs);
        } else {
            // 20% Clean Energy Battery pack
            const battery = this.physics.add.sprite(spawnX, -40, 'battery').setScale(1.5).setDepth(6);
            (battery.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
            if (battery.preFX) battery.preFX.addGlow(0x22C55E, 2, 0.5);
            this.batteries.add(battery);
        }
    }

    private spawnFinishLine(): void {
        this.hasSpawnedFinishLine = true;
        const { width } = this.scale;
        this.finishLineObj = this.physics.add.sprite(width / 2, -50, 'finish_line')
            .setScale(3.0, 1.5)
            .setDepth(15);
        (this.finishLineObj.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    private handleTurboCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        turboObj: Phaser.GameObjects.GameObject
    ): void {
        const turbo = turboObj as WindTurbo;
        if (turbo.isCollected) return;

        turbo.collect();
        this.glider.applyTurboBoost();
        this.cleanKwh += 25;
        SoundFX.playWindTurbo();

        this.showPopup(turbo.x, turbo.y, '¡TURBO EÓLICO +150 km/h!', '#00E5FF');
        EventBus.emit(GameEvents.SCORE_UPDATED, this.cleanKwh);
    }

    private handleObstacleHit(
        _gliderObj: Phaser.GameObjects.GameObject,
        obstacleObj: Phaser.GameObjects.GameObject
    ): void {
        const obstacle = obstacleObj as TrackObstacle;
        if (obstacle.isHit || this.glider.isSpinningOut) return;

        obstacle.hit();
        this.glider.triggerSpinOut();
        SoundFX.playSpinOut();
        this.cameras.main.shake(200, 0.018);

        this.showPopup(this.glider.x, this.glider.y, '¡TROMPO! -40 km/h', '#EF4444');
    }

    private handleBatteryCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        batteryObj: Phaser.GameObjects.GameObject
    ): void {
        const bat = batteryObj as Phaser.Physics.Arcade.Sprite;
        bat.destroy();

        this.cleanKwh += 15;
        SoundFX.playCollect(2);
        this.showPopup(this.glider.x, this.glider.y - 20, '+15 kWh Batería', '#22C55E');
        EventBus.emit(GameEvents.SCORE_UPDATED, this.cleanKwh);
    }

    private showPopup(x: number, y: number, text: string, color: string): void {
        const popup = this.add.text(x, y, text, {
            fontSize: '12px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: color
        }).setOrigin(0.5).setDepth(25);

        this.tweens.add({
            targets: popup,
            y: y - 45,
            alpha: 0,
            duration: 500,
            onComplete: () => popup.destroy()
        });
    }

    private finishRace(): void {
        if (!this.isRaceActive) return;
        this.isRaceActive = false;
        window.__gameActive = false;

        const totalTimeSeconds = ((this.time.now - this.raceStartTime) / 1000).toFixed(1);
        SoundFX.playWin();

        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(400, 10, 14, 26);
        this.time.delayedCall(400, () => {
            this.scene.start('WinScene', {
                time: totalTimeSeconds,
                kwh: this.cleanKwh,
                distance: this.targetDistance
            });
        });
    }
}
