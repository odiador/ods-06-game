import { Physics } from "phaser";

export class EmojiPlayer extends Physics.Arcade.Sprite {
    /** @type {Phaser.Scene} */
    scene = null;
    health = 3;
    maxHealth = 3;
    isInvincible = false;
    canShoot = true;
    bullets = null;
    isOnGround = false;

    constructor(scene, x, y) {
        super(scene, x, y, "player");
        this.scene = scene;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.2);
        this.body.setSize(30, 40);
        this.body.setOffset(9, 4);
        this.setCollideWorldBounds(false);
        this.body.setMaxVelocityY(600);

        // Bullets group
        this.bullets = scene.physics.add.group({
            defaultKey: "water-bullet",
            maxSize: 20,
            runChildUpdate: false
        });
    }

    jump() {
        if (this.body.blocked.down || this.body.touching.down) {
            this.body.setVelocityY(-420);
            this.setTexture("player-jump");
            this.scene.time.delayedCall(300, () => {
                this.setTexture("player");
            });
        }
    }

    shoot() {
        if (!this.canShoot) return;
        const bullet = this.bullets.get(this.x + 20, this.y, "water-bullet");
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.allowGravity = false;
            bullet.body.setVelocityX(400);
            this.canShoot = false;
            this.scene.time.delayedCall(300, () => {
                this.canShoot = true;
            });
        }
    }

    takeDamage() {
        if (this.isInvincible) return;
        this.health--;
        this.isInvincible = true;

        // Flash effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.alpha = 1;
                this.isInvincible = false;
            }
        });

        this.scene.cameras.main.shake(150, 0.01);
    }

    heal() {
        if (this.health < this.maxHealth) {
            this.health++;
        }
    }

    update() {
        // Clean up off-screen bullets
        this.bullets.children.each((bullet) => {
            if (bullet.active && (bullet.x > this.scene.scale.width + 50 || bullet.x < -50)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
            }
        });
    }
}
