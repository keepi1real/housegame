import Phaser from 'phaser'

/**
 * Floating damage readout.
 *
 * Numbers rise and fade rather than sitting still, so overlapping hits stay
 * legible during a busy fight.
 */
export class DamageNumber {
  constructor(private readonly scene: Phaser.Scene) {}

  spawn(x: number, y: number, amount: number, emphatic: boolean): void {
    const label = this.scene.add.text(x, y, String(Math.round(amount)), {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: emphatic ? '26px' : '19px',
      color: emphatic ? '#ffd9a0' : '#f2ece0',
      stroke: '#120f16',
      strokeThickness: 4,
    })

    label.setOrigin(0.5, 0.5)
    label.setDepth(1000)

    const drift = Phaser.Math.Between(-16, 16)

    this.scene.tweens.add({
      targets: label,
      x: x + drift,
      y: y - (emphatic ? 54 : 40),
      alpha: 0,
      scale: emphatic ? 1.25 : 1,
      duration: emphatic ? 620 : 480,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }
}
