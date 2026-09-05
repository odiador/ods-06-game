import { Physics, Scene } from 'phaser';
import { EnergyItemData } from '../types/game';

export class EnergyCollectible extends Physics.Arcade.Sprite {
    public itemData: EnergyItemData;
    public isCollected: boolean = false;
    private floatTween?: Phaser.Tweens.Tween;

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

        // Hardware accelerated glow
        if (this.preFX) {
            this.preFX.addGlow(data.glowColor, 3, 0.6, false, 0.1, 10);
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

    public collect(): void {
        this.isCollected = true;
        if (this.floatTween) {
            this.floatTween.stop();
        }

        // Pulse scale up and fade out
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            y: this.y - 30,
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
