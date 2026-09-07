import Phaser from 'phaser'
import { WARDEN_SHEET } from '../animation/WardenAnimations'

/**
 * Generates placeholder textures procedurally, then hands off to the arena.
 *
 * Nothing here is final art. Drawing the placeholders in code rather than
 * shipping images means the combat feel can be tuned before a single asset is
 * generated, which is the whole point of the phase 0 milestone.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload(): void {
    this.load.spritesheet(WARDEN_SHEET.textureKey, WARDEN_SHEET.texturePath, {
      frameWidth: WARDEN_SHEET.frameWidth,
      frameHeight: WARDEN_SHEET.frameHeight,
    })
  }

  create(): void {
    this.createDummyTexture()
    this.createSlashTexture()
    this.createSparkTexture()
    this.createFloorTexture()

    this.scene.start('Arena')
  }

  private createDummyTexture(): void {
    const g = this.add.graphics()

    g.fillStyle(0x7a6b8c, 1)
    g.fillRoundedRect(4, 12, 82, 92, 18)

    g.fillStyle(0x2a2334, 1)
    g.fillRect(23, 42, 14, 18)
    g.fillRect(54, 42, 14, 18)

    g.fillStyle(0x574b68, 1)
    g.fillRect(4, 74, 82, 8)

    g.generateTexture('dummy', 90, 108)
    g.destroy()
  }

  /**
   * A crescent centred in its own texture, opening toward positive x.
   * SlashEffect rotates and scales it to match the weapon being swung.
   */
  private createSlashTexture(): void {
    const size = 128
    const centre = size / 2
    const g = this.add.graphics()

    g.fillStyle(0xffffff, 1)
    g.beginPath()
    g.arc(centre, centre, 62, Phaser.Math.DegToRad(-52), Phaser.Math.DegToRad(52), false)
    g.arc(centre, centre, 38, Phaser.Math.DegToRad(52), Phaser.Math.DegToRad(-52), true)
    g.closePath()
    g.fillPath()

    g.generateTexture('slash', size, size)
    g.destroy()
  }

  private createSparkTexture(): void {
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 4)
    g.generateTexture('spark', 8, 8)
    g.destroy()
  }

  private createFloorTexture(): void {
    const g = this.add.graphics()

    g.fillStyle(0x14111a, 1)
    g.fillRect(0, 0, 64, 64)

    g.lineStyle(1, 0x1d1826, 1)
    g.strokeRect(0.5, 0.5, 63, 63)

    g.fillStyle(0x191420, 1)
    g.fillRect(28, 28, 8, 8)

    g.generateTexture('floor', 64, 64)
    g.destroy()
  }
}
