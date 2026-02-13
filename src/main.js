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