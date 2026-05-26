export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.player = this.physics.add.sprite(400, 300, 'player');

    this.player.setScale(2);
    this.player.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.addKeys({
  up: 'W',
  down: 'S',
  left: 'A',
  right: 'D'
});
  }

  update() {
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-150);
    } 
    else if (this.cursors.right.isDown) {
      this.player.setVelocityX(150);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-150);
    } 
    else if (this.cursors.down.isDown) {
      this.player.setVelocityY(150);
    }
  }
}