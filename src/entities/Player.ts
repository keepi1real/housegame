import Phaser from 'phaser'
import { GameConfig } from '../config/GameConfig'
import { ArcHitDetector } from '../combat/ArcHitDetector'
import { SlashEffect } from '../combat/SlashEffect'
import type { Damageable } from '../combat/Damageable'
import type { InputIntent } from '../input/InputIntent'
import { PlayerState } from './PlayerState'
import { PlayerEvents, type PlayerHitPayload } from './PlayerEvents'

/**
 * The Warden: the player character.
 *
 * Owns an explicit action state machine. Every timing comes from GameConfig, so
 * combat feel is tuned by editing numbers, never by editing this class.
 *
 * The central rule of the design lives here: a dash cancels the recovery of any
 * swing. That single affordance is what turns the move set into a combat system.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private action = PlayerState.Free
  private stateElapsedMs = 0

  private dashCooldownMs = 0
  private invulnerableMs = 0

  private comboIndex = 0
  private comboIdleMs = 0
  private swingHasLanded = false

  private readonly facing = new Phaser.Math.Vector2(1, 0)
  private readonly slash: SlashEffect

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(100)
    this.slash = new SlashEffect(scene)

    const radius = GameConfig.player.radius
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius)
    body.setCollideWorldBounds(true)
  }

  get isInvulnerable(): boolean {
    return this.invulnerableMs > 0
  }

  /** Current combo step, 1-based, for debug readouts. */
  get comboStep(): number {
    return this.comboIndex + 1
  }

  get actionState(): PlayerState {
    return this.action
  }

  /**
   * Advances one frame.
   *
   * @param deltaMs frame time; already zero-safe because the scene skips this
   *   call entirely during hitstop
   * @param targets everything the player's swings may connect with
   */
  step(deltaMs: number, intent: InputIntent, targets: readonly Damageable[]): void {
    this.tickTimers(deltaMs)
    this.updateFacing(intent)

    // Dash outranks everything. Cancelling swing recovery with a dash is the
    // core expressive move of the combat system.
    if (intent.dashPressed && this.canDash()) {
      this.beginDash()
      return
    }

    this.stateElapsedMs += deltaMs

    switch (this.action) {
      case PlayerState.Free:
        this.updateFree(deltaMs, intent)
        break
      case PlayerState.Dashing:
        this.updateDash()
        break
      case PlayerState.LightSwing:
        this.updateLightSwing(deltaMs, targets)
        break
      case PlayerState.HeavyCharge:
        this.updateHeavyCharge(deltaMs, intent)
        break
      case PlayerState.HeavySwing:
        this.updateHeavySwing(deltaMs, targets)
        break
    }
  }

  private tickTimers(deltaMs: number): void {
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs)
    this.invulnerableMs = Math.max(0, this.invulnerableMs - deltaMs)

    if (this.comboIdleMs > 0) {
      this.comboIdleMs = Math.max(0, this.comboIdleMs - deltaMs)
      if (this.comboIdleMs === 0) {
        this.comboIndex = 0
      }
    }
  }

  /** Facing is locked during a swing so the arc cannot be steered mid-hit. */
  private updateFacing(intent: InputIntent): void {
    const locked =
      this.action === PlayerState.LightSwing ||
      this.action === PlayerState.HeavySwing ||
      this.action === PlayerState.Dashing

    if (locked || intent.aim.lengthSq() === 0) return

    this.facing.copy(intent.aim)
    this.setFlipX(this.facing.x < 0)
  }

  private canDash(): boolean {
    return this.dashCooldownMs <= 0 && this.action !== PlayerState.Dashing
  }

  private updateFree(deltaMs: number, intent: InputIntent): void {
    if (intent.lightPressed) {
      this.beginLightSwing()
      return
    }

    if (intent.heavyHeld) {
      this.enterState(PlayerState.HeavyCharge)
      return
    }

    this.applyMovement(deltaMs, intent.move)
  }

  private beginDash(): void {
    const direction = this.facing.clone()
    if (direction.lengthSq() === 0) {
      direction.set(1, 0)
    }

    this.setVelocity(
      direction.x * GameConfig.dash.speed,
      direction.y * GameConfig.dash.speed,
    )

    this.dashCooldownMs = GameConfig.dash.cooldownMs
    this.invulnerableMs = GameConfig.dash.invulnerableMs
    this.enterState(PlayerState.Dashing)

    this.applyDashStretch(direction)
    this.setAlpha(0.65)

    this.emit(PlayerEvents.Dashed)
  }

  private updateDash(): void {
    if (this.stateElapsedMs < GameConfig.dash.durationMs) return

    this.setAlpha(1)
    this.enterState(PlayerState.Free)
  }

  private beginLightSwing(): void {
    this.swingHasLanded = false
    this.enterState(PlayerState.LightSwing)

    const lunge = GameConfig.attack.lungeSpeed[this.comboIndex] ?? 0
    this.setVelocity(this.facing.x * lunge, this.facing.y * lunge)

    this.punchScale(this.isFinisher() ? 1.18 : 1.09)
  }

  private updateLightSwing(deltaMs: number, targets: readonly Damageable[]): void {
    const cfg = GameConfig.attack
    const activeAt = cfg.windupMs
    const totalMs = cfg.windupMs + cfg.activeMs + cfg.recoveryMs

    this.applyFriction(deltaMs, 4.5)

    if (!this.swingHasLanded && this.stateElapsedMs >= activeAt) {
      this.swingHasLanded = true
      const finisher = this.isFinisher()

      this.slash.play(
        this.x,
        this.y,
        this.facing,
        cfg.range,
        cfg.arcDegrees,
        cfg.activeMs * 2.2,
        finisher,
      )

      this.resolveHits(
        targets,
        cfg.range,
        cfg.arcDegrees,
        cfg.damage[this.comboIndex] ?? 0,
        cfg.knockback[this.comboIndex] ?? 0,
        finisher,
      )
    }

    if (this.stateElapsedMs >= totalMs) {
      this.advanceCombo()
      this.enterState(PlayerState.Free)
    }
  }

  private updateHeavyCharge(deltaMs: number, intent: InputIntent): void {
    // Charging keeps the player mobile but slow, so committing is still a risk.
    this.applyMovement(deltaMs, intent.move, 0.42)

    const charged = this.stateElapsedMs >= GameConfig.heavy.chargeMs

    if (charged) {
      this.setTintFill(0xfff0c8)
      this.emit(PlayerEvents.HeavyCharged)
      this.beginHeavySwing()
      return
    }

    // Releasing before the swing is ready cancels it outright. The heavy is a
    // commitment, not a tap.
    if (intent.heavyReleased) {
      this.enterState(PlayerState.Free)
    }
  }

  private beginHeavySwing(): void {
    this.clearTint()
    this.swingHasLanded = false
    this.enterState(PlayerState.HeavySwing)
    this.setVelocity(this.facing.x * 380, this.facing.y * 380)
    this.punchScale(1.3)
  }

  private updateHeavySwing(deltaMs: number, targets: readonly Damageable[]): void {
    const cfg = GameConfig.heavy
    const totalMs = cfg.activeMs + cfg.recoveryMs

    this.applyFriction(deltaMs, 5.5)

    if (!this.swingHasLanded) {
      this.swingHasLanded = true

      this.slash.play(
        this.x,
        this.y,
        this.facing,
        cfg.range,
        cfg.arcDegrees,
        cfg.activeMs * 2.6,
        true,
      )

      this.resolveHits(
        targets,
        cfg.range,
        cfg.arcDegrees,
        cfg.damage,
        cfg.knockback,
        true,
      )
    }

    if (this.stateElapsedMs >= totalMs) {
      this.comboIndex = 0
      this.enterState(PlayerState.Free)
    }
  }

  private resolveHits(
    targets: readonly Damageable[],
    range: number,
    arcDegrees: number,
    damage: number,
    knockback: number,
    emphatic: boolean,
  ): void {
    const hits = ArcHitDetector.detect(
      this.x,
      this.y,
      this.facing,
      range,
      arcDegrees,
      targets,
    )

    for (const target of hits) {
      // Knockback pushes away from the player, not along the facing, so hits at
      // the edge of the arc scatter enemies outward instead of stacking them.
      const dx = target.x - this.x
      const dy = target.y - this.y
      const length = Math.hypot(dx, dy) || 1

      target.takeDamage(damage, (dx / length) * knockback, (dy / length) * knockback)

      const payload: PlayerHitPayload = { target, damage, emphatic }
      this.emit(PlayerEvents.Hit, payload)
    }
  }

  private advanceCombo(): void {
    this.comboIndex = (this.comboIndex + 1) % GameConfig.attack.damage.length
    this.comboIdleMs = GameConfig.attack.comboWindowMs
  }

  private isFinisher(): boolean {
    return this.comboIndex === GameConfig.attack.damage.length - 1
  }

  private enterState(next: PlayerState): void {
    this.action = next
    this.stateElapsedMs = 0
  }

  private applyMovement(
    deltaMs: number,
    move: Phaser.Math.Vector2,
    speedScale = 1,
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    const maxSpeed = GameConfig.player.maxSpeed * speedScale
    const step = (GameConfig.player.acceleration * deltaMs) / 1000

    body.velocity.x = this.approach(body.velocity.x, move.x * maxSpeed, step)
    body.velocity.y = this.approach(body.velocity.y, move.y * maxSpeed, step)
  }

  /** Exponential decay, frame-rate independent. */
  private applyFriction(deltaMs: number, strength: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    const factor = Math.exp((-strength * deltaMs) / 1000)
    body.velocity.scale(factor)
  }

  private approach(current: number, target: number, maxStep: number): number {
    const difference = target - current
    if (Math.abs(difference) <= maxStep) return target
    return current + Math.sign(difference) * maxStep
  }

  private applyDashStretch(direction: Phaser.Math.Vector2): void {
    const { stretch, squash } = GameConfig.dash
    const horizontal = Math.abs(direction.x)
    const vertical = Math.abs(direction.y)

    this.scene.tweens.killTweensOf(this)
    this.setScale(
      1 + (stretch - 1) * horizontal + (squash - 1) * vertical,
      1 + (stretch - 1) * vertical + (squash - 1) * horizontal,
    )

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: GameConfig.dash.durationMs * 1.8,
      ease: 'Back.easeOut',
    })
  }

  private punchScale(amount: number): void {
    this.scene.tweens.killTweensOf(this)
    this.setScale(amount, 2 - amount)

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    })
  }
}
