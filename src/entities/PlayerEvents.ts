import type { Damageable } from '../combat/Damageable'

/**
 * Events the player emits so the scene can drive feedback.
 *
 * The player never calls hitstop, shake or damage numbers directly. It reports
 * what happened, and presentation stays the scene's concern.
 */
export const PlayerEvents = {
  Hit: 'player:hit',
  Dashed: 'player:dashed',
  HeavyCharged: 'player:heavy-charged',
} as const

export interface PlayerHitPayload {
  readonly target: Damageable
  readonly damage: number
  /** True for combo finishers and heavy attacks, which get stronger feedback. */
  readonly emphatic: boolean
}
