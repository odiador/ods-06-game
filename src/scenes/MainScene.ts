import { Scene, Types } from 'phaser';
import { EnergyCollectible } from '../gameobjects/EnergyCollectible';
import { GridTechnician } from '../gameobjects/GridTechnician';
import { HazardObstacle } from '../gameobjects/HazardObstacle';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { EnergyItemData, HazardItemData } from '../types/game';

export class MainScene extends Scene {
    private player!: GridTechnician;
    private cursors!: Types.Input.Keyboard.CursorKeys;
    private fallingItems!: Phaser.Physics.Arcade.Group;
    private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Parallax background elements
    private clouds: Phaser.GameObjects.TileSprite[] = [];
    private conduitGfx!: Phaser.GameObjects.Graphics;
    private conduitPhase: number = 0;

    private score: number = 0;
    private lives: number = 3;
    private cleanEnergyProgress: number = 0; // 0% to 100%
    private combo: number = 1;
    private maxCombo: number = 5;
    private readonly targetProgress: number = 80;
    private isGameActive: boolean = false;

    private readonly energyTypes: EnergyItemData[] = [
        { key: 'solar', label: 'Solar', points: 15, progress: 6, glowColor: 0xFACC15 },
        { key: 'wind', label: 'Eólica', points: 12, progress: 5, glowColor: 0x38BDF8 },
        { key: 'battery', label: 'Batería', points: 20, progress: 8, glowColor: 0x22C55E },
        { key: 'hydro', label: 'Hidroeléctrica', points: 10, progress: 5, glowColor: 0x06B6D4 },
    ];

    private readonly hazardTypes: HazardItemData[] = [
        { key: 'coal', label: 'Carbón', penalty: 4, damage: 1 },
        { key: 'oil', label: 'Petróleo', penalty: 5, damage: 1 },
        { key: 'co2', label: 'CO2', penalty: 4, damage: 1 },
        { key: 'surge', label: 'Sobrecarga', penalty: 6, damage: 1 },
    ];

    constructor() {
        super('MainScene');
    }

    init(): void {
        this.score = 0;
        this.lives = 3;
        this.cleanEnergyProgress = 0;
        this.combo = 1;
        this.isGameActive = true;
        window.__gameActive = true;
        this.clouds = [];
    }

    create(): void {
        const { width, height } = this.scale;

        // Unlock sound on first touch/key
        SoundFX.unlock();

        // ── 1. Layered Parallax Environment ──
        this.createEnvironment(width, height);

        // ── 2. Particle Emitter for Energy Bursts ──
        this.particleEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 80, max: 220 },
            scale: { start: 2.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false
        });

        // ── 3. Substation Floor Platform (Player stands on it) ──
        const floorY = height - 40;
        this.add.tileSprite(width / 2, floorY + 16, width, 32, 'substation_floor')
            .setScale(1.0)
            .setDepth(5);

        // Animated neon conduit line on top of floor
        this.conduitGfx = this.add.graphics().setDepth(6);

        // ── 4. Player (Grid Technician) ──
        this.player = new GridTechnician(this, width / 2, floorY - 14);
        this.player.setDepth(10);

        // ── 5. Groups & Overlaps ──
        this.fallingItems = this.physics.add.group({
            runChildUpdate: false
        });

        this.physics.add.overlap(
            this.player,
            this.fallingItems,
            this.handlePlayerCollision as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // ── 6. Controls ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // ── 7. Spawner ──
        this.time.addEvent({
            delay: 720,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true
        });

        // ── 8. Launch HUD ──
        this.scene.launch('HudScene', {
            targetProgress: this.targetProgress,
            initialLives: this.lives
        });

        this.cameras.main.fadeIn(300, 10, 14, 26);
    }

    private createEnvironment(width: number, height: number): void {
        // Sky gradient: dark deep twilight to electric slate
        const skyGfx = this.add.graphics().setDepth(0);
        skyGfx.fillGradientStyle(0x050811, 0x050811, 0x0B132B, 0x0E1A38, 1);
        skyGfx.fillRect(0, 0, width, height);

        // Distant stars / clean energy signals
        for (let i = 0; i < 24; i++) {
            const starX = Phaser.Math.Between(10, width - 10);
            const starY = Phaser.Math.Between(10, height - 250);
            const star = this.add.circle(starX, starY, Phaser.Math.FloatBetween(1, 2), 0xFACC15, 0.45).setDepth(1);
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1000, 2500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Layer 2: Drifting clouds
        const cloud1 = this.add.tileSprite(width / 2, 180, width, 48, 'clouds').setDepth(2).setAlpha(0.5);
        const cloud2 = this.add.tileSprite(width / 2, 280, width, 48, 'clouds').setDepth(2).setAlpha(0.35);
        this.clouds.push(cloud1, cloud2);

        // Layer 3: Distant Eco-Smart City Skyline silhouette
        const skylineY = height - 120;
        this.add.tileSprite(width / 2, skylineY, width, 96, 'city_skyline')
            .setDepth(3)
            .setTileScale(2, 2)
            .setAlpha(0.85);

        // Small green/yellow glowing antenna beacons on city skyline
        const beacon = this.add.circle(width * 0.48, skylineY - 42, 2.5, 0x22C55E, 0.9).setDepth(4);
        this.tweens.add({
            targets: beacon,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    update(): void {
        if (!this.isGameActive) return;

        // Animate drifting clouds (parallax)
        if (this.clouds[0]) this.clouds[0].tilePositionX += 0.25;
        if (this.clouds[1]) this.clouds[1].tilePositionX += 0.45;

        // Animate glowing power conduit on the floor
        this.animateFloorConduit();

        // Player input handling
        const touch = window.__touchControls;
        const left = (this.cursors && this.cursors.left.isDown) || (touch && touch.left);
        const right = (this.cursors && this.cursors.right.isDown) || (touch && touch.right);

        if (left) {
            this.player.moveLeft();
        } else if (right) {
            this.player.moveRight();
        } else {
            this.player.stopMovement();
        }

        // Item update & Magnetism check
        const { height } = this.scale;
        const items = this.fallingItems.getChildren() as (EnergyCollectible | HazardObstacle)[];
        const magnetDistance = 90; // Pixels

        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];

            // Clean up off-screen
            if (item.y > height + 40) {
                // If a clean item falls off screen without being caught, reset combo!
                if (item instanceof EnergyCollectible && !item.isCollected) {
                    this.resetCombo();
                }
                item.destroy();
                continue;
            }

            // Magnetic attraction for clean energy items
            if (item instanceof EnergyCollectible && !item.isCollected) {
                const dist = Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y);
                if (dist < magnetDistance) {
                    item.pullTowards(this.player.x, this.player.y);
                }
            }
        }
    }

    private animateFloorConduit(): void {
        const { width, height } = this.scale;
        const floorTopY = height - 40;

        this.conduitPhase += 0.08;
        this.conduitGfx.clear();

        // Glowing pulse line along the substation lip
        this.conduitGfx.lineStyle(2, 0x00E5FF, 0.85);
        this.conduitGfx.lineBetween(0, floorTopY, width, floorTopY);

        // Moving pulse dot along the conduit
        const pulseX = (Math.sin(this.conduitPhase) * 0.5 + 0.5) * width;
        this.conduitGfx.fillStyle(0xFFFFFF, 1);
        this.conduitGfx.fillCircle(pulseX, floorTopY, 3);
    }

    private spawnItem(): void {
        if (!this.isGameActive) return;

        const { width } = this.scale;
        const spawnX = Phaser.Math.Between(40, width - 40);

        // 70% chance of clean energy, 30% chance of hazard
        const isClean = Math.random() < 0.70;

        if (isClean) {
            const data = Phaser.Utils.Array.GetRandom(this.energyTypes) as EnergyItemData;
            const item = new EnergyCollectible(this, spawnX, -30, data);
            this.fallingItems.add(item);
            item.setVelocityY(Phaser.Math.Between(180, 250));
        } else {
            const data = Phaser.Utils.Array.GetRandom(this.hazardTypes) as HazardItemData;
            const hazard = new HazardObstacle(this, spawnX, -30, data);
            this.fallingItems.add(hazard);
            hazard.setVelocityY(Phaser.Math.Between(210, 290));
        }
    }

    private handlePlayerCollision(
        _playerObj: Phaser.GameObjects.GameObject,
        itemObj: Phaser.GameObjects.GameObject
    ): void {
        if (!this.isGameActive) return;

        if (itemObj instanceof EnergyCollectible) {
            if (itemObj.isCollected) return;
            this.collectEnergy(itemObj);
        } else if (itemObj instanceof HazardObstacle) {
            if (itemObj.isTriggered || this.player.isInvincible) return;
            this.hitHazard(itemObj);
        }
    }

    private collectEnergy(item: EnergyCollectible): void {
        item.collect();
        const data = item.itemData;

        // Apply combo multiplier
        const earnedPoints = data.points * this.combo;
        this.score += earnedPoints;
        this.cleanEnergyProgress = Math.min(100, this.cleanEnergyProgress + data.progress);

        // Sound feedback
        SoundFX.playCollect(this.combo);

        // Increment combo up to max
        if (this.combo < this.maxCombo) {
            this.combo++;
            if (this.combo >= 4) {
                SoundFX.playComboMilestone();
            }
        }
        EventBus.emit(GameEvents.COMBO_UPDATED, this.combo);

        // Particle explosion
        this.particleEmitter.explode(16, item.x, item.y);

        // Dynamic floating popup with combo banner
        const comboText = this.combo > 1 ? ` COMBO x${this.combo}!` : '';
        this.showFloatingPopup(item.x, item.y, `+${earnedPoints} kWh${comboText}`, this.combo > 2 ? '#4ADE80' : '#FACC15');

        // Notify HUD
        EventBus.emit(GameEvents.SCORE_UPDATED, this.score);
        EventBus.emit(GameEvents.PROGRESS_UPDATED, this.cleanEnergyProgress);

        // Check Win
        if (this.cleanEnergyProgress >= this.targetProgress) {
            this.winGame();
        }
    }

    private hitHazard(hazard: HazardObstacle): void {
        hazard.hit();
        const data = hazard.hazardData;

        // Reset combo
        this.resetCombo();

        this.lives = Math.max(0, this.lives - data.damage);
        this.cleanEnergyProgress = Math.max(0, this.cleanEnergyProgress - data.penalty);

        // Sound feedback
        SoundFX.playHazard();

        // Hit-stop: momentary 45ms freeze frame for tactile impact punch
        this.physics.world.pause();
        this.time.delayedCall(45, () => {
            if (this.isGameActive) this.physics.world.resume();
        });

        // Player animation & damage flash
        this.player.takeDamage();
        this.showFloatingPopup(hazard.x, hazard.y, `-${data.penalty}% ${data.label}!`, '#EF4444');

        EventBus.emit(GameEvents.LIVES_UPDATED, this.lives);
        EventBus.emit(GameEvents.PROGRESS_UPDATED, this.cleanEnergyProgress);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private resetCombo(): void {
        if (this.combo > 1) {
            this.combo = 1;
            EventBus.emit(GameEvents.COMBO_UPDATED, this.combo);
        }
    }

    private showFloatingPopup(x: number, y: number, text: string, color: string): void {
        const popup = this.add.text(x, y - 10, text, {
            fontSize: '13px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: color
        }).setOrigin(0.5).setDepth(20);

        // Elastic pop animation
        popup.setScale(0.6);
        this.tweens.add({
            targets: popup,
            scaleX: 1.15,
            scaleY: 1.15,
            y: y - 40,
            duration: 250,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: popup,
                    alpha: 0,
                    y: y - 65,
                    duration: 400,
                    onComplete: () => popup.destroy()
                });
            }
        });
    }

    private winGame(): void {
        this.isGameActive = false;
        window.__gameActive = false;
        SoundFX.playWin();
        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(350, 10, 14, 26);
        this.time.delayedCall(350, () => {
            this.scene.start('WinScene', { score: this.score, progress: this.cleanEnergyProgress });
        });
    }

    private gameOver(): void {
        this.isGameActive = false;
        window.__gameActive = false;
        SoundFX.playGameOver();
        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(350, 10, 14, 26);
        this.time.delayedCall(350, () => {
            this.scene.start('GameOverScene', { score: this.score, progress: this.cleanEnergyProgress });
        });
    }
}
