import { Game, Types } from 'phaser';
import { GameOverScene } from './scenes/GameOverScene';
import { HudScene } from './scenes/HudScene';
import { MainScene } from './scenes/MainScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { WinScene } from './scenes/WinScene';

const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 420,
    height: 840,
    backgroundColor: '#0A0E1A',
    pixelArt: true, // Enables sharp pixel art rendering
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 150 },
            // debug: false
        }
    },
    scene: [
        PreloaderScene,
        MenuScene,
        MainScene,
        HudScene,
        GameOverScene,
        WinScene
    ]
};

function initGame(): void {
    new Game(config);

    // Setup global touch controls state
    window.__touchControls = { left: false, right: false };
    window.__gameActive = false;

    function setupTouchArea(id: string, key: 'left' | 'right'): void {
        const area = document.getElementById(id);
        if (!area) return;

        const onDown = (e: Event): void => {
            if (!window.__gameActive) return;
            e.preventDefault();
            e.stopPropagation();
            if (window.__touchControls) {
                window.__touchControls[key] = true;
            }
        };

        const onUp = (e: Event): void => {
            if (!window.__gameActive) return;
            e.preventDefault();
            e.stopPropagation();
            if (window.__touchControls) {
                window.__touchControls[key] = false;
            }
        };

        area.addEventListener('touchstart', onDown, { passive: false });
        area.addEventListener('touchend', onUp, { passive: false });
        area.addEventListener('touchcancel', onUp, { passive: false });
        area.addEventListener('mousedown', onDown);
        area.addEventListener('mouseup', onUp);
        area.addEventListener('mouseleave', onUp);
    }

    setupTouchArea('touch-area-left', 'left');
    setupTouchArea('touch-area-right', 'right');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
