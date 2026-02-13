import { Scene } from "phaser";
import { EmojiPlayer } from "../gameobjects/EmojiPlayer";
import { Collectible } from "../gameobjects/Collectible";
import { Bacteria } from "../gameobjects/Bacteria";

export class MainScene extends Scene {
    // world size
    static WORLD_W = 3200;
    static GROUND_Y = 480;
    static TILE = 48;

    player = null;
    cursors = null;
    platforms = null;
    collectiblesGroup = null;
    bacteriaGroup = null;
    points = 0;
    itemsCollected = 0;

    constructor() { super("MainScene"); }

    init() {
        this.points = 0;
        this.itemsCollected = 0;
    }

    create() {
        const W = MainScene.WORLD_W;
        const H = 540;
        const GY = MainScene.GROUND_Y;
        const T = MainScene.TILE;

        // ── Physics world bounds ──
        this.physics.world.setBounds(0, 0, W, H);

        // ── Sky ──
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x26BDE2, 0x26BDE2, 1);
        sky.fillRect(0, 0, W, H);

        // ── Background decoration (parallax-ish) ──
        for (let i = 0; i < 12; i++) {
            this.add.image(300 + i * 550, 100, "cloud").setAlpha(0.5).setScrollFactor(0.3);
        }
        this.add.image(120, 60, "sun").setScale(1.5).setAlpha(0.85).setScrollFactor(0.2);
        for (let i = 0; i < 8; i++) {
            this.add.image(400 + i * 800, GY - 30, "mountain").setAlpha(0.25).setScale(1.6).setScrollFactor(0.4);
        }

        // ── Platforms (static group) ──
        this.platforms = this.physics.add.staticGroup();

        // -- Ground: series of platform tiles --
        this.buildGround(GY, W, T);

        // -- Floating platforms --
        this.buildPlatforms(GY, T);

        // ── Collectibles ──
        this.collectiblesGroup = this.add.group();
        this.buildCollectibles(GY, T);

        // ── Enemies ──
        this.bacteriaGroup = this.add.group();
        this.buildEnemies(GY, T);

        // ── 2030 finish flag ──
        this.add.text(W - 200, GY - 100, "🏁", { fontSize: "64px" }).setOrigin(0.5);
        this.add.text(W - 200, GY - 160, "2030", {
            fontSize: "42px", fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
            stroke: "#1A8AAB", strokeThickness: 5
        }).setOrigin(0.5);
        this.finishZone = this.add.rectangle(W - 200, GY - 60, 60, 120, 0xffffff, 0).setOrigin(0.5);
        this.physics.add.existing(this.finishZone, true);

        // ── Player ──
        this.player = new EmojiPlayer(this, 80, GY - 60);

        // ── Collisions ──
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.bacteriaGroup, this.platforms, (bact) => {
            bact.turnIfBlocked();
        });

        // stomp or hurt
        this.physics.add.overlap(this.player, this.bacteriaGroup, (player, bact) => {
            if (!bact.alive || player.isInvincible) return;
            // Mario stomp: player falling + above enemy
            if (player.body.velocity.y > 0 && player.body.bottom <= bact.body.top + 20) {
                bact.die(this);
                player.bounce();
                this.points += 20;
                this.events.emit("update-hud");
            } else {
                player.takeDamage();
                this.events.emit("update-hud");
                if (player.health <= 0) this.gameOver();
            }
        });

        // collect items
        this.physics.add.overlap(this.player, this.collectiblesGroup, (player, col) => {
            if (col.collected) return;
            this.points += col.collect(this);
            this.itemsCollected++;
            this.events.emit("update-hud");
        });

        // finish line
        this.physics.add.overlap(this.player, this.finishZone, () => this.win());

        // ── Camera ──
        this.cameras.main.setBounds(0, 0, W, H);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.fadeIn(400, 0x26, 0xBD, 0xE2);

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();

        // ── HUD ──
        this.scene.launch("HudScene", {
            maxDistance: W, health: this.player.health
        });
    }

    /* ─────────── Level Builders ─────────── */

    /** Build ground with gaps */
    buildGround(GY, W, T) {
        // Ground segments: [startX, endX]
        const segments = [
            [0, 900], [980, 1800], [1900, 2600],
            [2700, W]
        ];
        for (const [sx, ex] of segments) {
            this.makePlatform(sx, GY, ex - sx, T);
            // green grass line
            const grass = this.add.graphics();
            grass.fillStyle(0x228B22, 1);
            grass.fillRect(sx, GY, ex - sx, 6);
        }
    }

    /** Build floating platforms */
    buildPlatforms(GY, T) {
        const plats = [
            [350, GY - 90, 120], [550, GY - 160, 100], [750, GY - 100, 80],
            [1050, GY - 110, 140], [1250, GY - 180, 100], [1500, GY - 120, 90],
            [1950, GY - 100, 120], [2150, GY - 170, 100], [2400, GY - 130, 110],
            [2800, GY - 90, 130], [3050, GY - 160, 90],
        ];
        for (const [x, y, w] of plats) {
            this.makePlatform(x, y, w, 14);
        }
    }

    /** Helper: creates a visual + physics platform */
    makePlatform(x, y, w, h) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x8B4513, 1);
        gfx.fillRect(x, y, w, h);
        if (h > 20) {
            gfx.fillStyle(0x228B22, 1);
            gfx.fillRect(x, y, w, 6);
        }
        const body = this.add.rectangle(x + w / 2, y + h / 2, w, h);
        body.setAlpha(0);
        this.platforms.add(body);
    }

    /** Place collectibles throughout the level */
    buildCollectibles(GY, T) {
        const spots = [
            [200, GY - 50], [400, GY - 140], [600, GY - 210],
            [900, GY - 50], [1100, GY - 160], [1300, GY - 230],
            [1550, GY - 170], [1700, GY - 50],
            [2000, GY - 150], [2200, GY - 220], [2500, GY - 180],
            [2850, GY - 140], [3050, GY - 210],
        ];
        spots.forEach((pos, i) => {
            const c = new Collectible(this, pos[0], pos[1], i);
            this.collectiblesGroup.add(c);
        });
    }

    /** Place enemies on ground and platforms */
    buildEnemies(GY) {
        const spots = [
            [600, GY - 40], [1150, GY - 40], [1400, GY - 40],
            [2100, GY - 40], [2500, GY - 40],
            [2900, GY - 40],
        ];
        spots.forEach((pos, i) => {
            const b = new Bacteria(this, pos[0], pos[1], i);
            this.bacteriaGroup.add(b);
        });
    }

    /* ─────────── End conditions ─────────── */

    win() {
        if (this._ended) return;
        this._ended = true;
        this.physics.pause();
        // celebration
        const emojis = ["🎉", "💧", "⭐", "✨", "🌍"];
        for (let i = 0; i < 12; i++) {
            const e = this.add.text(
                this.player.x + Phaser.Math.Between(-100, 100), this.player.y - 40,
                emojis[i % emojis.length], { fontSize: "28px" }
            );
            this.tweens.add({
                targets: e, y: e.y - 120, alpha: 0, duration: 1200, delay: i * 80,
                onComplete: () => e.destroy()
            });
        }
        this.time.delayedCall(1800, () => {
            this.scene.stop("HudScene");
            this.scene.start("WinScene", { points: this.points, items: this.itemsCollected });
        });
    }

    gameOver() {
        if (this._ended) return;
        this._ended = true;
        this.scene.stop("HudScene");
        this.scene.start("GameOverScene", {
            points: this.points, items: this.itemsCollected,
            progress: Math.floor((this.player.x / MainScene.WORLD_W) * 100)
        });
    }

    /* ─────────── Update ─────────── */

    update() {
        if (this._ended) return;
        const p = this.player;

        // Read touch controls from HudScene
        const hud = this.scene.get("HudScene");

        p.handleMovement(this.cursors, hud);

        if (this.cursors.up.isDown || (hud && hud.touchJump)) p.jump();

        // fell off the world
        if (p.y > 560) { p.health = 0; this.gameOver(); }

        // progress for HUD
        this.events.emit("update-progress", p.x);
    }
}