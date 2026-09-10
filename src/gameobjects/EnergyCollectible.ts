import { Physics, Scene } from 'phaser';
import { EnergyItemData } from '../types/game';

export class EnergyCollectible extends Physics.Arcade.Sprite {
    public itemData: EnergyItemData;
    public isCollected: boolean = false;
    private floatTween?: Phaser.Tweens.Tween;
    public isMagnetized: boolean = false;

    constructor(scene: Scene, x: number, y: number, data: EnergyItemData) {
        super(scene, x, y, data.key);
        this.itemData = data;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.8);
        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setSize(24, 24);
        body.setOffset(4, 4);

        // Borde verde para cosas buenas (energias limpias)
        if (this.preFX) {
            this.preFX.addGlow(0x10B981, 4, 1.2, false, 0.1, 10);
        }

        // Floating sinusoidal wiggle
        this.floatTween = scene.tweens.add({
            targets: this,
            x: x + Phaser.Math.Between(-16, 16),
            duration: Phaser.Math.Between(900, 1400),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Magnetism pull: pulls the item towards player when within range
     */
    public pullTowards(targetX: number, targetY: number, strength: number = 260): void {
        if (this.isCollected) return;

        if (!this.isMagnetized) {
            this.isMagnetized = true;
            if (this.floatTween) {
                this.floatTween.stop();
            }
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
        const vx = Math.cos(angle) * strength;
        const vy = Math.sin(angle) * strength + 80; // Add downward momentum

        this.setVelocity(vx, vy);

        // Subtle stretch towards player
        this.setRotation(angle - Math.PI / 2);
    }

    public collect(): void {
        this.isCollected = true;
        if (this.floatTween) {
            this.floatTween.stop();
        }

        // Pulse scale up, glow flare, and fade out
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.8,
            scaleY: 2.8,
            alpha: 0,
            y: this.y - 25,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.destroy();
            }
        });
    }

    public destroy(fromScene?: boolean): void {
        if (this.floatTween) {
            this.floatTween.stop();
        }
        super.destroy(fromScene);
    }
}
