import Phaser from 'phaser'
import { CharacterAnimation } from '../animation/CharacterAnimation'
import type { CharacterAnimationKey } from '../animation/CharacterAnimation'
import type {
  AnimationDefinition,
  CharacterSheetLayout,
} from '../animation/AnimationDefinition'

/** One frame's worth of pose, in the figure's own space with feet at the origin. */
interface FramePose {
  /** Vertical bounce of the upper body. Negative is up. */
  readonly bob: number
  /** Forward lean of the upper body. */
  readonly lean: number
  /** Blade angle in degrees. Zero points right, negative points up. */
  readonly bladeDegrees: number
  readonly bladeLength: number
  /** How far the pistol arm is thrust forward. */
  readonly pistolReach: number
  readonly muzzleFlash: number
  /** Whole-body rotation, used only when falling. */
  readonly tilt: number
  readonly sink: number
  readonly alpha: number
}

const NEUTRAL: FramePose = {
  bob: 0,
  lean: 0,
  bladeDegrees: 105,
  bladeLength: 20,
  pistolReach: 0,
  muzzleFlash: 0,
  tilt: 0,
  sink: 0,
  alpha: 1,
}

/**
 * Draws a stand-in character sheet in code, laid out exactly like the real one.
 *
 * This exists so the animation pipeline can be built and verified before any 3D
 * asset arrives. It deliberately mimics the intended look, a near-black figure
 * separated from the background by a bright rim, so that readability is being
 * tested and not just motion. Replaced wholesale by Blender renders later.
 */
export class PlaceholderWardenSheet {
  private static readonly COAT = 0x272231
  private static readonly RIM = 0xe0a458
  private static readonly MASK = 0xd9d1c2
  private static readonly STEEL = 0xb9c2d4

  static generate(
    scene: Phaser.Scene,
    layout: CharacterSheetLayout,
    definitions: readonly AnimationDefinition[],
  ): void {
    const rows = definitions.reduce((max, d) => Math.max(max, d.row + 1), 0)
    const graphics = scene.add.graphics()

    for (const definition of definitions) {
      for (let frame = 0; frame < definition.frames; frame++) {
        const originX = frame * layout.frameWidth
        const originY = definition.row * layout.frameHeight
        const pose = this.poseFor(definition.key, frame, definition.frames)
        this.drawFigure(graphics, originX, originY, layout, pose)
      }
    }

    const sourceKey = `${layout.textureKey}-source`
    graphics.generateTexture(
      sourceKey,
      layout.columns * layout.frameWidth,
      rows * layout.frameHeight,
    )
    graphics.destroy()

    const source = scene.textures.get(sourceKey).getSourceImage()
    scene.textures.addSpriteSheet(layout.textureKey, source as HTMLImageElement, {
      frameWidth: layout.frameWidth,
      frameHeight: layout.frameHeight,
    })
  }

  /** Progress through an animation, from 0 on the first frame to 1 on the last. */
  private static progress(frame: number, total: number): number {
    return total <= 1 ? 0 : frame / (total - 1)
  }

  private static poseFor(
    key: CharacterAnimationKey,
    frame: number,
    total: number,
  ): FramePose {
    const t = this.progress(frame, total)

    switch (key) {
      case CharacterAnimation.Idle:
        return { ...NEUTRAL, bob: Math.sin(t * Math.PI * 2) * 1.5 }

      case CharacterAnimation.Run:
        return {
          ...NEUTRAL,
          bob: -Math.abs(Math.sin(t * Math.PI * 2)) * 3,
          lean: 3,
          bladeDegrees: 140,
        }

      case CharacterAnimation.Dash:
        return {
          ...NEUTRAL,
          lean: 7,
          bob: -2,
          bladeDegrees: 160,
          bladeLength: 22,
        }

      // The three light swings each sweep the blade through a different arc, so
      // the combo reads as escalating rather than repeating.
      case CharacterAnimation.Light1:
        return {
          ...NEUTRAL,
          lean: 1 + t * 4,
          bladeDegrees: -130 + t * 125,
          bladeLength: 24,
        }

      case CharacterAnimation.Light2:
        return {
          ...NEUTRAL,
          lean: 1 + t * 4,
          bladeDegrees: 70 - t * 115,
          bladeLength: 24,
        }

      case CharacterAnimation.Light3:
        return {
          ...NEUTRAL,
          lean: -2 + t * 9,
          bob: -t * 2,
          bladeDegrees: -160 + t * 210,
          bladeLength: 28,
        }

      case CharacterAnimation.Heavy: {
        // First half winds up backwards, second half commits forward.
        const windup = t < 0.5
        const local = windup ? t / 0.5 : (t - 0.5) / 0.5
        return {
          ...NEUTRAL,
          lean: windup ? -local * 5 : -5 + local * 13,
          bob: windup ? local * 2 : 2 - local * 4,
          bladeDegrees: windup ? 120 + local * 60 : 180 - local * 145,
          bladeLength: 30,
        }
      }

      case CharacterAnimation.Shoot:
        return {
          ...NEUTRAL,
          lean: -1,
          bladeDegrees: 120,
          pistolReach: Math.min(1, t * 2.5) * 7,
          muzzleFlash: frame === 1 ? 5 : frame === 2 ? 2.5 : 0,
        }

      case CharacterAnimation.Hurt:
        return { ...NEUTRAL, lean: -5, bob: -1, bladeDegrees: 130 }

      case CharacterAnimation.Death:
        return {
          ...NEUTRAL,
          tilt: t * 82,
          sink: t * 4,
          bladeDegrees: 120 - t * 40,
          alpha: 1 - t * 0.55,
        }

      default:
        return NEUTRAL
    }
  }

  private static drawFigure(
    g: Phaser.GameObjects.Graphics,
    originX: number,
    originY: number,
    layout: CharacterSheetLayout,
    pose: FramePose,
  ): void {
    g.save()
    g.translateCanvas(originX + layout.frameWidth / 2, originY + 56 + pose.sink)
    g.rotateCanvas(Phaser.Math.DegToRad(pose.tilt))
    g.setAlpha(pose.alpha)

    // Rim pass: the same silhouette offset up and left, in the accent colour.
    // Everything drawn after it covers all but a bright edge.
    this.drawSilhouette(g, pose, this.RIM, -2, -2)
    this.drawSilhouette(g, pose, this.COAT, 0, 0)

    this.drawMask(g, pose)
    this.drawBlade(g, pose)
    this.drawPistol(g, pose)

    g.setAlpha(1)
    g.restore()
  }

  private static drawSilhouette(
    g: Phaser.GameObjects.Graphics,
    pose: FramePose,
    colour: number,
    dx: number,
    dy: number,
  ): void {
    const lean = pose.lean
    const bob = pose.bob

    g.fillStyle(colour, 1)
    // Legs stay planted while the coat above them leans and bounces.
    g.fillRect(dx - 6, dy - 16, 4, 16)
    g.fillRect(dx + 2, dy - 16, 4, 16)
    g.fillRoundedRect(dx - 9 + lean, dy - 36 + bob, 18, 22, 5)
    g.fillTriangle(
      dx + lean,
      dy - 50 + bob,
      dx - 9 + lean,
      dy - 33 + bob,
      dx + 9 + lean,
      dy - 33 + bob,
    )
  }

  private static drawMask(
    g: Phaser.GameObjects.Graphics,
    pose: FramePose,
  ): void {
    g.fillStyle(this.MASK, 1)
    g.fillCircle(pose.lean, -39 + pose.bob, 3.4)
  }

  private static drawBlade(
    g: Phaser.GameObjects.Graphics,
    pose: FramePose,
  ): void {
    const handX = 7 + pose.lean
    const handY = -27 + pose.bob
    const radians = Phaser.Math.DegToRad(pose.bladeDegrees)
    const tipX = handX + Math.cos(radians) * pose.bladeLength
    const tipY = handY + Math.sin(radians) * pose.bladeLength

    // Rusted base, polished tip: two segments rather than one flat line.
    g.lineStyle(3, 0x6b5a4a, 1)
    g.lineBetween(handX, handY, handX + (tipX - handX) * 0.3, handY + (tipY - handY) * 0.3)
    g.lineStyle(2.5, this.STEEL, 1)
    g.lineBetween(handX + (tipX - handX) * 0.3, handY + (tipY - handY) * 0.3, tipX, tipY)
  }

  private static drawPistol(
    g: Phaser.GameObjects.Graphics,
    pose: FramePose,
  ): void {
    const handX = -6 + pose.lean - pose.pistolReach
    const handY = -29 + pose.bob

    g.fillStyle(0x4a3f3a, 1)
    g.fillRect(handX - 7, handY - 2, 9, 4)
    g.fillRect(handX - 1, handY, 3, 5)

    if (pose.muzzleFlash > 0) {
      g.fillStyle(0xffd9a0, 0.9)
      g.fillCircle(handX - 9, handY, pose.muzzleFlash)
    }
  }
}
