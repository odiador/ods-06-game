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
    width: 420,
    height: 900,
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
    
    /* ── Invisible Touch Areas (multi-touch) ── */
    window.__touchControls = { left: false, right: false };
    window.__gameActive = false; // Only active during gameplay

    function setupTouchArea(id, key) {
        const area = document.getElementById(id);
        if (!area) return;
        
        const onDown = (e) => {
            if (!window.__gameActive) return; // Only respond during gameplay
            e.preventDefault(); 
            e.stopPropagation();
            window.__touchControls[key] = true;
        };
        const onUp = (e) => {
            if (!window.__gameActive) return; // Only respond during gameplay
            e.preventDefault(); 
            e.stopPropagation();
            window.__touchControls[key] = false;
        };
        
        area.addEventListener("touchstart", onDown, { passive: false });
        area.addEventListener("touchend", onUp, { passive: false });
        area.addEventListener("touchcancel", onUp, { passive: false });
        area.addEventListener("mousedown", onDown);
        area.addEventListener("mouseup", onUp);
        area.addEventListener("mouseleave", onUp);
    }

    setupTouchArea("touch-area-left", "left");
    setupTouchArea("touch-area-right", "right");
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}