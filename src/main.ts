import { Game, Types } from 'phaser';
import { CatcherScene } from './scenes/CatcherScene';
import { GameOverScene } from './scenes/GameOverScene';
import { HudScene } from './scenes/HudScene';
import { MainScene } from './scenes/MainScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { WinScene } from './scenes/WinScene';
import { networkManager } from './systems/NetworkManager';

const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 480,
    height: 960,
    backgroundColor: '#F8FAFC',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    fps: {
        target: 60,
        forceSetTimeOut: true
    },
    render: {
        pixelArt: true,
        antialias: false,
        antialiasGL: false,
        roundPixels: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
        autoRound: true
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
        CatcherScene,
        GameOverScene,
        WinScene
    ]
};

function initGame(): void {
    const game = new Game(config);
    (window as any).__phaserGame = game;
    (window as any).networkManager = networkManager;

    // Disable Phaser auto-pause on window blur or Alt+Tab
    game.events.off(Phaser.Core.Events.BLUR);
    game.events.off(Phaser.Core.Events.FOCUS);
    game.events.off(Phaser.Core.Events.HIDDEN);
    game.events.off(Phaser.Core.Events.VISIBLE);

    // Prevent right-click context menu so right-click can be used seamlessly for controls
    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Global touch/pointer controls state
    window.__touchControls = { left: false, right: false };
    window.__gameActive = false;

    let isPointerActive = false;

    const handlePointerMove = (e: PointerEvent): void => {
        if (!window.__gameActive || !isPointerActive) return;
        const canvas = document.querySelector('#phaser-container canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;

        if (!window.__touchControls) return;
        if (e.clientX < midX) {
            window.__touchControls.left = true;
            window.__touchControls.right = false;
        } else {
            window.__touchControls.left = false;
            window.__touchControls.right = true;
        }
    };

    const handlePointerDown = (e: PointerEvent): void => {
        if (!window.__gameActive) return;
        isPointerActive = true;
        handlePointerMove(e);
    };

    const handlePointerUp = (): void => {
        isPointerActive = false;
        if (window.__touchControls) {
            window.__touchControls.left = false;
            window.__touchControls.right = false;
        }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.fonts.ready.then(initGame);
    });
} else {
    document.fonts.ready.then(initGame);
}

