// Preloader: genera texturas desde emojis con canvas
export class Preloader extends Phaser.Scene {
    constructor() {
        super({ key: "Preloader" });
    }

    preload() {
        // Show loading text
        const loadText = this.add.text(this.scale.width / 2, this.scale.height / 2, "💧 Cargando...", {
            fontSize: "32px", fontFamily: "Arial"
        }).setOrigin(0.5);

        this.load.on("progress", (progress) => {
            loadText.setText(`💧 Cargando... ${Math.round(progress * 100)}%`);
        });
    }

    /**
     * Creates a canvas texture from an emoji string.
     */
    makeEmojiTexture(key, emoji, size = 48) {
        const canvas = this.textures.createCanvas(key, size, size);
        const ctx = canvas.getContext();
        ctx.font = `${size * 0.85}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, size / 2, size / 2 + 2);
        canvas.refresh();
    }

    create() {
        // ---- Player ----
        this.makeEmojiTexture("player", "🚶", 48);
        this.makeEmojiTexture("player-jump", "🏃", 48);

        // ---- Collectibles (ODS-6 related) ----
        this.makeEmojiTexture("water-bottle", "🧴", 40);
        this.makeEmojiTexture("water-drop", "💧", 36);
        this.makeEmojiTexture("glass-water", "🥛", 40);
        this.makeEmojiTexture("fish", "🐟", 40);
        this.makeEmojiTexture("tree", "🌳", 44);
        this.makeEmojiTexture("globe", "🌍", 40);
        this.makeEmojiTexture("recycle", "♻️", 40);
        this.makeEmojiTexture("shower", "🚿", 40);
        this.makeEmojiTexture("herb", "🌿", 36);
        this.makeEmojiTexture("whale", "🐋", 44);

        // ---- Enemies (bacteria / contaminants) ----
        this.makeEmojiTexture("bacteria1", "🦠", 44);
        this.makeEmojiTexture("bacteria2", "🧫", 44);
        this.makeEmojiTexture("skull", "☠️", 44);
        this.makeEmojiTexture("poop", "💩", 40);
        this.makeEmojiTexture("factory", "🏭", 52);

        // ---- Environment ----
        this.makeEmojiTexture("wave", "🌊", 44);
        this.makeEmojiTexture("cloud", "☁️", 64);
        this.makeEmojiTexture("sun", "☀️", 64);
        this.makeEmojiTexture("mountain", "⛰️", 56);
        this.makeEmojiTexture("house", "🏠", 48);
        this.makeEmojiTexture("heart", "❤️", 36);
        this.makeEmojiTexture("star", "⭐", 36);
        this.makeEmojiTexture("sparkle", "✨", 32);
        this.makeEmojiTexture("shield", "🛡️", 40);

        // ---- Bullet (water projectile) ----
        this.makeEmojiTexture("water-bullet", "💦", 28);

        // ---- Platforms ----
        // We'll draw simple platform rectangles with code

        this.scene.start("MenuScene");
    }
}