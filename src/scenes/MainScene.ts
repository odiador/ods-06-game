import { Scene, Types } from 'phaser';
import { EnergyCollectible } from '../gameobjects/EnergyCollectible';
import { GridTechnician } from '../gameobjects/GridTechnician';
import { HazardObstacle } from '../gameobjects/HazardObstacle';
import { EventBus, GameEvents } from '../systems/EventBus';
import { EnergyItemData, HazardItemData } from '../types/game';

export class MainScene extends Scene {
    private player!: GridTechnician;
    private cursors!: Types.Input.Keyboard.CursorKeys;
    private fallingItems!: Phaser.Physics.Arcade.Group;
    private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    private score: number = 0;
    private lives: number = 3;
    private cleanEnergyProgress: number = 0; // 0% to 100%
    private readonly targetProgress: number = 80; // Win condition
    private isGameActive: boolean = false;

    private readonly energyTypes: EnergyItemData[] = [
        { key: 'solar', label: 'Solar Fotovoltaica', points: 15, progress: 6, glowColor: 0xFACC15 },
        { key: 'wind', label: 'Eólica Marina', points: 12, progress: 5, glowColor: 0x38BDF8 },
        { key: 'battery', label: 'Almacenamiento Batería', points: 20, progress: 8, glowColor: 0x22C55E },
        { key: 'hydro', label: 'Hidroeléctrica', points: 10, progress: 5, glowColor: 0x06B6D4 },
    ];

    private readonly hazardTypes: HazardItemData[] = [
        { key: 'coal', label: 'Carbón Térmico', penalty: 4, damage: 1 },
        { key: 'oil', label: 'Fósil Combustión', penalty: 5, damage: 1 },
        { key: 'co2', label: 'Emisión CO2', penalty: 4, damage: 1 },
        { key: 'surge', label: 'Sobrecarga de Red', penalty: 6, damage: 1 },
    ];

    constructor() {
        super('MainScene');
    }

    init(): void {
        this.score = 0;
        this.lives = 3;
        this.cleanEnergyProgress = 0;
        this.isGameActive = true;
        window.__gameActive = true;
    }

    create(): void {
        const { width, height } = this.scale;

        // ── 1. Smart Grid Background ──
        const bg = this.add.graphics();
        bg.fillStyle(0x0A0E1A, 1);
        bg.fillRect(0, 0, width, height);

        // Animated grid lines
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x1E293B, 0.4);
        for (let x = 0; x <= width; x += 30) {
            gridGfx.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y <= height; y += 30) {
            gridGfx.lineBetween(0, y, width, y);
        }

        // Camera vignette effect if WebGL postFX is available
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.8, 0.4);
        }

        // ── 2. Particle Emitter for Energy Bursts ──
        this.particleEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 60, max: 180 },
            scale: { start: 1.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            emitting: false
        });

        // ── 3. Player ──
        this.player = new GridTechnician(this, width / 2, height - 70);

        // ── 4. Groups & Physics Overlaps ──
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

        // ── 5. Controls ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // ── 6. Spawner Timer ──
        this.time.addEvent({
            delay: 750,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true
        });

        // ── 7. Launch HUD ──
        this.scene.launch('HudScene', {
            targetProgress: this.targetProgress,
            initialLives: this.lives
        });

        this.cameras.main.fadeIn(300, 10, 14, 26);
    }

    update(): void {
        if (!this.isGameActive) return;

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

        // Clean up out of bounds falling items
        const { height } = this.scale;
        const items = this.fallingItems.getChildren() as (EnergyCollectible | HazardObstacle)[];
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.y > height + 40) {
                item.destroy();
            }
        }
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
            item.setVelocityY(Phaser.Math.Between(180, 260));
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

        // Update score & progress
        this.score += data.points;
        this.cleanEnergyProgress = Math.min(100, this.cleanEnergyProgress + data.progress);

        // Emit particles
        this.particleEmitter.explode(12, item.x, item.y);

        // Floating points text
        this.showFloatingText(item.x, item.y, `+${data.points} kWh`, '#FACC15');

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

        this.lives = Math.max(0, this.lives - data.damage);
        this.cleanEnergyProgress = Math.max(0, this.cleanEnergyProgress - data.penalty);

        this.player.takeDamage();
        this.showFloatingText(hazard.x, hazard.y, `-${data.penalty}% ${data.label}`, '#EF4444');

        EventBus.emit(GameEvents.LIVES_UPDATED, this.lives);
        EventBus.emit(GameEvents.PROGRESS_UPDATED, this.cleanEnergyProgress);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private showFloatingText(x: number, y: number, text: string, color: string): void {
        const txt = this.add.text(x, y - 10, text, {
            fontSize: '14px',
            fontFamily: "'Courier New', Courier, monospace",
            fontStyle: 'bold',
            color: color
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt,
            y: y - 45,
            alpha: 0,
            duration: 750,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    private winGame(): void {
        this.isGameActive = false;
        window.__gameActive = false;
        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(300, 10, 14, 26);
        this.time.delayedCall(300, () => {
            this.scene.start('WinScene', { score: this.score, progress: this.cleanEnergyProgress });
        });
    }

    private gameOver(): void {
        this.isGameActive = false;
        window.__gameActive = false;
        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(300, 10, 14, 26);
        this.time.delayedCall(300, () => {
            this.scene.start('GameOverScene', { score: this.score, progress: this.cleanEnergyProgress });
        });
    }
}
