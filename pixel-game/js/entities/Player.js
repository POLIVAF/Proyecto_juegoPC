export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // 👇 ESTA LÍNEA ES LA CLAVE
    const sprite = scene.physics.add.sprite(x, y, 'player');

    super(scene, x, y, 'player');

    // 👇 usamos el sprite real con física
    return Object.assign(sprite, this);
  }

  update(cursors) {
    this.setVelocity(0);

    if (cursors.left.isDown) {
      this.setVelocityX(-150);
    } else if (cursors.right.isDown) {
      this.setVelocityX(150);
    }

    if (cursors.up.isDown) {
      this.setVelocityY(-150);
    } else if (cursors.down.isDown) {
      this.setVelocityY(150);
    }
  }
}