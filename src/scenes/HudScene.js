import { Scene } from "phaser";

export class HudScene extends Scene {
    pointsText = null;
    livesText = null;
    progressBar = null;
    progressFill = null;
    progressText = null;
    itemsText = null;

    // Touch controls state (read by MainScene via window.__touchControls)
    get touchLeft()  { return !!(window.__touchControls && window.__touchControls.left); }
    get touchRight() { return !!(window.__touchControls && window.__touchControls.right); }

    constructor() {
        super("HudScene");
    }

    create() {
        const { width } = this.scale;

        // Semi-transparent top bar with ODS-6 dark cyan
        this.add.rectangle(0, 0, width, 120, 0x1A8AAB, 0.85).setOrigin(0, 0);
        // Thin bottom accent line
        this.add.rectangle(0, 120, width, 2, 0x26BDE2, 0.6).setOrigin(0, 0);

        // Points
        this.pointsText = this.add.text(12, 8, "⭐ 0", {
            fontSize: "20px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        });

        // Items collected
        this.itemsText = this.add.text(12, 35, "💧 0 recolectados", {
            fontSize: "12px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#B2EBF2",
        });

        // Lives
        this.livesText = this.add.text(12, 60, "❤️ ❤️ ❤️", {
            fontSize: "24px",
            fontFamily: "Arial, sans-serif",
        });

        // Progress to 2030 label
        this.add.text(width / 2, 8, "PROGRESO AL 2030", {
            fontSize: "11px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5, 0).setAlpha(0.8);

        // Progress bar
        const barWidth = 260;
        const barX = width / 2 - barWidth / 2;
        const barY = 30;
        
        this.add.rectangle(barX, barY, barWidth, 24, 0x0E5E74, 0.9).setOrigin(0, 0);
        this.progressFill = this.add.rectangle(barX + 2, barY + 2, 0, 20, 0x26BDE2, 1).setOrigin(0, 0);
        
        this.progressText = this.add.text(barX + barWidth / 2, barY + 12, "0%", {
            fontSize: "14px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);

        // Border
        const borderGfx = this.add.graphics();
        borderGfx.lineStyle(2, 0xffffff, 0.4);
        borderGfx.strokeRect(barX, barY, barWidth, 24);

        // Year indicator
        this.yearText = this.add.text(width / 2, 75, "2026", {
            fontSize: "28px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.9);

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

        // Update lives
        const lives = mainScene.lives;
        let hearts = "";
        for (let i = 0; i < 3; i++) {
            hearts += i < lives ? "❤️ " : "  ";
        }
        this.livesText.setText(hearts.trim());
    }

    updateProgress(progress) {
        const barWidth = 256;
        const pct = Math.min(progress / 100, 1);
        this.progressFill.width = barWidth * pct;

        this.progressText.setText(`${Math.round(progress)}%`);

        // Calculate year (2026 → 2030)
        const year = Math.floor(2026 + pct * 4);
        this.yearText.setText(`${year}`);
        
        // Add glow effect when close to winning (75%+)
        if (progress >= 75) {
            this.yearText.setColor("#FFD700");
            if (!this.yearGlow) {
                this.yearGlow = true;
                this.tweens.add({
                    targets: this.yearText,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        }
    }
}