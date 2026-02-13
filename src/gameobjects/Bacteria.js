import { Physics } from "phaser";

/**
 * Bacteria / contaminant enemies.
 * They scroll with the world and move in patterns.
 */

const BACTERIA_TYPES = [
    { key: "bacteria1", speed: 60, hp: 1 },
    { key: "bacteria2", speed: 40, hp: 2 },
    { key: "skull", speed: 80, hp: 1 },
    { key: "poop", speed: 50, hp: 1 },
    { key: "factory", speed: 30, hp: 3 },
];

export class Bacteria extends Physics.Arcade.Sprite {
    hp = 1;
    moveSpeed = 60;
    initialY = 0;
    floatAmplitude = 0;
    floatSpeed = 0;
    alive = true;

    constructor(scene, x, y, typeIndex) {
        const type = BACTERIA_TYPES[typeIndex % BACTERIA_TYPES.length];
        super(scene, x, y, type.key);
        this.hp = type.hp;
        this.moveSpeed = type.speed;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.setImmovable(true);
        this.body.setSize(30, 30);
        this.initialY = y;
        this.floatAmplitude = Phaser.Math.Between(20, 50);
        this.floatSpeed = Phaser.Math.Between(1500, 3000);

        // Move left toward the player
        this.body.setVelocityX(-this.moveSpeed);

        // Slight pulsing animation
        scene.tweens.add({
            targets: this,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 300 + Math.random() * 300,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    takeDamage(scene) {
        this.hp--;
        if (this.hp <= 0) {
            this.die(scene);
            return true;
        }
        // Flash red
        this.setTint(0xff0000);
        scene.time.delayedCall(150, () => {
            if (this.active) this.clearTint();
        });
        return false;
    }

    die(scene) {
        this.alive = false;
        // Burst effect
        const txt = scene.add.text(this.x, this.y, "💥", {
            fontSize: "32px"
        }).setOrigin(0.5);
        scene.tweens.add({
            targets: txt,
            alpha: 0,
            scale: 2,
            duration: 400,
            onComplete: () => txt.destroy()
        });
        this.destroy();
    }

    update(time) {
        if (!this.active) return;
        // Sinusoidal vertical movement
        this.y = this.initialY + Math.sin(time / this.floatSpeed * Math.PI * 2) * this.floatAmplitude;

        // Destroy if off screen left
        if (this.x < -80) {
            this.destroy();
        }
    }
}

export { BACTERIA_TYPES };
