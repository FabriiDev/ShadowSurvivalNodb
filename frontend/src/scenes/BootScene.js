// src/scenes/BootScene.js
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Podés mostrar un loader si querés
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
