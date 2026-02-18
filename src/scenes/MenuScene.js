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
                { fontSize: `${Phaser.Math.Between(40, 80)}px` }
            ).setAlpha(Phaser.Math.FloatBetween(0.06, 0.15)).setOrigin(0.5);
        }

        // "AGUA LIMPIA Y SANEAMIENTO" — title (bold, condensed, uppercase)
        const titleSize = Math.min(52, width * 0.096);
        this.add.text(width / 2, 100, "AGUA LIMPIA\nY SANEAMIENTO", {
            fontSize: `${titleSize}px`,
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
            align: "center",
            lineSpacing: 4
        }).setOrigin(0.5, 0);

        // Thin white separator line
        const lineWidth = Math.min(400, width - 40);
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(2, 0xffffff, 0.5);
        lineGfx.lineBetween(width / 2 - lineWidth / 2, 215, width / 2 + lineWidth / 2, 215);

        // ODS 6 subtitle
        const subtitleSize = Math.min(14, width * 0.026);
        this.add.text(width / 2, 235, "ODS 6 · OBJETIVO DE DESARROLLO SOSTENIBLE", {
            fontSize: `${subtitleSize}px`,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0.7);

        // ── Game description (clean, light) ──
        const descSize = Math.min(20, width * 0.037);
        this.add.text(width / 2, 300, "Atrapa las gotas de agua limpia 💧\ny evita la contaminación.\n¡3 vidas para llegar al 2030!", {
            fontSize: `${descSize}px`,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 8
        }).setOrigin(0.5).setAlpha(0.85);

        // ── Controls info ──
        const controlSize = Math.min(16, width * 0.03);
        this.add.text(width / 2, 400, "⬅ ➡  Moverse\n¡Recolecta cosas buenas y evita las malas!", {
            fontSize: `${controlSize}px`,
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
            align: "center",
            lineSpacing: 4
        }).setOrigin(0.5).setAlpha(0.6);

        // ── START BUTTON (white on dark cyan, minimalist) ──
        const btnY = 460;
        const btnW = Math.min(300, width - 60);
        const btnH = 60;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xffffff, 1);
        btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);

        const btnTextSize = Math.min(26, width * 0.048);
        const startText = this.add.text(width / 2, btnY, "COMENZAR", {
            fontSize: `${btnTextSize}px`,
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#26BDE2",
            align: "center"
        }).setOrigin(0.5);

        // Interactive hit zone
        const btnZone = this.add.rectangle(width / 2, btnY, btnW, btnH, 0xffffff, 0.001)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Hover effects
        btnZone.on("pointerover", () => {
            btnBg.clear();
            btnBg.fillStyle(0xe0f7fa, 1);
            btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
        });
        btnZone.on("pointerout", () => {
            btnBg.clear();
            btnBg.fillStyle(0xffffff, 1);
            btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
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
        this.add.text(width / 2, height - 80, "META: LLEGAR AL 2030", {
            fontSize: "24px",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.6);

        this.add.text(width / 2, height - 55, "🏁  Cada gota cuenta  💧", {
            fontSize: "16px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.5);

        // ── Small left-side bottom credit ──
        this.add.text(15, height - 20, "ODS · Agenda 2030", {
            fontSize: "12px",
            fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setAlpha(0.35);

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