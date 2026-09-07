/**
 * Freeze frames on impact.
 *
 * Implemented as an explicit counter rather than Phaser's time scale so the
 * freeze is deterministic and never interferes with tweens or camera effects.
 * The scene asks `isFrozen` and skips gameplay updates while it is true.
 */
export class Hitstop {
  private remainingMs = 0

  update(deltaMs: number): void {
    if (this.remainingMs > 0) {
      this.remainingMs = Math.max(0, this.remainingMs - deltaMs)
    }
  }

  /** Freezes gameplay. Overlapping requests take the longest one, never sum. */
  trigger(durationMs: number): void {
    this.remainingMs = Math.max(this.remainingMs, durationMs)
  }

  get isFrozen(): boolean {
    return this.remainingMs > 0
  }
}
