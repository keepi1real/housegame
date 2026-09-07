import Phaser from 'phaser'
import { GameConfig } from '../config/GameConfig'
import { InputController } from '../input/InputController'
import { Hitstop } from '../core/Hitstop'
import { ScreenShake } from '../core/ScreenShake'
import { HitFlash } from '../core/HitFlash'
import { DamageNumber } from '../core/DamageNumber'
import { Player } from '../entities/Player'
import { PlayerEvents, type PlayerHitPayload } from '../entities/PlayerEvents'
import { TrainingDummy } from '../entities/TrainingDummy'

const ARENA_WIDTH = 1600
const ARENA_HEIGHT = 1000

/**
 * Phase 0 test room.
 *
 * Its only job is to answer one question: does swinging, dashing and connecting
 * feel good? It wires the player to the feedback services and puts three
 * recovering dummies in front of it. Everything here is scaffolding for the
 * real run structure.
 */
export class ArenaScene extends Phaser.Scene {
  private controls!: InputController
  private player!: Player
  private dummies: TrainingDummy[] = []

  private hitstop!: Hitstop
  private shake!: ScreenShake
  private hitFlash!: HitFlash
  private damageNumbers!: DamageNumber

  private hud!: Phaser.GameObjects.Text

  constructor() {
    super('Arena')
  }

  create(): void {
    this.buildRoom()

    this.hitstop = new Hitstop()
    this.shake = new ScreenShake(this.cameras.main)
    this.hitFlash = new HitFlash(this)
    this.damageNumbers = new DamageNumber(this)

    this.controls = new InputController(this)

    this.player = new Player(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 160)
    this.player.on(PlayerEvents.Hit, this.onPlayerHit, this)

    this.dummies = [
      new TrainingDummy(this, ARENA_WIDTH / 2 - 220, ARENA_HEIGHT / 2 - 90),
      new TrainingDummy(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 160),
      new TrainingDummy(this, ARENA_WIDTH / 2 + 220, ARENA_HEIGHT / 2 - 90),
    ]

    this.physics.add.collider(this.player, this.dummies)
    this.physics.add.collider(this.dummies, this.dummies)

    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)

    this.buildHud()
  }

  override update(_time: number, delta: number): void {
    this.hitstop.update(delta)

    // Freeze frames: physics and entity logic both stop, tweens keep running so
    // the swing arc and damage numbers stay alive through the impact pause.
    if (this.hitstop.isFrozen) {
      this.physics.world.pause()
      return
    }
    this.physics.world.resume()

    this.controls.update(this.player.x, this.player.y)
    this.player.step(delta, this.controls.intent, this.dummies)

    for (const dummy of this.dummies) {
      dummy.refresh()
    }

    this.updateHud()
  }

  private onPlayerHit(payload: PlayerHitPayload): void {
    const feedback = GameConfig.feedback

    this.hitstop.trigger(
      payload.emphatic ? feedback.hitstopHeavyMs : feedback.hitstopLightMs,
    )

    this.shake.trigger(
      feedback.shakeDurationMs,
      payload.emphatic ? feedback.shakeHeavy : feedback.shakeLight,
    )

    this.damageNumbers.spawn(
      payload.target.x,
      payload.target.y - 34,
      payload.damage,
      payload.emphatic,
    )

    if (payload.target instanceof TrainingDummy) {
      this.hitFlash.play(payload.target, feedback.flashMs)
      this.emitSparks(payload.target.x, payload.target.y, payload.emphatic)
    }
  }

  private emitSparks(x: number, y: number, emphatic: boolean): void {
    const emitter = this.add.particles(x, y, 'spark', {
      speed: { min: 90, max: emphatic ? 420 : 260 },
      lifespan: { min: 140, max: 340 },
      scale: { start: emphatic ? 0.9 : 0.6, end: 0 },
      quantity: emphatic ? 16 : 8,
      tint: emphatic ? 0xffd9a0 : 0xdce7ff,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    })

    emitter.setDepth(600)
    emitter.explode()
    this.time.delayedCall(600, () => emitter.destroy())
  }

  private buildRoom(): void {
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    this.add
      .tileSprite(0, 0, ARENA_WIDTH, ARENA_HEIGHT, 'floor')
      .setOrigin(0, 0)
      .setDepth(0)

    const walls = this.add.graphics()
    walls.setDepth(1)
    walls.lineStyle(4, 0x2e2638, 1)
    walls.strokeRect(2, 2, ARENA_WIDTH - 4, ARENA_HEIGHT - 4)
  }

  private buildHud(): void {
    this.hud = this.add.text(16, 14, '', {
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: '13px',
      color: '#8c819e',
    })

    this.hud.setScrollFactor(0)
    this.hud.setDepth(2000)

    const help = this.add.text(
      16,
      GameConfig.view.height - 58,
      'WASD движение   ЛКМ серия   ПКМ удержать тяжёлый   ПРОБЕЛ рывок\nРывок отменяет откат после удара. На этом строится вся боёвка.',
      {
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: '13px',
        color: '#5c3f6e',
      },
    )

    help.setScrollFactor(0)
    help.setDepth(2000)
  }

  private updateHud(): void {
    this.hud.setText(
      [
        `состояние  ${this.player.actionState}`,
        `серия      ${this.player.comboStep} / 3`,
        `неуязвим   ${this.player.isInvulnerable ? 'да' : 'нет'}`,
        `fps        ${Math.round(this.game.loop.actualFps)}`,
      ].join('\n'),
    )
  }
}
