import { Scene } from "phaser";

export class MainScene extends Scene {
    player = null;
    cursors = null;
    fallingItems = null;
    points = 0;
    lives = 3;
    progressTo2030 = 0; // 0 to 100
    targetProgress = 80; // Win at 80% (shorter game)
    itemsCollected = 0;
    gameEnded = false; // Flag to prevent multiple win/gameOver calls
    isInvincible = false; // Temporary invincibility after losing a life
    
    goodItemTypes = [
        { key: "water-drop", points: 5, progress: 4 },
        { key: "water-bottle", points: 10, progress: 6 },
        { key: "glass-water", points: 8, progress: 5 },
        { key: "fish", points: 12, progress: 7 },
        { key: "tree", points: 10, progress: 6 },
        { key: "recycle", points: 15, progress: 8 },
        { key: "shower", points: 8, progress: 5 },
        { key: "herb", points: 6, progress: 4 },
    ];
    
    badItemTypes = [
        { key: "bacteria1", progress: -3 },
        { key: "bacteria2", progress: -3 },
        { key: "skull", progress: -5 },
        { key: "poop", progress: -4 },
        { key: "factory", progress: -6 },
    ];

    constructor() { super("MainScene"); }

    init() {
        this.points = 0;
        this.lives = 3;
        this.progressTo2030 = 0;
        this.itemsCollected = 0;
        this.gameEnded = false;
        this.isInvincible = false;
    }

    create() {
        const W = 540;
        const H = 960;

        // ── Solid cyan background (UN SDG 6 style) ──
        const ODS_CYAN = 0x26BDE2;
        const bg = this.add.graphics();
        bg.fillStyle(ODS_CYAN, 1);
        bg.fillRect(0, 0, W, H);

        // ── Water drop icons in background (subtle) ──
        for (let i = 0; i < 15; i++) {
            this.add.text(
                Phaser.Math.Between(40, W - 40),
                Phaser.Math.Between(20, H - 60),
                "💧",
                { fontSize: `${Phaser.Math.Between(24, 48)}px` }
            ).setAlpha(Phaser.Math.FloatBetween(0.05, 0.12)).setOrigin(0.5);
        }

        // ── Player at bottom ──
        this.player = this.physics.add.sprite(W / 2, H - 80, "player").setScale(1.5);
        this.player.setCollideWorldBounds(true);
        this.player.body.allowGravity = false;
        this.player.body.setSize(28, 38);
        this.player.setImmovable(true);

        // ── Falling items group ──
        this.fallingItems = this.physics.add.group();

        // ── Overlap detection ──
        this.physics.add.overlap(this.player, this.fallingItems, this.collectItem, null, this);

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();

        // ── Spawn items periodically ──
        this.time.addEvent({
            delay: 700,
            callback: this.spawnFallingItem,
            callbackScope: this,
            loop: true
        });

        // ── Camera fade in ──
        this.cameras.main.fadeIn(400, 0x26, 0xBD, 0xE2);

        // ── HUD ──
        this.scene.launch("HudScene", {
            maxDistance: 100,
            lives: this.lives
        });
    }

    update() {
        if (this.gameEnded) return; // Don't update if game has ended
        
        // Player movement
        const speed = 300;
        const hud = this.scene.get("HudScene");
        const left = this.cursors.left.isDown || (hud && hud.touchLeft);
        const right = this.cursors.right.isDown || (hud && hud.touchRight);

        if (left) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(false);
        } else if (right) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(true);
        } else {
            this.player.setVelocityX(0);
        }

        // Remove items that fell off screen
        this.fallingItems.children.entries.forEach(item => {
            if (item.y > 960 + 50) {
                item.destroy();
            }
        });

        // Check win condition
        if (this.progressTo2030 >= this.targetProgress) {
            this.win();
        }

        // Check game over
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    spawnFallingItem() {
        if (this.gameEnded) return; // Don't spawn if game has ended
        
        const x = Phaser.Math.Between(50, 490);
        const isGood = Math.random() > 0.3; // 70% good items, 30% bad
        
        let itemData, item;
        
        if (isGood) {
            itemData = Phaser.Utils.Array.GetRandom(this.goodItemTypes);
            item = this.fallingItems.create(x, -30, itemData.key);
            item.setScale(2); // Double the size
            item.itemData = itemData;
            item.isGood = true;
        } else {
            itemData = Phaser.Utils.Array.GetRandom(this.badItemTypes);
            item = this.fallingItems.create(x, -30, itemData.key);
            item.setScale(2); // Double the size
            item.itemData = itemData;
            item.isGood = false;
            
            // Bad items pulse/shake
            this.tweens.add({
                targets: item,
                scaleX: 2.3,
                scaleY: 2.3,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        }
        
        item.setVelocityY(Phaser.Math.Between(220, 320));
        item.body.allowGravity = true;
        
        // Gentle floating animation
        this.tweens.add({
            targets: item,
            x: item.x + Phaser.Math.Between(-20, 20),
            duration: Phaser.Math.Between(800, 1500),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    collectItem(player, item) {
        if (item.collected) return;
        item.collected = true;

        const data = item.itemData;
        
        if (item.isGood) {
            // Good item collected
            this.points += data.points;
            this.progressTo2030 = Math.min(100, this.progressTo2030 + data.progress);
            this.itemsCollected++;
            
            // Visual feedback
            const txt = this.add.text(item.x, item.y, `+${data.points} 💧`, {
                fontSize: "18px",
                fontFamily: "Arial",
                color: "#ffffff",
                stroke: "#1A8AAB",
                strokeThickness: 3
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: txt,
                y: txt.y - 50,
                alpha: 0,
                duration: 800,
                onComplete: () => txt.destroy()
            });
            
            // Sparkles
            for (let i = 0; i < 5; i++) {
                const sparkle = this.add.text(
                    item.x + Phaser.Math.Between(-20, 20),
                    item.y + Phaser.Math.Between(-20, 20),
                    "✨",
                    { fontSize: "16px" }
                );
                this.tweens.add({
                    targets: sparkle,
                    alpha: 0,
                    scale: 1.5,
                    duration: 600,
                    onComplete: () => sparkle.destroy()
                });
            }
        } else {
            // Bad item hit - lose a life
            if (this.isInvincible) {
                item.destroy();
                return;
            }
            
            this.lives = Math.max(0, this.lives - 1);
            this.progressTo2030 = Math.max(0, this.progressTo2030 + data.progress);
            
            // Temporary invincibility
            this.isInvincible = true;
            
            // Flash player during invincibility
            this.tweens.add({
                targets: this.player,
                alpha: 0.4,
                duration: 150,
                yoyo: true,
                repeat: 9,
                onComplete: () => { 
                    this.player.alpha = 1;
                    this.isInvincible = false;
                }
            });
            
            // Visual feedback
            const txt = this.add.text(item.x, item.y, "-1 ❤️", {
                fontSize: "24px",
                fontFamily: "Arial",
                color: "#ff4444",
                stroke: "#000000",
                strokeThickness: 4
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: txt,
                y: txt.y - 50,
                alpha: 0,
                duration: 800,
                onComplete: () => txt.destroy()
            });
            
            // Screen shake
            this.cameras.main.shake(200, 0.012);
        }
        
        item.destroy();
        this.events.emit("update-hud");
        this.events.emit("update-progress", this.progressTo2030);
    }

    win() {
        if (this.gameEnded) return; // Prevent multiple calls
        this.gameEnded = true;
        
        this.physics.pause();
        this.cameras.main.fadeOut(600, 0x26, 0xBD, 0xE2);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.stop("HudScene");
            this.scene.start("WinScene", {
                points: this.points,
                items: this.itemsCollected
            });
        });
    }

    gameOver() {
        if (this.gameEnded) return; // Prevent multiple calls
        this.gameEnded = true;
        
        this.physics.pause();
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.stop("HudScene");
            this.scene.start("GameOverScene", {
                points: this.points,
                items: this.itemsCollected,
                progress: Math.round(this.progressTo2030)
            });
        });
    }
}