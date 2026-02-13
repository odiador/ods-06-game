import { Physics } from "phaser";

export class EmojiPlayer extends Physics.Arcade.Sprite {
    health = 3;
    maxHealth = 3;
    isInvincible = false;
    canShoot = true;
    bullets = null;
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

        this.bullets = scene.physics.add.group({
            defaultKey: "water-bullet",
            maxSize: 10,
            runChildUpdate: false
        });
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

    shoot() {
        if (!this.canShoot) return;
        const dir = this.facing;
        const bullet = this.bullets.get(this.x + dir * 20, this.y, "water-bullet");
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.body.allowGravity = false;
            bullet.body.setVelocityX(dir * 450);
            this.canShoot = false;
            this.scene.time.delayedCall(350, () => { this.canShoot = true; });
            this.scene.time.delayedCall(1500, () => {
                if (bullet.active) {
                    bullet.setActive(false).setVisible(false);
                    bullet.body.stop();
                }
            });
        }
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

    handleMovement(cursors) {
        const speed = 220;
        if (cursors.left.isDown) {
            this.body.setVelocityX(-speed);
            this.facing = -1;
            this.setFlipX(true);
        } else if (cursors.right.isDown) {
            this.body.setVelocityX(speed);
            this.facing = 1;
            this.setFlipX(false);
        }
        if (this.body.blocked.down) {
            this.setTexture(Math.abs(this.body.velocity.x) > 30 ? "player-jump" : "player");
        }
    }
}
