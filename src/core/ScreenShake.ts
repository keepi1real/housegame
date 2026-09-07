import type Phaser from 'phaser'

/**
 * Camera shake on impact.
 *
 * Wraps the camera so call sites express intent ("a light hit landed") instead
 * of raw numbers, and so shake can later be scaled by an accessibility setting
 * in exactly one place.
 */
export class ScreenShake {
  /** Multiplier exposed for a future "reduce screen shake" option. */
  intensityScale = 1

  constructor(private readonly camera: Phaser.Cameras.Scene2D.Camera) {}

  trigger(durationMs: number, intensity: number): void {
    const scaled = intensity * this.intensityScale
    if (scaled <= 0) return
    this.camera.shake(durationMs, scaled)
  }
}
