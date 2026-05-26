export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.spritesheet('player', 'assets/sprites/player/player_walk.png', { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.scene.start('GameScene');
  }
}