import type Phaser from 'phaser'
import type { CharacterAnimationKey } from './CharacterAnimation'

/**
 * Plays named animations on one sprite.
 *
 * Entities ask for an animation by meaning ("run", "light-1") and never touch
 * frame numbers or namespaced keys. That indirection is what lets a character's
 * art be replaced without touching its behaviour.
 */
export class CharacterAnimator {
  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly prefix: string,
  ) {}

  /**
   * Starts an animation, ignoring the call if it is already the current one.
   * Safe to call every frame from a state machine.
   */
  play(key: CharacterAnimationKey): void {
    this.sprite.anims.play(`${this.prefix}-${key}`, true)
  }

  /** Restarts an animation from frame zero even if it is already playing. */
  restart(key: CharacterAnimationKey): void {
    this.sprite.anims.play(`${this.prefix}-${key}`)
  }

  get currentKey(): string | undefined {
    return this.sprite.anims.currentAnim?.key
  }
}
