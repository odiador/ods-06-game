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

        // Falling contaminant drops (slow, sad)
        const contaminants = ["💀", "☠️", "🦠", "💩"];
        for (let i = 0; i < 12; i++) {
            const drop = this.add.text(
                Phaser.Math.Between(30, width - 30), -20, 
                Phaser.Utils.Array.GetRandom(contaminants),
                { fontSize: "18px" }
            ).setAlpha(0.15);
            this.tweens.add({
                targets: drop,
                y: height + 30,
                duration: Phaser.Math.Between(2500, 4500),
                delay: i * 350,
                repeat: -1,
            });
        }

        // ── Content panel ──
        const panelW = Math.min(400, width - 40);
        const panelGfx = this.add.graphics();
        panelGfx.fillStyle(0x1A8AAB, 0.3);
        panelGfx.fillRoundedRect(width / 2 - panelW / 2, height / 2 - 200, panelW, 400, 8);

        // Skull icon
        this.add.text(width / 2, height / 2 - 160, "💀", {
            fontSize: "64px",
        }).setOrigin(0.5);

        // Title
        this.add.text(width / 2, height / 2 - 90, "LA CONTAMINACIÓN\nGANÓ", {
            fontSize: "32px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ff4444",
            align: "center",
            lineSpacing: 2
        }).setOrigin(0.5).setAlpha(0.95);

        // Thin separator
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(1, 0xffffff, 0.3);
        const lineW = Math.min(240, panelW - 40);
        lineGfx.lineBetween(width / 2 - lineW / 2, height / 2 - 30, width / 2 + lineW / 2, height / 2 - 30);

        // Death message based on progress
        let deathMessage = "";
        if (this.endProgress < 20) {
            deathMessage = "La contaminación fue demasiado fuerte.\nEl agua no logró limpiarse.";
        } else if (this.endProgress < 40) {
            deathMessage = "Estabas progresando bien,\npero la contaminación te superó.";
        } else if (this.endProgress < 60) {
            deathMessage = "¡Tan cerca del 2030!\nLa contaminación ganó esta vez.";
        } else {
            deathMessage = "¡Casi llegas al 2030!\nUn poco más de cuidado y lo lograrás.";
        }

        this.add.text(width / 2, height / 2 - 8, deathMessage, {
            fontSize: "14px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 6
        }).setOrigin(0.5).setAlpha(0.85);

        // Stats
        this.add.text(width / 2, height / 2 + 50, [
            `⭐ ${this.endPoints} puntos`,
            `💧 ${this.endItems} gotas recolectadas`,
            `📊 ${this.endProgress}% hacia el 2030`,
        ].join("\n"), {
            fontSize: "15px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#B2EBF2",
            align: "center",
            lineSpacing: 8,
        }).setOrigin(0.5);

        // Environmental message
        this.add.text(width / 2, height / 2 + 130, "Sin agua limpia, no hay futuro.", {
            fontSize: "12px",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontStyle: "italic",
            color: "#ffffff",
            align: "center",
        }).setOrigin(0.5).setAlpha(0.5);

        // ── Restart button (white on dark, minimalist) ──
        const btnY = height / 2 + 175;
        const btnW = Math.min(220, width - 60);
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