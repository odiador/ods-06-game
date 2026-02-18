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
    width: 640,
    height: 960,
    backgroundColor: "#26BDE2",
    pixelArt: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 300 },
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

// Initialize game and controls after DOM is ready
function initGame() {
    new Game(config);
    
    /* ── HTML Touch Controls (multi-touch) ── */
    window.__touchControls = { left: false, right: false };

    function setupTouchBtn(id, key) {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        const onDown = (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            window.__touchControls[key] = true; 
            btn.classList.add("pressed"); 
        };
        const onUp = (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            window.__touchControls[key] = false; 
            btn.classList.remove("pressed"); 
        };
        
        btn.addEventListener("touchstart", onDown, { passive: false });
        btn.addEventListener("touchend", onUp, { passive: false });
        btn.addEventListener("touchcancel", onUp, { passive: false });
        btn.addEventListener("mousedown", onDown);
        btn.addEventListener("mouseup", onUp);
        btn.addEventListener("mouseleave", onUp);
    }

    setupTouchBtn("btn-left", "left");
    setupTouchBtn("btn-right", "right");
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}