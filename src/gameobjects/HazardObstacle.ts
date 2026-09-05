import { Physics, Scene } from 'phaser';
import { HazardItemData } from '../types/game';

export class HazardObstacle extends Physics.Arcade.Sprite {
    public hazardData: HazardItemData;
    public isTriggered: boolean = false;
    private pulseTween?: Phaser.Tweens.Tween;

    constructor(scene: Scene, x: number, y: number, data: HazardItemData) {
        super(scene, x, y, data.key);
        this.hazardData = data;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.8);
        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setSize(22, 22);
        body.setOffset(5, 5);

        // Sinister red/dark glow
        if (this.preFX) {
            this.preFX.addGlow(0xEF4444, 2, 0.5, false, 0.1, 8);
        }

        // Warning throbbing pulse
        this.pulseTween = scene.tweens.add({
            targets: this,
            scaleX: 2.1,
            scaleY: 2.1,
            duration: 350,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeInOut'
        });
    }

    public hit(): void {
        this.isTriggered = true;
        if (this.pulseTween) {
            this.pulseTween.stop();
        }

        this.scene.tweens.add({
            targets: this,
            scaleX: 0.2,
            scaleY: 0.2,
            alpha: 0,
            duration: 180,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    public destroy(fromScene?: boolean): void {
        if (this.pulseTween) {
            this.pulseTween.stop();
        }
        super.destroy(fromScene);
    }
}
