import { Physics, Scene } from 'phaser';

export class GridTechnician extends Physics.Arcade.Sprite {
    public isInvincible: boolean = false;
    private normalSpeed: number = 340;
    private lastDirection: number = 0; // -1, 0, 1
    private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private shadowGfx!: Phaser.GameObjects.Graphics;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'player_idle');

        // Shadow beneath player
        this.shadowGfx = scene.add.graphics();
        this.updateShadow();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.0); // 32x32 -> 64x64 crisp pixel art
        this.setCollideWorldBounds(true);

        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(20, 26);
        body.setOffset(6, 6);

        // PreFX glow on helmet / visor
        if (this.preFX) {
            this.preFX.addGlow(0xFACC15, 2, 0.4, false, 0.1, 8);
        }

        // Footstep dust emitter
        this.dustEmitter = scene.add.particles(0, 0, 'dust', {
            speed: { min: 20, max: 50 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            emitting: false
        });
    }

    private updateShadow(): void {
        this.shadowGfx.clear();
        this.shadowGfx.fillStyle(0x000000, 0.45);
        this.shadowGfx.fillEllipse(this.x, this.y + 28, 28, 8);
    }

    public preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        this.updateShadow();
    }

    private applySquashAndStretch(direction: number): void {
        if (this.lastDirection !== direction && direction !== 0) {
            this.lastDirection = direction;
            // Emit puff of dust
            this.dustEmitter.explode(4, this.x + (direction > 0 ? -12 : 12), this.y + 26);

            // Squash horizontally, stretch vertically, then spring back
            this.scene.tweens.killTweensOf(this);
            this.scaleX = 2.4;
            this.scaleY = 1.7;
            this.scene.tweens.add({
                targets: this,
                scaleX: 2.0,
                scaleY: 2.0,
                duration: 200,
                ease: 'Back.easeOut'
            });
        }
    }

    public moveLeft(): void {
        this.setVelocityX(-this.normalSpeed);
        this.setFlipX(true);
        if (this.texture.key !== 'player_run') {
            this.setTexture('player_run');
        }
        this.applySquashAndStretch(-1);

        // Continuous subtle running dust
        if (Math.random() < 0.18) {
            this.dustEmitter.explode(1, this.x + 10, this.y + 26);
        }
    }

    public moveRight(): void {
        this.setVelocityX(this.normalSpeed);
        this.setFlipX(false);
        if (this.texture.key !== 'player_run') {
            this.setTexture('player_run');
        }
        this.applySquashAndStretch(1);

        // Continuous subtle running dust
        if (Math.random() < 0.18) {
            this.dustEmitter.explode(1, this.x - 10, this.y + 26);
        }
    }

    public stopMovement(): void {
        this.setVelocityX(0);
        if (this.texture.key !== 'player_idle') {
            this.setTexture('player_idle');
            this.lastDirection = 0;
        }
    }

    public takeDamage(onComplete?: () => void): void {
        if (this.isInvincible) return;

        this.isInvincible = true;
        this.scene.cameras.main.shake(180, 0.015);

        // Violent hit squash
        this.scene.tweens.killTweensOf(this);
        this.scaleX = 2.5;
        this.scaleY = 1.4;

        this.scene.tweens.add({
            targets: this,
            scaleX: 2.0,
            scaleY: 2.0,
            duration: 150,
            ease: 'Elastic.easeOut'
        });

        this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 80,
            yoyo: true,
            repeat: 7,
            onComplete: () => {
                this.alpha = 1;
                this.isInvincible = false;
                if (onComplete) onComplete();
            }
        });
    }

    public destroy(fromScene?: boolean): void {
        if (this.shadowGfx) this.shadowGfx.destroy();
        if (this.dustEmitter) this.dustEmitter.destroy();
        super.destroy(fromScene);
    }
}
