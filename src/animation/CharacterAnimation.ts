/**
 * Names of the animations every playable character must provide.
 *
 * The list is fixed on purpose: a new character is a new sprite sheet with the
 * same rows, so no gameplay code changes when one is added.
 */
export const CharacterAnimation = {
  Idle: 'idle',
  Run: 'run',
  Dash: 'dash',
  Light1: 'light-1',
  Light2: 'light-2',
  Light3: 'light-3',
  Heavy: 'heavy',
  Shoot: 'shoot',
  Hurt: 'hurt',
  Death: 'death',
} as const

export type CharacterAnimationKey =
  (typeof CharacterAnimation)[keyof typeof CharacterAnimation]
