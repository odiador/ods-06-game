import { Scene } from "phaser";

export class HudScene extends Scene {
    pointsText = null;
    healthText = null;
    progressBar = null;
    progressFill = null;
    progressText = null;
    itemsText = null;
    maxDistance = 12000;

    // Touch controls state (read by MainScene via window.__touchControls)
    get touchLeft()  { return !!(window.__touchControls && window.__touchControls.left); }
    get touchRight() { return !!(window.__touchControls && window.__touchControls.right); }
    get touchJump()  { return !!(window.__touchControls && window.__touchControls.jump); }

    constructor() {
        super("HudScene");
    }

    init(data) {
        this.maxDistance = data.maxDistance || 12000;
    }

    create() {
        const { width } = this.scale;

        // Semi-transparent top bar with ODS-6 dark cyan
        this.add.rectangle(0, 0, width, 52, 0x1A8AAB, 0.85).setOrigin(0, 0);
        // Thin bottom accent line
        this.add.rectangle(0, 52, width, 2, 0x26BDE2, 0.6).setOrigin(0, 0);

        // Points
        this.pointsText = this.add.text(12, 8, "⭐ 0", {
            fontSize: "18px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        });

        // Items collected
        this.itemsText = this.add.text(12, 30, "💧 0 recolectados", {
            fontSize: "11px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#B2EBF2",
        });

        // Health
        this.healthText = this.add.text(width / 2 - 40, 10, "❤️❤️❤️", {
            fontSize: "20px",
            fontFamily: "Arial, sans-serif",
        });

        // Progress bar background
        const barWidth = 200;
        const barX = width - barWidth - 15;
        this.add.rectangle(barX, 14, barWidth, 20, 0x0E5E74, 0.9).setOrigin(0, 0);
        this.progressFill = this.add.rectangle(barX + 2, 16, 0, 16, 0x26BDE2, 1).setOrigin(0, 0);
        this.progressText = this.add.text(barX + barWidth / 2, 24, "→ 2030", {
            fontSize: "11px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);

        // Border
        const borderGfx = this.add.graphics();
        borderGfx.lineStyle(1, 0xffffff, 0.3);
        borderGfx.strokeRect(barX, 14, barWidth, 20);

        // Listen for updates from MainScene
        const mainScene = this.scene.get("MainScene");
        mainScene.events.on("update-hud", () => {
            this.updateHud(mainScene);
        });
        mainScene.events.on("update-progress", (progress) => {
            this.updateProgress(progress);
        });
    }

    updateHud(mainScene) {
        this.pointsText.setText(`⭐ ${mainScene.points}`);
        this.itemsText.setText(`💧 ${mainScene.itemsCollected} recolectados`);

        // Update health
        const hp = mainScene.player.health;
        const maxHp = mainScene.player.maxHealth;
        let hearts = "";
        for (let i = 0; i < maxHp; i++) {
            hearts += i < hp ? "❤️" : "🖤";
        }
        this.healthText.setText(hearts);
    }

    updateProgress(progress) {
        const barWidth = 196;
        const pct = Math.min(progress / this.maxDistance, 1);
        this.progressFill.width = barWidth * pct;

        const year = Math.floor(2026 + pct * 4); // 2026 → 2030
        this.progressText.setText(`${Math.floor(pct * 100)}% → ${year}`);
    }
}