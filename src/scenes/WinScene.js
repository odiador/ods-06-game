import { Scene } from "phaser";

const TARGETS = [
    {
        id: "6.1", short: "Agua potable segura",
        title: "AGUA POTABLE SEGURA Y ASEQUIBLE",
        desc: "Para 2030, lograr el acceso universal y equitativo al agua potable segura y asequible para todos.",
        emoji: "🚰"
    },
    {
        id: "6.2", short: "Saneamiento e higiene",
        title: "PONER FIN A LA DEFECACIÓN AL AIRE LIBRE Y ACCESO A SANEAMIENTO E HIGIENE",
        desc: "Para 2030, lograr el acceso a servicios de saneamiento e higiene adecuados y equitativos para todos, poniendo fin a la defecación al aire libre, prestando especial atención a las mujeres, las niñas y las personas en situaciones de vulnerabilidad.",
        emoji: "🚿"
    },
    {
        id: "6.3", short: "Calidad del agua",
        title: "MEJORAR LA CALIDAD DEL AGUA Y EL TRATAMIENTO DE AGUAS RESIDUALES",
        desc: "Para 2030, mejorar la calidad del agua reduciendo la contaminación, eliminando el vertimiento y minimizando la emisión de productos químicos y materiales peligrosos, reduciendo a la mitad el porcentaje de aguas residuales sin tratar y aumentando el reciclado y la reutilización.",
        emoji: "♻️"
    },
    {
        id: "6.4", short: "Uso eficiente agua",
        title: "AUMENTAR EL USO EFICIENTE DEL AGUA Y ASEGURAR EL SUMINISTRO",
        desc: "Para 2030, aumentar considerablemente el uso eficiente de los recursos hídricos en todos los sectores y asegurar la sostenibilidad de la extracción y el abastecimiento de agua dulce para hacer frente a la escasez.",
        emoji: "💧"
    },
    {
        id: "6.5", short: "Gestión integrada hídrica",
        title: "IMPLEMENTAR LA GESTIÓN INTEGRADA DE RECURSOS HÍDRICOS",
        desc: "Para 2030, implementar la gestión integrada de los recursos hídricos a todos los niveles, incluso mediante la cooperación transfronteriza, según proceda.",
        emoji: "🌍"
    },
    {
        id: "6.6", short: "Proteger ecosistemas acuáticos",
        title: "PROTEGER Y RESTABLECER LOS ECOSISTEMAS RELACIONADOS CON EL AGUA",
        desc: "Para 2020, proteger y restablecer los ecosistemas relacionados con el agua, incluidos los bosques, las montañas, los humedales, los ríos, los acuíferos y los lagos.",
        emoji: "🌿"
    },
    {
        id: "6.a", short: "Cooperación internacional",
        title: "AMPLIAR EL APOYO A PAÍSES EN DESARROLLO EN AGUA Y SANEAMIENTO",
        desc: "Para 2030, ampliar la cooperación internacional y el apoyo a los países en desarrollo en actividades y programas relativos al agua y el saneamiento.",
        emoji: "🤝"
    },
    {
        id: "6.b", short: "Participación comunitaria",
        title: "APOYAR LA PARTICIPACIÓN LOCAL EN LA GESTIÓN DEL AGUA",
        desc: "Apoyar y fortalecer la participación de las comunidades locales en la mejora de la gestión del agua y el saneamiento.",
        emoji: "🏘️"
    },
];

export class WinScene extends Scene {
    endPoints = 0;
    endItems = 0;
    currentPage = 0; // 0 = summary, 1..8 = targets, 9 = play again

    constructor() { super("WinScene"); }

    init(data) {
        this.cameras.main.fadeIn(500, 0x26, 0xBD, 0xE2);
        this.endPoints = data.points || 0;
        this.endItems = data.items || 0;
        this.currentPage = 0;
    }

    create() {
        this.showSummaryPage();
    }

    /* ───── Page: Summary (stats + intro) ───── */
    showSummaryPage() {
        this.clearPage();
        const { width, height } = this.scale;

        this.drawBg(width, height);
        this.drawFallingEmojis(width, height);

        // Big "2030" watermark
        const watermarkSize = Math.min(220, width * 0.4);
        this.add.text(width / 2, height / 2 + 20, "2030", {
            fontSize: `${watermarkSize}px`, fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.08);

        // Panel
        this.drawPanel(width, 40, 550);

        // Title
        const titleSize = Math.min(42, width * 0.078);
        this.add.text(width / 2, 70, "¡LLEGASTE AL 2030!", {
            fontSize: `${titleSize}px`, fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
        }).setOrigin(0.5);

        const subtitleSize = Math.min(16, width * 0.03);
        this.add.text(width / 2, 120, "AGUA LIMPIA Y SANEAMIENTO", {
            fontSize: `${subtitleSize}px`, fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.6);

        this.drawSeparator(width, 148);

        // Stats
        this.add.text(width / 2, 200, [
            `⭐  Puntos: ${this.endPoints}`,
            `💧  Items: ${this.endItems}`,
        ].join("\n"), {
            fontSize: "24px", fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff", align: "center", lineSpacing: 10,
        }).setOrigin(0.5);

        this.drawSeparator(width, 245);

        // LAS METAS intro
        this.add.text(width / 2, 280, "LAS METAS", {
            fontSize: "32px", fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
        }).setOrigin(0.5);

        this.add.text(width / 2, 330, "Todos podemos ayudar a cumplir los\nObjetivos Globales. Estas son las 8 metas\npara garantizar agua limpia y saneamiento.", {
            fontSize: "16px", fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff", align: "center", lineSpacing: 6,
        }).setOrigin(0.5).setAlpha(0.8);

        // Target preview list
        const startY = 400;
        const cols = 2;
        TARGETS.forEach((t, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const tx = width / 2 - 200 + col * 230;
            const ty = startY + row * 36;
            this.add.text(tx, ty, `${t.short}`, {
                fontSize: "14px", fontFamily: "Arial, Helvetica, sans-serif",
                color: "#ffffff",
            }).setAlpha(0.7);
        });

        // Next button
        this.makeButton(width / 2, height - 80, "VER METAS →", () => {
            this.currentPage = 1;
            this.showTargetPage(0);
        });

        this.drawCredit(width, height);
    }

    /* ───── Page: Individual target ───── */
    showTargetPage(index) {
        this.clearPage();
        const { width, height } = this.scale;
        const t = TARGETS[index];

        this.drawBg(width, height);

        // Panel
        this.drawPanel(width, 30, 500);

        // Header: target number + emoji
        this.add.text(width / 2, 55, `${t.emoji}  Meta ${t.id}`, {
            fontSize: "20px", fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.7);

        // Title
        this.add.text(width / 2, 100, t.title, {
            fontSize: "24px", fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#ffffff",
            align: "center", wordWrap: { width: 460 }, lineSpacing: 6,
        }).setOrigin(0.5, 0);

        // Big emoji in center
        this.add.text(width / 2, 250, t.emoji, {
            fontSize: "80px",
        }).setOrigin(0.5).setAlpha(0.15);

        // Description
        this.add.text(width / 2, 220, t.desc, {
            fontSize: "17px", fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff", align: "center",
            wordWrap: { width: 460 }, lineSpacing: 6,
        }).setOrigin(0.5, 0).setAlpha(0.9);

        // Page indicator
        this.add.text(width / 2, height - 90, `${index + 1} / ${TARGETS.length}`, {
            fontSize: "16px", fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.5);

        // Navigation dots
        for (let i = 0; i < TARGETS.length; i++) {
            const dotX = width / 2 - (TARGETS.length * 10) / 2 + i * 14;
            const dot = this.add.circle(dotX, height - 75, 5, 0xffffff, i === index ? 0.9 : 0.25);
        }

        // Navigation buttons
        const isLast = index === TARGETS.length - 1;

        if (index > 0) {
            this.makeButton(width / 2 - 120, height - 42, "← ANTERIOR", () => {
                this.showTargetPage(index - 1);
            }, 140);
        }

        if (isLast) {
            this.makeButton(width / 2 + (index > 0 ? 120 : 0), height - 42, "VOLVER A JUGAR", () => {
                this.scene.start("MenuScene");
            }, 170);
        } else {
            this.makeButton(width / 2 + (index > 0 ? 120 : 0), height - 42, "SIGUIENTE →", () => {
                this.showTargetPage(index + 1);
            }, 150);
        }

        this.drawCredit(width, height);
    }

    /* ───── Helpers ───── */

    clearPage() {
        this.children.removeAll(true);
    }

    drawBg(w, h) {
        const bg = this.add.graphics();
        bg.fillStyle(0x26BDE2, 1);
        bg.fillRect(0, 0, w, h);
    }

    drawPanel(w, y, h) {
        const panelW = Math.min(500, w - 20);
        const gfx = this.add.graphics();
        gfx.fillStyle(0x1A8AAB, 0.3);
        gfx.fillRoundedRect(w / 2 - panelW / 2, y, panelW, h, 8);
    }

    drawSeparator(w, y) {
        const gfx = this.add.graphics();
        gfx.lineStyle(1, 0xffffff, 0.25);
        gfx.lineBetween(w / 2 - 150, y, w / 2 + 150, y);
    }

    drawFallingEmojis(w, h) {
        const emojis = ["🎉", "💧", "⭐", "✨", "🌍", "🌊", "♻️"];
        for (let i = 0; i < 10; i++) {
            const txt = this.add.text(
                Phaser.Math.Between(20, w - 20), -30,
                emojis[i % emojis.length],
                { fontSize: `${Phaser.Math.Between(24, 40)}px` }
            ).setAlpha(0.18);
            this.tweens.add({
                targets: txt, y: h + 30, duration: Phaser.Math.Between(5000, 8000),
                delay: i * 300, repeat: -1,
            });
        }
    }

    drawCredit(w, h) {
        this.add.text(w / 2, h - 12, "ODS 6 · Agenda 2030 · Naciones Unidas", {
            fontSize: "11px", fontFamily: "Arial, Helvetica, sans-serif",
            color: "#ffffff",
        }).setOrigin(0.5).setAlpha(0.3);
    }

    makeButton(x, y, label, callback, bw = 200) {
        const bh = 50;
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);

        const txt = this.add.text(x, y, label, {
            fontSize: "18px", fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold", color: "#26BDE2",
        }).setOrigin(0.5);

        const zone = this.add.rectangle(x, y, bw, bh, 0xffffff, 0.001)
            .setOrigin(0.5).setInteractive({ useHandCursor: true });

        zone.on("pointerover", () => {
            gfx.clear(); gfx.fillStyle(0xe0f7fa, 1);
            gfx.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
        });
        zone.on("pointerout", () => {
            gfx.clear(); gfx.fillStyle(0xffffff, 1);
            gfx.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
        });
        zone.on("pointerdown", callback);
    }
}
