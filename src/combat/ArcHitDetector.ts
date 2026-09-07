import Phaser from 'phaser'
import type { Damageable } from './Damageable'

/**
 * Cone hit test for melee swings.
 *
 * A swing is described as an origin, a facing direction, a reach and an arc
 * width. Anything alive whose circle overlaps that cone is hit. This is
 * deliberately simpler than swept collision shapes: it is predictable for the
 * player, cheap to run, and easy to tune from GameConfig alone.
 */
export class ArcHitDetector {
  /**
   * @param arcDegrees full width of the cone, split evenly around the facing
   * @returns targets inside the cone, nearest first
   */
  static detect(
    originX: number,
    originY: number,
    facing: Phaser.Math.Vector2,
    range: number,
    arcDegrees: number,
    candidates: readonly Damageable[],
  ): Damageable[] {
    const facingAngle = Math.atan2(facing.y, facing.x)
    const halfArc = Phaser.Math.DegToRad(arcDegrees) / 2

    const hits: { target: Damageable; distance: number }[] = []

    for (const candidate of candidates) {
      if (!candidate.isAlive) continue

      const dx = candidate.x - originX
      const dy = candidate.y - originY
      const distance = Math.hypot(dx, dy)

      // The target's own radius extends its reach, so large enemies are hit
      // from further away instead of the player having to walk into them.
      if (distance > range + candidate.hitRadius) continue

      // Standing on top of a target always counts, otherwise the angle test
      // becomes unstable as the distance approaches zero.
      if (distance > 1) {
        const delta = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - facingAngle)
        if (Math.abs(delta) > halfArc) continue
      }

      hits.push({ target: candidate, distance })
    }

    hits.sort((a, b) => a.distance - b.distance)
    return hits.map((hit) => hit.target)
  }
}
