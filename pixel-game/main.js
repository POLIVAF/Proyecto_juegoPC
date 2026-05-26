import BootScene from './js/scenes/BootScene.js';
import GameScene from './js/scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true // 👈 para ver el cuadrado
    }
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);