import { CharacterAnimation } from './CharacterAnimation'
import type {
  AnimationDefinition,
  CharacterSheetLayout,
} from './AnimationDefinition'

/**
 * Sheet layout for the Warden, the first playable character.
 *
 * These numbers mirror the render specification in ART_PIPELINE.md. Swapping the
 * procedural placeholder for real Blender renders means changing `textureKey`
 * and the frame sizes here, and nothing else in the project.
 */
export const WARDEN_SHEET: CharacterSheetLayout = {
  textureKey: 'warden',
  frameWidth: 64,
  frameHeight: 64,
  columns: 8,
}

/**
 * Frame rates are chosen so each animation's length matches the corresponding
 * state duration in GameConfig. A swing that outlasts its own hitbox reads as
 * laggy, so these two tables must be changed together.
 */
export const WARDEN_ANIMATIONS: readonly AnimationDefinition[] = [
  { key: CharacterAnimation.Idle, row: 0, frames: 6, frameRate: 8, repeat: -1 },
  { key: CharacterAnimation.Run, row: 1, frames: 8, frameRate: 14, repeat: -1 },
  { key: CharacterAnimation.Dash, row: 2, frames: 4, frameRate: 28, repeat: 0 },
  { key: CharacterAnimation.Light1, row: 3, frames: 6, frameRate: 24, repeat: 0 },
  { key: CharacterAnimation.Light2, row: 4, frames: 6, frameRate: 24, repeat: 0 },
  { key: CharacterAnimation.Light3, row: 5, frames: 8, frameRate: 32, repeat: 0 },
  { key: CharacterAnimation.Heavy, row: 6, frames: 8, frameRate: 24, repeat: 0 },
  { key: CharacterAnimation.Shoot, row: 7, frames: 5, frameRate: 20, repeat: 0 },
  { key: CharacterAnimation.Hurt, row: 8, frames: 3, frameRate: 14, repeat: 0 },
  { key: CharacterAnimation.Death, row: 9, frames: 8, frameRate: 12, repeat: 0 },
]
