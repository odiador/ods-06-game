import { Scene } from "phaser";

export class GameOverScene extends Scene {
    endPoints = 0;
    endItems = 0;
    endProgress = 0;

    constructor() {
        super("GameOverScene");
    }

    init(data) {
        this.cameras.main.fadeIn(600, 0, 0, 0);
        this.endPoints = data.points || 0;
        this.endItems = data.items || 0;
        this.endProgress = data.progress || 0;
    }

    create() {
        const { width, height } = this.scale;

        // Dark desaturated blue background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0D3B4F, 0x0D3B4F, 0x0A2A38, 0x0A2A38, 1);
        bg.fillRect(0, 0, width, height);

        // Falling water drops (slow, sad)
        for (let i = 0; i < 8; i++) {
            const drop = this.add.text(
                Phaser.Math.Between(30, width - 30), -20, "💧",
                { fontSize: "20px" }
            ).setAlpha(0.2);
            this.tweens.add({
                targets: drop,
                y: height + 30,
                duration: Phaser.Math.Between(3000, 5000),
                delay: i * 400,
                repeat: -1,
            });
        }

        // ── Content panel ──
        const panelGfx = this.add.graphics();
        panelGfx.fillStyle(0x1A8AAB, 0.3);
        panelGfx.fillRoundedRect(width / 2 - 200, height / 2 - 140, 400, 280, 8);

        // Title
        this.add.text(width / 2, height / 2 - 110, "GAME OVER", {
            fontSize: "40px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.9);

        // Thin separator
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(1, 0xffffff, 0.3);
        lineGfx.lineBetween(width / 2 - 120, height / 2 - 78, width / 2 + 120, height / 2 - 78);

        // Stats
        this.add.text(width / 2, height / 2 - 40, [
            `⭐  Puntos: ${this.endPoints}`,
            `💧  Items recolectados: ${this.endItems}`,
            `📊  Progreso al 2030: ${this.endProgress}%`,
        ].join("\n"), {
            fontSize: "16px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#B2EBF2",
            align: "center",
            lineSpacing: 10,
        }).setOrigin(0.5);

        // ODS message
        this.add.text(width / 2, height / 2 + 40, "Sin agua limpia, no hay futuro.\n¡Inténtalo de nuevo!", {
            fontSize: "13px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 6
        }).setOrigin(0.5).setAlpha(0.6);

        // ── Restart button (white on dark, minimalist) ──
        const btnY = height / 2 + 100;
        const btnW = 220;
        const btnH = 44;

        const btnGfx = this.add.graphics();
        btnGfx.fillStyle(0x26BDE2, 1);
        btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

        const restartText = this.add.text(width / 2, btnY, "REINTENTAR", {
            fontSize: "18px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);

        const btnZone = this.add.rectangle(width / 2, btnY, btnW, btnH, 0xffffff, 0.001)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: restartText,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.time.delayedCall(600, () => {
            btnZone.on("pointerdown", () => {
                this.scene.start("MainScene");
            });
            this.input.keyboard.once("keydown", () => {
                this.scene.start("MainScene");
            });
        });
    }
}