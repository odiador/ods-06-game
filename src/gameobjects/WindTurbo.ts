import { Physics, Scene } from 'phaser';

export class WindTurbo extends Physics.Arcade.Sprite {
    public isCollected: boolean = false;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'wind_gust');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.6);
        this.setDepth(6);

        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setSize(44, 28);
        body.setOffset(2, 2);

        // Neon cyan glow
        if (this.preFX) {
            this.preFX.addGlow(0x00E5FF, 3, 0.6, false, 0.1, 10);
        }
    }

    public collect(): void {
        this.isCollected = true;
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.2,
            scaleY: 2.2,
            alpha: 0,
            duration: 200,
            onComplete: () => this.destroy()
        });
    }
}
