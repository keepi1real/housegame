import Phaser from 'phaser'

/**
 * The visible arc of a melee swing.
 *
 * This is the core of the project's animation strategy: the weapon arc is a
 * separate short-lived sprite that sweeps and fades, while the character itself
 * only lunges. No frame-by-frame character animation is ever required.
 */
export class SlashEffect {
  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * @param arcDegrees how far the arc sweeps during its lifetime
   * @param emphatic true for combo finishers and heavy attacks
   */
  play(
    x: number,
    y: number,
    facing: Phaser.Math.Vector2,
    range: number,
    arcDegrees: number,
    durationMs: number,
    emphatic: boolean,
  ): void {
    const sprite = this.scene.add.sprite(x, y, 'slash')
    sprite.setOrigin(0.5, 0.5)
    sprite.setDepth(500)
    sprite.setBlendMode(Phaser.BlendModes.ADD)
    sprite.setTint(emphatic ? 0xffd9a0 : 0xdce7ff)

    // The texture is authored at a known radius; scale it to the weapon reach.
    const textureRadius = sprite.width / 2
    const scale = range / textureRadius
    sprite.setScale(scale * 0.72, scale)

    const sweep = Phaser.Math.DegToRad(arcDegrees)
    const centre = Math.atan2(facing.y, facing.x)
    sprite.setRotation(centre - sweep / 2)
    sprite.setAlpha(emphatic ? 0.95 : 0.75)

    this.scene.tweens.add({
      targets: sprite,
      rotation: centre + sweep / 2,
      duration: durationMs,
      ease: 'Quad.easeOut',
    })

    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      scaleX: scale * (emphatic ? 1.15 : 1.0),
      duration: durationMs * 1.6,
      ease: 'Quad.easeIn',
      onComplete: () => sprite.destroy(),
    })
  }
}
