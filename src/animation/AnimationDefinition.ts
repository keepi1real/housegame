import type { CharacterAnimationKey } from './CharacterAnimation'

/**
 * One animation's position inside a character sheet.
 *
 * Sheets are laid out one animation per row, frames left to right. That is the
 * natural output of a Blender render, so no repacking step is needed between
 * the art pipeline and the game.
 */
export interface AnimationDefinition {
  readonly key: CharacterAnimationKey
  /** Zero-based row in the sheet. */
  readonly row: number
  readonly frames: number
  readonly frameRate: number
  /** -1 loops forever, 0 plays once. */
  readonly repeat: number
}

/** Sheet geometry shared by every animation on one character. */
export interface CharacterSheetLayout {
  readonly textureKey: string
  /** Path served by Vite, relative so the build works on any static host. */
  readonly texturePath: string
  readonly frameWidth: number
  readonly frameHeight: number
  /** Frames per row. Rows are padded to this width even when unused. */
  readonly columns: number
  /**
   * Vertical origin, as a fraction of frame height, placed at the character's
   * feet. A top-down character must be anchored where it touches the floor,
   * not at the middle of its image, or its shadow and collision drift upward
   * as the sprite gets taller. Measured from the packed sheet.
   */
  readonly groundOriginY: number
}
