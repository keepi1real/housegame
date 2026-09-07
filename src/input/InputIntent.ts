import type Phaser from 'phaser'

/**
 * Device-independent description of what the player wants this frame.
 *
 * Entities read only this. They never touch keyboard, gamepad or touch APIs,
 * which is what lets the same combat code serve desktop, gamepad and mobile.
 */
export interface InputIntent {
  /** Desired movement direction, normalized. Zero length means standing still. */
  readonly move: Phaser.Math.Vector2
  /** Direction the character faces and attacks toward, normalized. */
  readonly aim: Phaser.Math.Vector2
  /** True only on the frame the light attack was pressed. */
  readonly lightPressed: boolean
  /** True while the heavy attack button is held. */
  readonly heavyHeld: boolean
  /** True only on the frame the heavy attack was released. */
  readonly heavyReleased: boolean
  /** True only on the frame dash was pressed. */
  readonly dashPressed: boolean
}
