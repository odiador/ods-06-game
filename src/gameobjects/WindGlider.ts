import { Physics, Scene } from 'phaser';

export class WindGlider extends Physics.Arcade.Sprite {
    public speed: number = 45; // Lower, gentler initial speed (km/h)
    public maxNormalSpeed: number = 115; // Higher top cruising speed
    public maxTurboSpeed: number = 170; // High speed turbo peak
    public minSpeed: number = 28; // Speed floor after spin-out
    public isSpinningOut: boolean = false;
    public isBoosting: boolean = false;

    private lateralSpeed: number = 360;
    private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadowGfx!: Phaser.GameObjects.Graphics;

    constructor(scene: Scene, x: number, y: number, textureKey: string = 'wind_glider', glowColor: number = 0x00E5FF) {
        super(scene, x, y, textureKey);

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
            this.preFX.addGlow(glowColor, 2, 0.4, false, 0.1, 8);
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

        const dt = delta / 1000;

        // Natural progressive acceleration and turbo decay
        if (!this.isSpinningOut) {
            if (this.isBoosting) {
                // Turbo gradually settles down smoothly back to cruising speed
                this.speed = Math.max(this.maxNormalSpeed, this.speed - 20 * dt);
                if (this.speed <= this.maxNormalSpeed + 1) {
                    this.isBoosting = false;
                }
            } else if (this.speed < this.maxNormalSpeed) {
                // Increased natural progressive acceleration (+9.0 km/h per second)
                const accelRate = 9.0;
                this.speed = Math.min(this.maxNormalSpeed, this.speed + accelRate * dt);
            }
        }

        // Emit speed trail when driving fast
        if (this.speed > 70 && Math.random() < 0.45) {
            this.trailEmitter.explode(1, this.x - 6, this.y + 16);
            this.trailEmitter.explode(1, this.x + 6, this.y + 16);
        }
    }

    public manualAccelerate(dt: number): void {
        if (this.isSpinningOut) return;
        const manualRate = 18.0;
        this.speed = Math.min(this.maxNormalSpeed + 15, this.speed + manualRate * dt);
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
     * Hit boost pad: adds +50 km/h to current speed with visual streak
     */
    public applyTurboBoost(): void {
        if (this.isSpinningOut) return;
        this.isBoosting = true;
        this.speed = Math.min(220, this.speed + 50);

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
