import { Physics } from "phaser";

const BACTERIA_TYPES = [
    { key: "bacteria1" },
    { key: "bacteria2" },
    { key: "skull" },
    { key: "poop" },
    { key: "factory" },
];

export class Bacteria extends Physics.Arcade.Sprite {
    alive = true;
    walkSpeed = 60;

    constructor(scene, x, y, typeIndex) {
        const type = BACTERIA_TYPES[typeIndex % BACTERIA_TYPES.length];
        super(scene, x, y, type.key);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setSize(30, 30);
        this.body.setBounce(0);
        this.body.setCollideWorldBounds(true);
        this.walkSpeed = 40 + Math.random() * 40;
        this.body.setVelocityX(-this.walkSpeed);

        // pulse
        scene.tweens.add({
            targets: this,
            scaleX: 1.12, scaleY: 1.12,
            duration: 400 + Math.random() * 200,
            yoyo: true, repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    /** Call from collider with platforms so it turns around at edges */
    turnIfBlocked() {
        if (this.body.blocked.left) this.body.setVelocityX(this.walkSpeed);
        if (this.body.blocked.right) this.body.setVelocityX(-this.walkSpeed);
    }

    die(scene) {
        this.alive = false;
        const txt = scene.add.text(this.x, this.y, "💥", { fontSize: "32px" }).setOrigin(0.5);
        scene.tweens.add({
            targets: txt, alpha: 0, scale: 2, duration: 400,
            onComplete: () => txt.destroy()
        });
        this.destroy();
    }
}

export { BACTERIA_TYPES };
