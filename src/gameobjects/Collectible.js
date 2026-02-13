import { Physics } from "phaser";

/**
 * Collectible items representing ODS-6 themes:
 * water bottles, drops, fish, trees, globes, etc.
 */

const COLLECTIBLE_TYPES = [
    { key: "water-bottle", points: 15, label: "Agua limpia" },
    { key: "water-drop", points: 10, label: "Gota de agua" },
    { key: "glass-water", points: 10, label: "Agua potable" },
    { key: "fish", points: 20, label: "Vida marina" },
    { key: "tree", points: 15, label: "Ecosistema" },
    { key: "globe", points: 25, label: "Planeta" },
    { key: "recycle", points: 20, label: "Reciclaje" },
    { key: "shower", points: 10, label: "Saneamiento" },
    { key: "herb", points: 10, label: "Naturaleza" },
    { key: "whale", points: 30, label: "Biodiversidad" },
];

export class Collectible extends Physics.Arcade.Sprite {
    points = 10;
    label = "";
    collected = false;

    constructor(scene, x, y, typeIndex) {
        const type = COLLECTIBLE_TYPES[typeIndex % COLLECTIBLE_TYPES.length];
        super(scene, x, y, type.key);
        this.points = type.points;
        this.label = type.label;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.setImmovable(true);
        this.body.setSize(28, 28);

        // Floating animation
        scene.tweens.add({
            targets: this,
            y: y - 8,
            duration: 800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    collect(scene) {
        if (this.collected) return 0;
        this.collected = true;

        // Show points label
        const txt = scene.add.text(this.x, this.y - 20, `+${this.points} ${this.label}`, {
            fontSize: "14px",
            fontFamily: "Arial",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5);

        scene.tweens.add({
            targets: txt,
            y: txt.y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => txt.destroy()
        });

        // Sparkle effect
        for (let i = 0; i < 3; i++) {
            const sparkle = scene.add.image(
                this.x + Phaser.Math.Between(-15, 15),
                this.y + Phaser.Math.Between(-15, 15),
                "sparkle"
            );
            scene.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 2,
                duration: 400,
                delay: i * 80,
                onComplete: () => sparkle.destroy()
            });
        }

        this.destroy();
        return this.points;
    }
}

export { COLLECTIBLE_TYPES };
