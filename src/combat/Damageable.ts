/**
 * Anything an attack can land on.
 *
 * Attack code depends on this interface only, never on concrete enemy classes,
 * so new enemies need no changes to the weapons that hit them.
 */
export interface Damageable {
  readonly x: number
  readonly y: number
  /** Radius used for hit tests, in pixels. */
  readonly hitRadius: number
  readonly isAlive: boolean

  takeDamage(amount: number, knockbackX: number, knockbackY: number): void
}
