import { Physics, Scene } from 'phaser';

export type ObstacleType = 'track_rock' | 'track_log' | 'solar_dust' | 'hydro_vortex';

export class TrackObstacle extends Physics.Arcade.Sprite {
    public obstacleType: ObstacleType;
    public isHit: boolean = false;

    constructor(scene: Scene, x: number, y: number, type: ObstacleType = 'track_rock') {
        super(scene, x, y, type);
        this.obstacleType = type;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.8);
        this.setDepth(6);

        const body = this.body as Physics.Arcade.Body;
        body.setAllowGravity(false);
        if (type === 'track_log') {
            body.setSize(44, 20);
            body.setOffset(2, 2);
        } else if (type === 'solar_dust' || type === 'hydro_vortex') {
            body.setSize(28, 28);
            body.setOffset(2, 2);
        } else {
            body.setSize(26, 26);
            body.setOffset(3, 3);
        }
    }

    public hit(): void {
        if (this.isHit) return;
        this.isHit = true;
        this.disableBody(true, false);
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.4,
            scaleY: 0.4,
            alpha: 0,
            duration: 200,
            onComplete: () => this.destroy()
        });
    }
}
