import { Physics } from "phaser";

export class EmojiPlayer extends Physics.Arcade.Sprite {
    health = 3;
    maxHealth = 3;
    isInvincible = false;
    facing = 1; // 1=right, -1=left

    constructor(scene, x, y) {
        super(scene, x, y, "player");
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.2);
        this.body.setSize(28, 38);
        this.body.setOffset(10, 6);
        this.setCollideWorldBounds(true);
        this.body.setMaxVelocityY(600);
        this.body.setMaxVelocityX(300);
        this.body.setDragX(800);
    }

    jump() {
        if (this.body.blocked.down) {
            this.body.setVelocityY(-480);
            this.setTexture("player-jump");
        }
    }

    /** Mario-style bounce after stomping an enemy */
    bounce() {
        this.body.setVelocityY(-300);
    }

    takeDamage() {
        if (this.isInvincible) return;
        this.health--;
        this.isInvincible = true;
        this.scene.tweens.add({
            targets: this, alpha: 0.3, duration: 80,
            yoyo: true, repeat: 6,
            onComplete: () => { this.alpha = 1; this.isInvincible = false; }
        });
        this.scene.cameras.main.shake(120, 0.008);
    }

    handleMovement(cursors, hud) {
        const speed = 220;
        const left = cursors.left.isDown || (hud && hud.touchLeft);
        const right = cursors.right.isDown || (hud && hud.touchRight);

        if (left) {
            this.body.setVelocityX(-speed);
            this.facing = -1;
            this.setFlipX(true);
        } else if (right) {
            this.body.setVelocityX(speed);
            this.facing = 1;
            this.setFlipX(false);
        }
        if (this.body.blocked.down) {
            this.setTexture(Math.abs(this.body.velocity.x) > 30 ? "player-jump" : "player");
        }
    }
}
