import { Game } from "phaser";
import { Preloader } from "./preloader";
import { GameOverScene } from "./scenes/GameOverScene";
import { HudScene } from "./scenes/HudScene";
import { MainScene } from "./scenes/MainScene";
import { MenuScene } from "./scenes/MenuScene";
import { WinScene } from "./scenes/WinScene";

const config = {
    type: Phaser.AUTO,
    parent: "phaser-container",
    width: 960,
    height: 540,
    backgroundColor: "#26BDE2",
    pixelArt: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 800 },
            // debug: true
        }
    },
    scene: [
        Preloader,
        MenuScene,
        MainScene,
        HudScene,
        GameOverScene,
        WinScene
    ]
};

new Game(config);

/* ── HTML Touch Controls (multi-touch) ── */
window.__touchControls = { left: false, right: false, jump: false };

function setupTouchBtn(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const onDown = (e) => { e.preventDefault(); window.__touchControls[key] = true; btn.classList.add("pressed"); };
    const onUp = (e) => { e.preventDefault(); window.__touchControls[key] = false; btn.classList.remove("pressed"); };
    btn.addEventListener("touchstart", onDown, { passive: false });
    btn.addEventListener("touchend", onUp, { passive: false });
    btn.addEventListener("touchcancel", onUp, { passive: false });
    btn.addEventListener("mousedown", onDown);
    btn.addEventListener("mouseup", onUp);
    btn.addEventListener("mouseleave", onUp);
}

setupTouchBtn("btn-left", "left");
setupTouchBtn("btn-right", "right");
setupTouchBtn("btn-jump", "jump");