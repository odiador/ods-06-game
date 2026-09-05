import { Physics, Scene } from 'phaser';

export class GridTechnician extends Physics.Arcade.Sprite {
    public isInvincible: boolean = false;
    private normalSpeed: number = 340;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'player_idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2.0); // 32x32 -> 64x64 crisp pixel art
        this.setCollideWorldBounds(true);

        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(20, 26);
        body.setOffset(6, 6);

        // PreFX or postFX glow if WebGL is available
        if (this.preFX) {
            this.preFX.addGlow(0xFACC15, 2, 0.4, false, 0.1, 8);
        }
    }

    public moveLeft(): void {
        this.setVelocityX(-this.normalSpeed);
        this.setFlipX(true);
        if (this.texture.key !== 'player_run') {
            this.setTexture('player_run');
        }
    }

    public moveRight(): void {
        this.setVelocityX(this.normalSpeed);
        this.setFlipX(false);
        if (this.texture.key !== 'player_run') {
            this.setTexture('player_run');
        }
    }

    public stopMovement(): void {
        this.setVelocityX(0);
        if (this.texture.key !== 'player_idle') {
            this.setTexture('player_idle');
        }
    }

    public takeDamage(onComplete?: () => void): void {
        if (this.isInvincible) return;

        this.isInvincible = true;
        this.scene.cameras.main.shake(150, 0.012);

        this.scene.tweens.add({
            targets: this,
            alpha: 0.25,
            duration: 90,
            yoyo: true,
            repeat: 7,
            onComplete: () => {
                this.alpha = 1;
                this.isInvincible = false;
                if (onComplete) onComplete();
            }
        });
    }
}
