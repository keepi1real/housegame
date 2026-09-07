import Phaser from 'phaser'

/**
 * A slim bar drawn above an entity.
 *
 * Redrawn every frame rather than tweened, because entities are knocked around
 * constantly and a tweened bar would lag behind its owner.
 */
export class HealthBar {
  private readonly graphics: Phaser.GameObjects.Graphics

  constructor(
    scene: Phaser.Scene,
    private readonly width: number,
    private readonly height: number,
  ) {
    this.graphics = scene.add.graphics()
    this.graphics.setDepth(90)
  }

  draw(centreX: number, topY: number, ratio: number): void {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1)
    const left = centreX - this.width / 2

    this.graphics.clear()

    this.graphics.fillStyle(0x14111a, 0.85)
    this.graphics.fillRect(left - 1, topY - 1, this.width + 2, this.height + 2)

    this.graphics.fillStyle(0x3a2f44, 1)
    this.graphics.fillRect(left, topY, this.width, this.height)

    this.graphics.fillStyle(clamped > 0.3 ? 0xd8536a : 0xe8a04a, 1)
    this.graphics.fillRect(left, topY, this.width * clamped, this.height)
  }

  setVisible(visible: boolean): void {
    this.graphics.setVisible(visible)
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
