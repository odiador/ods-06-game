import { Scene } from "phaser";

export class WinScene extends Scene {
    endPoints = 0;
    endItems = 0;

    constructor() {
        super("WinScene");
    }

    init(data) {
        this.cameras.main.fadeIn(600, 0x26, 0xBD, 0xE2);
        this.endPoints = data.points || 0;
        this.endItems = data.items || 0;
    }

    create() {
        const { width, height } = this.scale;
        const ODS_CYAN = 0x26BDE2;

        // Bright cyan background
        const bg = this.add.graphics();
        bg.fillStyle(ODS_CYAN, 1);
        bg.fillRect(0, 0, width, height);

        // Celebration emojis falling gently
        const emojis = ["🎉", "💧", "⭐", "✨", "🌍", "🌊", "♻️"];
        for (let i = 0; i < 18; i++) {
            const emoji = emojis[i % emojis.length];
            const txt = this.add.text(
                Phaser.Math.Between(20, width - 20), -30, emoji,
                { fontSize: `${Phaser.Math.Between(18, 36)}px` }
            ).setAlpha(0.2);
            this.tweens.add({
                targets: txt,
                y: height + 40,
                x: txt.x + Phaser.Math.Between(-40, 40),
                duration: Phaser.Math.Between(4000, 7000),
                delay: i * 250,
                repeat: -1
            });
        }

        // Big "2030" background number
        this.add.text(width / 2, height / 2, "2030", {
            fontSize: "160px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.1);

        // ── Panel ──
        const panelGfx = this.add.graphics();
        panelGfx.fillStyle(0x1A8AAB, 0.35);
        panelGfx.fillRoundedRect(width / 2 - 220, 50, 440, 350, 8);

        // Title
        this.add.text(width / 2, 85, "¡LLEGASTE AL 2030!", {
            fontSize: "32px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 120, "AGUA LIMPIA Y SANEAMIENTO PARA TODOS", {
            fontSize: "11px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.6);

        // Thin separator
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(1, 0xffffff, 0.3);
        lineGfx.lineBetween(width / 2 - 140, 142, width / 2 + 140, 142);

        // Stats
        this.add.text(width / 2, 175, [
            `⭐  Puntos: ${this.endPoints}`,
            `💧  Items recolectados: ${this.endItems}`,
        ].join("\n"), {
            fontSize: "18px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 10,
        }).setOrigin(0.5);

        // ODS-6 Message
        this.add.text(width / 2, 260, [
            "El ODS 6 busca garantizar agua limpia",
            "y saneamiento para todos antes del 2030.",
            "",
            "¡Cada gota cuenta!",
            "Cuidemos el agua, protejamos la vida.",
        ].join("\n"), {
            fontSize: "13px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 4
        }).setOrigin(0.5).setAlpha(0.75);

        // ── Play again button (white, minimalist) ──
        const btnY = 360;
        const btnW = 230;
        const btnH = 44;

        const btnGfx = this.add.graphics();
        btnGfx.fillStyle(0xffffff, 1);
        btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

        const playAgainText = this.add.text(width / 2, btnY, "JUGAR DE NUEVO", {
            fontSize: "18px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#26BDE2",
        }).setOrigin(0.5);

        const btnZone = this.add.rectangle(width / 2, btnY, btnW, btnH, 0xffffff, 0.001)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btnZone.on("pointerover", () => {
            btnGfx.clear();
            btnGfx.fillStyle(0xe0f7fa, 1);
            btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        });
        btnZone.on("pointerout", () => {
            btnGfx.clear();
            btnGfx.fillStyle(0xffffff, 1);
            btnGfx.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        });

        this.tweens.add({
            targets: playAgainText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.time.delayedCall(800, () => {
            btnZone.on("pointerdown", () => {
                this.scene.start("MenuScene");
            });
            this.input.keyboard.once("keydown", () => {
                this.scene.start("MenuScene");
            });
        });

        // Bottom credit
        this.add.text(width / 2, height - 20, "ODS 6 · Agenda 2030 · Naciones Unidas", {
            fontSize: "9px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.3);
    }
}
