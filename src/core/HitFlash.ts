import type Phaser from 'phaser'

/**
 * Brief white tint on a sprite that just took damage.
 *
 * This is the cheapest and strongest readability cue in a top-down brawler:
 * it confirms the hit registered even when the target is off the player's focus.
 */
export class HitFlash {
  constructor(private readonly scene: Phaser.Scene) {}

  play(target: Phaser.GameObjects.Sprite, durationMs: number): void {
    target.setTintFill(0xffffff)
    this.scene.time.delayedCall(durationMs, () => {
      if (target.active) {
        target.clearTint()
      }
    })
  }
}
