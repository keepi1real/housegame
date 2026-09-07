import type Phaser from 'phaser'
import type {
  AnimationDefinition,
  CharacterSheetLayout,
} from './AnimationDefinition'

/**
 * Turns sheet definitions into Phaser animations.
 *
 * Phaser's animation store is global to the game, so registration happens once
 * at boot rather than per entity. Keys are namespaced by character prefix so two
 * characters can both own an animation called "idle".
 */
export class AnimationRegistrar {
  /**
   * @param prefix character namespace, for example "warden"
   * @returns the prefix, so callers can hand it straight to a CharacterAnimator
   */
  static register(
    scene: Phaser.Scene,
    prefix: string,
    layout: CharacterSheetLayout,
    definitions: readonly AnimationDefinition[],
  ): string {
    for (const definition of definitions) {
      const key = `${prefix}-${definition.key}`
      if (scene.anims.exists(key)) continue

      const start = definition.row * layout.columns

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(layout.textureKey, {
          start,
          end: start + definition.frames - 1,
        }),
        frameRate: definition.frameRate,
        repeat: definition.repeat,
      })
    }

    return prefix
  }
}
