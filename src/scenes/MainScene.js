import { Scene } from "phaser";
import { EmojiPlayer } from "../gameobjects/EmojiPlayer";
import { Collectible } from "../gameobjects/Collectible";
import { Bacteria } from "../gameobjects/Bacteria";

export class MainScene extends Scene {
    /** @type {EmojiPlayer} */
    player = null;
    cursors = null;
    spaceKey = null;
    zKey = null;

    // Groups
    platforms = null;
    collectibles = null;
    bacteria = null;

    // Auto-scroll
    scrollSpeed = 2;          // pixels per frame
    worldProgress = 0;        // how far we've scrolled
    levelLength = 12000;      // total distance to 2030

    // Spawning
    nextPlatformX = 0;
    nextCollectibleX = 300;
    nextBacteriaX = 600;
    collectibleIndex = 0;
    bacteriaIndex = 0;

    // Score
    points = 0;
    itemsCollected = 0;

    // Background layers
    bgLayers = [];
    clouds = [];

    // Ground
    groundTiles = [];

    // Platform texture counter
    platCounter = 0;

    // 2030 sign
    finishSign = null;
    levelComplete = false;

    constructor() {
        super("MainScene");
    }

    init() {
        this.points = 0;
        this.itemsCollected = 0;
        this.worldProgress = 0;
        this.nextPlatformX = 400;
        this.nextCollectibleX = 350;
        this.nextBacteriaX = 700;
        this.collectibleIndex = 0;
        this.bacteriaIndex = 0;
        this.platCounter = 0;
        this.levelComplete = false;
        this.scrollSpeed = 2;
        this.bgLayers = [];
        this.clouds = [];
        this.groundTiles = [];
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(600, 0x26, 0xBD, 0xE2);

        // ---- Sky gradient background (ODS-6 cyan tones) ----
        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x26BDE2, 0x26BDE2, 1);
        skyGradient.fillRect(0, 0, width, height);
        skyGradient.setScrollFactor(0);

        // ---- Sun ----
        this.add.image(width - 80, 60, "sun").setScrollFactor(0).setScale(1.5).setAlpha(0.9);

        // ---- Clouds (parallax) ----
        for (let i = 0; i < 6; i++) {
            const cloud = this.add.image(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(30, 140),
                "cloud"
            ).setAlpha(0.7).setScrollFactor(0);
            this.clouds.push({ img: cloud, speed: 0.2 + Math.random() * 0.3 });
        }

        // ---- Mountains (background decoration) ----
        for (let i = 0; i < 4; i++) {
            this.add.image(200 + i * 280, height - 110, "mountain")
                .setAlpha(0.3).setScale(1.5).setScrollFactor(0);
        }

        // ---- Ground ----
        this.platforms = this.physics.add.staticGroup();
        this.createGround();

        // ---- Floating platforms group ----
        this.floatingPlatforms = this.physics.add.staticGroup();

        // ---- Collectibles group ----
        this.collectiblesGroup = this.add.group({ runChildUpdate: false });

        // ---- Bacteria group ----
        this.bacteriaGroup = this.add.group({ runChildUpdate: false });

        // ---- Player ----
        this.player = new EmojiPlayer(this, 120, height - 120);

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.floatingPlatforms);

        // Overlap: player <-> collectibles
        this.physics.add.overlap(this.player, this.collectiblesGroup, (player, collectible) => {
            if (collectible.collected) return;
            const pts = collectible.collect(this);
            this.points += pts;
            this.itemsCollected++;
            this.events.emit("update-hud");
        });

        // Overlap: player <-> bacteria
        this.physics.add.overlap(this.player, this.bacteriaGroup, (player, bacteria) => {
            if (!bacteria.alive || this.player.isInvincible) return;
            this.player.takeDamage();
            this.events.emit("update-hud");
            if (this.player.health <= 0) {
                this.gameOver();
            }
        });

        // Overlap: bullets <-> bacteria
        this.physics.add.overlap(this.player.bullets, this.bacteriaGroup, (bullet, bacteria) => {
            if (!bacteria.alive) return;
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.body.stop();
            const killed = bacteria.takeDamage(this);
            if (killed) {
                this.points += 15;
                this.events.emit("update-hud");
            }
        });

        // ---- Input ----
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        // Touch / click to jump or shoot
        this.input.on("pointerdown", (pointer) => {
            if (pointer.x < this.scale.width / 2) {
                this.player.jump();
            } else {
                this.player.shoot();
            }
        });

        // ---- Launch HUD ----
        this.scene.launch("HudScene", {
            maxDistance: this.levelLength,
            health: this.player.health
        });

        // ---- Spawn initial content ----
        this.spawnInitialContent();

        // ---- Water wave decoration at bottom ----
        this.waveEmojis = [];
        for (let i = 0; i < 5; i++) {
            const w = this.add.image(i * 200, height - 12, "wave")
                .setScrollFactor(0).setAlpha(0.5).setScale(1.2);
            this.waveEmojis.push(w);
        }
    }

    createGround() {
        const { width, height } = this.scale;
        // Create ground as a wide static platform rectangle
        const groundHeight = 40;
        const groundY = height - groundHeight / 2;

        // Draw ground visual
        const groundGfx = this.add.graphics();
        groundGfx.fillStyle(0x8B4513, 1);
        groundGfx.fillRect(0, height - groundHeight, width, groundHeight);
        // Green top layer
        groundGfx.fillStyle(0x228B22, 1);
        groundGfx.fillRect(0, height - groundHeight, width, 8);
        groundGfx.setScrollFactor(0);

        // Physics ground
        const ground = this.add.rectangle(width / 2, groundY, width + 200, groundHeight, 0x8B4513);
        ground.setAlpha(0); // invisible, the graphics handle visuals
        this.platforms.add(ground);
    }

    spawnInitialContent() {
        // Spawn a few starting platforms and collectibles
        for (let i = 0; i < 5; i++) {
            this.spawnCollectible();
        }
        for (let i = 0; i < 3; i++) {
            this.spawnFloatingPlatform();
        }
    }

    spawnFloatingPlatform() {
        const { height } = this.scale;
        const x = this.nextPlatformX + Phaser.Math.Between(250, 400);
        const y = Phaser.Math.Between(height - 200, height - 100);
        const platWidth = Phaser.Math.Between(80, 140);

        const texKey = "plat-" + this.platCounter++;
        const gfx = this.add.graphics();
        gfx.fillStyle(0x228B22, 1);
        gfx.fillRoundedRect(0, 0, platWidth, 14, 4);
        gfx.fillStyle(0x8B4513, 1);
        gfx.fillRoundedRect(0, 10, platWidth, 10, 4);
        gfx.generateTexture(texKey, platWidth, 20);
        gfx.destroy();

        const plat = this.add.image(x, y, texKey);
        this.floatingPlatforms.add(plat);
        plat.body.setSize(platWidth, 16);
        plat.body.setOffset(0, 0);
        plat.body.updateFromGameObject();

        // Put a collectible on top sometimes
        if (Math.random() > 0.4) {
            const c = new Collectible(this, x, y - 30, this.collectibleIndex++);
            this.collectiblesGroup.add(c);
        }

        this.nextPlatformX = x;
    }

    spawnCollectible() {
        const { height } = this.scale;
        const x = this.nextCollectibleX + Phaser.Math.Between(150, 350);
        const y = Phaser.Math.Between(height - 180, height - 70);
        const c = new Collectible(this, x, y, this.collectibleIndex++);
        this.collectiblesGroup.add(c);
        this.nextCollectibleX = x;
    }

    spawnBacteria() {
        const { width, height } = this.scale;
        const x = width + Phaser.Math.Between(50, 150);
        const y = Phaser.Math.Between(height - 250, height - 80);
        const b = new Bacteria(this, x, y, this.bacteriaIndex++);
        this.bacteriaGroup.add(b);
        this.nextBacteriaX = this.worldProgress + Phaser.Math.Between(300, 600);
    }

    scrollWorld() {
        if (this.levelComplete) return;

        // Increase speed gradually
        this.scrollSpeed = 2 + (this.worldProgress / this.levelLength) * 1.5;
        const dx = this.scrollSpeed;
        this.worldProgress += dx;

        // Move collectibles left
        this.collectiblesGroup.children.each((c) => {
            if (c.active) {
                c.x -= dx;
                if (c.x < -60) c.destroy();
            }
        });

        // Move floating platforms left
        this.floatingPlatforms.children.each((p) => {
            if (p.active) {
                p.x -= dx;
                p.body.updateFromGameObject();
                if (p.x < -200) p.destroy();
            }
        });

        // Move bacteria left (they also have their own velocity)
        this.bacteriaGroup.children.each((b) => {
            if (b.active) {
                b.x -= dx * 0.3; // partial scroll, they also move on their own
                if (b.x < -100) b.destroy();
            }
        });

        // Move clouds
        this.clouds.forEach((c) => {
            c.img.x -= c.speed;
            if (c.img.x < -60) {
                c.img.x = this.scale.width + 60;
                c.img.y = Phaser.Math.Between(30, 140);
            }
        });

        // Wave decoration
        if (this.waveEmojis) {
            this.waveEmojis.forEach((w, i) => {
                w.x -= 0.5;
                if (w.x < -50) w.x = this.scale.width + 50;
                w.y = this.scale.height - 12 + Math.sin(this.time.now / 500 + i) * 3;
            });
        }

        // Spawn new content as we advance
        if (this.worldProgress > this.nextCollectibleX - 300) {
            this.spawnCollectible();
        }
        if (this.worldProgress > this.nextPlatformX - 200) {
            this.spawnFloatingPlatform();
        }
        if (this.worldProgress > this.nextBacteriaX) {
            this.spawnBacteria();
        }

        // Update HUD progress
        this.events.emit("update-progress", this.worldProgress);

        // Check win condition
        if (this.worldProgress >= this.levelLength) {
            this.reachFinish();
        }
    }

    reachFinish() {
        if (this.levelComplete) return;
        this.levelComplete = true;

        // Show 2030 sign
        const { width, height } = this.scale;
        const sign = this.add.text(width + 100, height / 2 - 60, "🏁 2030 🏁", {
            fontSize: "52px",
            fontFamily: "Arial",
            color: "#FFD700",
            stroke: "#000",
            strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: sign,
            x: width / 2,
            duration: 1500,
            ease: "Power2",
            onComplete: () => {
                // Show celebration
                this.showCelebration();
                this.time.delayedCall(2500, () => {
                    this.scene.stop("HudScene");
                    this.scene.start("WinScene", {
                        points: this.points,
                        items: this.itemsCollected
                    });
                });
            }
        });
    }

    showCelebration() {
        const emojis = ["🎉", "🎊", "💧", "⭐", "✨", "🌍", "🌊"];
        for (let i = 0; i < 20; i++) {
            const emoji = emojis[Phaser.Math.Between(0, emojis.length - 1)];
            const txt = this.add.text(
                Phaser.Math.Between(50, this.scale.width - 50),
                -30,
                emoji,
                { fontSize: `${Phaser.Math.Between(24, 48)}px` }
            );
            this.tweens.add({
                targets: txt,
                y: this.scale.height + 30,
                x: txt.x + Phaser.Math.Between(-80, 80),
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(1500, 3000),
                delay: i * 100,
                onComplete: () => txt.destroy()
            });
        }
    }

    gameOver() {
        this.scene.stop("HudScene");
        this.scene.start("GameOverScene", {
            points: this.points,
            items: this.itemsCollected,
            progress: Math.floor((this.worldProgress / this.levelLength) * 100)
        });
    }

    update(time) {
        if (this.levelComplete) return;

        // Auto-scroll the world
        this.scrollWorld();

        // Player update
        this.player.update();

        // Update bacteria
        this.bacteriaGroup.children.each((b) => {
            if (b.active && b.update) b.update(time);
        });

        // Input
        if (this.cursors.up.isDown || this.spaceKey.isDown) {
            this.player.jump();
        }
        if (this.cursors.left.isDown) {
            this.player.x -= 3;
        }
        if (this.cursors.right.isDown) {
            this.player.x += 3;
        }
        // Shoot with Z key only
        if (Phaser.Input.Keyboard.JustDown(this.zKey)) {
            this.player.shoot();
        }

        // Keep player on screen
        if (this.player.x < 30) this.player.x = 30;
        if (this.player.x > this.scale.width - 30) this.player.x = this.scale.width - 30;

        // Player fell off screen
        if (this.player.y > this.scale.height + 50) {
            this.player.health = 0;
            this.gameOver();
        }
    }
}