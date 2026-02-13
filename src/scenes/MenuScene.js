import { Scene } from "phaser";

export class MenuScene extends Scene {
    constructor() {
        super("MenuScene");
    }

    init() {
        this.cameras.main.fadeIn(600, 0x26, 0xBD, 0xE2);
    }

    create() {
        const { width, height } = this.scale;
        const ODS_CYAN = 0x26BDE2;
        const ODS_DARK = 0x1A8AAB;

        // ── Solid cyan background (UN SDG 6 style) ──
        const bg = this.add.graphics();
        bg.fillStyle(ODS_CYAN, 1);
        bg.fillRect(0, 0, width, height);

        // ── Subtle water drop icons in background (low opacity) ──
        for (let i = 0; i < 12; i++) {
            const drop = this.add.text(
                Phaser.Math.Between(40, width - 40),
                Phaser.Math.Between(20, height - 20),
                "💧",
                { fontSize: `${Phaser.Math.Between(28, 64)}px` }
            ).setAlpha(Phaser.Math.FloatBetween(0.06, 0.15)).setOrigin(0.5);
        }

        // ── Left side: big "6" number (anchor visual like the UN poster) ──
        this.add.text(80, height / 2 - 20, "6", {
            fontSize: "180px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.2);

        // ── Main content area ──
        const contentX = width / 2 + 40;

        // "AGUA LIMPIA Y SANEAMIENTO" — title (bold, condensed, uppercase)
        this.add.text(contentX, 70, "AGUA LIMPIA\nY SANEAMIENTO", {
            fontSize: "34px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
            align: "left",
            lineSpacing: 2
        }).setOrigin(0.5, 0);

        // Thin white separator line
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(2, 0xffffff, 0.5);
        lineGfx.lineBetween(contentX - 150, 155, contentX + 150, 155);

        // ODS 6 subtitle
        this.add.text(contentX, 172, "ODS 6 · OBJETIVO DE DESARROLLO SOSTENIBLE", {
            fontSize: "10px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0.7);

        // ── Game description (clean, light) ──
        this.add.text(contentX, 220, "Recolecta agua limpia y recursos para\ngarantizar el saneamiento antes del 2030.", {
            fontSize: "14px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 6
        }).setOrigin(0.5).setAlpha(0.85);

        // ── Controls info ──
        this.add.text(contentX, 285, "⬆  Saltar     ⬅ ➡  Moverse     Z  Disparar 💦", {
            fontSize: "12px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center"
        }).setOrigin(0.5).setAlpha(0.6);

        // ── START BUTTON (white on dark cyan, minimalist) ──
        const btnY = 350;
        const btnW = 240;
        const btnH = 48;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xffffff, 1);
        btnBg.fillRoundedRect(contentX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

        const startText = this.add.text(contentX, btnY, "COMENZAR", {
            fontSize: "20px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#26BDE2",
            align: "center"
        }).setOrigin(0.5);

        // Interactive hit zone
        const btnZone = this.add.rectangle(contentX, btnY, btnW, btnH, 0xffffff, 0.001)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Hover effects
        btnZone.on("pointerover", () => {
            btnBg.clear();
            btnBg.fillStyle(0xe0f7fa, 1);
            btnBg.fillRoundedRect(contentX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        });
        btnZone.on("pointerout", () => {
            btnBg.clear();
            btnBg.fillStyle(0xffffff, 1);
            btnBg.fillRoundedRect(contentX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        });

        // Gentle pulse on the button
        this.tweens.add({
            targets: [startText],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        // ── Bottom: "Meta 2030" ──
        this.add.text(contentX, height - 55, "META: LLEGAR AL 2030", {
            fontSize: "13px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.55);

        this.add.text(contentX, height - 35, "🏁  Cada gota cuenta  💧", {
            fontSize: "12px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.4);

        // ── Small left-side bottom credit ──
        this.add.text(15, height - 18, "ODS · Agenda 2030", {
            fontSize: "9px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setAlpha(0.3);

        // ── START GAME ──
        const startGame = () => {
            this.cameras.main.fadeOut(400, 0x26, 0xBD, 0xE2);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("MainScene");
            });
        };

        btnZone.on("pointerdown", startGame);
        this.input.keyboard.once("keydown", startGame);
    }
}