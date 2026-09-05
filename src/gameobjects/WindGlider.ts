import { Physics, Scene } from 'phaser';

export class WindGlider extends Physics.Arcade.Sprite {
    public speed: number = 85; // km/h base speed
    public maxNormalSpeed: number = 95;
    public maxTurboSpeed: number = 150;
    public minSpeed: number = 35;
    public isSpinningOut: boolean = false;
    public isBoosting: boolean = false;

    private lateralSpeed: number = 360;
    private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadowGfx!: Phaser.GameObjects.Graphics;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'wind_glider');

        // Dynamic sled shadow
        this.shadowGfx = scene.add.graphics().setDepth(8);
        this.updateShadow();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.0);
        this.setDepth(10);
        this.setCollideWorldBounds(true);

        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setSize(22, 26);
        body.setOffset(5, 3);

        // Subtle glow around aerodynamic hull
        if (this.preFX) {
            this.preFX.addGlow(0x00E5FF, 2, 0.4, false, 0.1, 8);
        }

        // Speed trail particle emitter (twin trails from rear thrusters)
        this.trailEmitter = scene.add.particles(0, 0, 'spark', {
            speed: { min: 40, max: 120 },
            scale: { start: 1.4, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 250,
            blendMode: 'ADD',
            emitting: false
        }).setDepth(9);
    }

    private updateShadow(): void {
        this.shadowGfx.clear();
        this.shadowGfx.fillStyle(0x000000, 0.4);
        this.shadowGfx.fillEllipse(this.x, this.y + 24, 26, 8);
    }

    public preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.updateShadow();

        // Natural speed recovery after spin-out or turbo fade
        if (!this.isSpinningOut) {
            if (this.isBoosting) {
                // Turbo gradually settles down
                this.speed = Math.max(this.maxNormalSpeed, this.speed - 0.15);
                if (this.speed <= this.maxNormalSpeed + 2) {
                    this.isBoosting = false;
                }
            } else if (this.speed < this.maxNormalSpeed) {
                // Accelerate back up to cruising speed
                this.speed = Math.min(this.maxNormalSpeed, this.speed + 0.35);
            }
        }

        // Emit speed trail
        if (this.speed > 80 && Math.random() < 0.4) {
            this.trailEmitter.explode(1, this.x - 6, this.y + 16);
            this.trailEmitter.explode(1, this.x + 6, this.y + 16);
        }
    }

    public steerLeft(): void {
        if (this.isSpinningOut) return;
        this.setVelocityX(-this.lateralSpeed);

        // Tilt sled visually into the curve
        this.scene.tweens.add({
            targets: this,
            angle: -16,
            duration: 120,
            ease: 'Sine.easeOut'
        });
    }

    public steerRight(): void {
        if (this.isSpinningOut) return;
        this.setVelocityX(this.lateralSpeed);

        // Tilt sled visually into the curve
        this.scene.tweens.add({
            targets: this,
            angle: 16,
            duration: 120,
            ease: 'Sine.easeOut'
        });
    }

    public centerSteering(): void {
        if (this.isSpinningOut) return;
        this.setVelocityX(0);

        // Level back to 0 angle
        this.scene.tweens.add({
            targets: this,
            angle: 0,
            duration: 140,
            ease: 'Sine.easeOut'
        });
    }

    /**
     * Hit wind gust boost pad: shoot up to 150 km/h with visual streak
     */
    public applyTurboBoost(): void {
        if (this.isSpinningOut) return;
        this.isBoosting = true;
        this.speed = this.maxTurboSpeed;

        // Big burst of cyan particles
        this.trailEmitter.explode(16, this.x, this.y + 10);

        // Aerodynamic forward stretch
        this.scene.tweens.add({
            targets: this,
            scaleY: 2.5,
            scaleX: 1.7,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    /**
     * Collide with rock / log: 360 spin-out and speed drop
     */
    public triggerSpinOut(onComplete?: () => void): void {
        if (this.isSpinningOut) return;

        this.isSpinningOut = true;
        this.isBoosting = false;
        this.speed = this.minSpeed;
        this.setVelocityX(0);

        // 360 degree spin-out tween
        this.scene.tweens.add({
            targets: this,
            angle: this.angle + 360,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.angle = 0;
                this.isSpinningOut = false;
                if (onComplete) onComplete();
            }
        });
    }

    public destroy(fromScene?: boolean): void {
        if (this.shadowGfx) this.shadowGfx.destroy();
        if (this.trailEmitter) this.trailEmitter.destroy();
        super.destroy(fromScene);
    }
}
