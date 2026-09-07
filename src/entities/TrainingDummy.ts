import Phaser from 'phaser'
import { GameConfig } from '../config/GameConfig'
import type { Damageable } from '../combat/Damageable'
import { HealthBar } from './HealthBar'

/**
 * A stationary target used to tune combat feel.
 *
 * It exists only for the phase 0 feel test and will be replaced by real
 * enemies. It takes damage and knockback, then recovers, so the swing-dash-swing
 * loop can be exercised indefinitely without restarting the scene.
 */
export class TrainingDummy
  extends Phaser.Physics.Arcade.Sprite
  implements Damageable
{
  private health: number = GameConfig.enemy.dummyMaxHealth
  private readonly healthBar: HealthBar
  private readonly homeX: number
  private readonly homeY: number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.homeX = x
    this.homeY = y
    this.setDepth(80)
    this.healthBar = new HealthBar(scene, 46, 5)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(21, this.width / 2 - 21, this.height / 2 - 21)
    body.setDrag(GameConfig.enemy.dummyDrag)
    body.setCollideWorldBounds(true)
    body.setBounce(0.35)
  }

  get hitRadius(): number {
    return 21
  }

  get isAlive(): boolean {
    return this.health > 0
  }

  takeDamage(amount: number, knockbackX: number, knockbackY: number): void {
    if (!this.isAlive) return

    this.health = Math.max(0, this.health - amount)
    this.setVelocity(knockbackX, knockbackY)

    if (this.health === 0) {
      this.fall()
    }
  }

  refresh(): void {
    const ratio = this.health / GameConfig.enemy.dummyMaxHealth
    this.healthBar.draw(this.x, this.y - this.height / 2 - 12, ratio)
  }

  private fall(): void {
    this.healthBar.setVisible(false)

    this.scene.tweens.add({
      targets: this,
      alpha: 0.18,
      angle: Phaser.Math.Between(-70, 70),
      duration: 220,
      ease: 'Quad.easeOut',
    })

    this.scene.time.delayedCall(1400, () => this.revive())
  }

  private revive(): void {
    if (!this.active) return

    this.health = GameConfig.enemy.dummyMaxHealth
    this.setPosition(this.homeX, this.homeY)
    this.setVelocity(0, 0)
    this.setAngle(0)
    this.setAlpha(1)
    this.healthBar.setVisible(true)
  }
}
