// src/config.js
import BootScene from "./scenes/BootScene.js";
import PreloadScene from "./scenes/PreloadScene.js";
import GameScene from "./scenes/GameScene.js";
import HudScene from "./scenes/HudScene.js";
import ShopScene from "./scenes/ShopScene.js";
import GameOverScene from "./scenes/GameOverScene.js";
import MenuScene from "./scenes/MenuScene.js";
// import LoginScene from './scenes/LoginScene.js';

export default {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    PreloadScene,
    // LoginScene,
    MenuScene,
    GameScene,
    HudScene,
    ShopScene,
    GameOverScene,
  ],
};
