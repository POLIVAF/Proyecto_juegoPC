import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.player = new Player(this, 400, 300);

    this.cursors = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D'
    });

    // Make the camera follow the player
    this.cameras.main.startFollow(this.player);
  }

  update() {
    this.player.update(this.cursors);
  }
}