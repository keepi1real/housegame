import Phaser from 'phaser'
import type { InputIntent } from './InputIntent'

/**
 * Reads keyboard, mouse and gamepad, and reduces them to a single InputIntent.
 *
 * Button presses are latched from events rather than sampled from held state.
 * Polling `leftButtonDown()` once per frame silently drops any press that both
 * starts and ends between two frames, which turns fast inputs into missed
 * attacks. Latching guarantees every press is seen exactly once.
 *
 * Touch controls will be added here as a third source. Nothing outside this
 * class needs to change when that happens.
 */
export class InputController {
  private readonly move = new Phaser.Math.Vector2()
  private readonly aim = new Phaser.Math.Vector2(1, 0)
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>

  /** Set by events, consumed once by the next update(). */
  private pendingLight = false
  private pendingDash = false
  private pendingHeavyRelease = false

  private lightPressed = false
  private heavyHeld = false
  private heavyReleased = false
  private dashPressed = false

  private padLightWasDown = false
  private padDashWasDown = false

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in this scene')
    }

    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>

    // Right click drives the heavy attack, so the browser menu must not open.
    scene.input.mouse?.disableContextMenu()

    scene.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown()) {
          this.pendingLight = true
        }
      },
    )

    scene.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonReleased()) {
          this.pendingHeavyRelease = true
        }
      },
    )

    keyboard.on('keydown-SPACE', () => {
      this.pendingDash = true
    })
  }

  /**
   * Recomputes the intent. Must be called once per frame before entities update.
   *
   * @param originX world x the aim vector originates from
   * @param originY world y the aim vector originates from
   */
  update(originX: number, originY: number): void {
    const pad = this.scene.input.gamepad?.getPad(0)

    this.readMove(pad)
    this.readAim(pad, originX, originY)
    this.readButtons(pad)
  }

  get intent(): InputIntent {
    return {
      move: this.move,
      aim: this.aim,
      lightPressed: this.lightPressed,
      heavyHeld: this.heavyHeld,
      heavyReleased: this.heavyReleased,
      dashPressed: this.dashPressed,
    }
  }

  private readMove(pad: Phaser.Input.Gamepad.Gamepad | undefined): void {
    let x = 0
    let y = 0

    if (this.keys.left?.isDown) x -= 1
    if (this.keys.right?.isDown) x += 1
    if (this.keys.up?.isDown) y -= 1
    if (this.keys.down?.isDown) y += 1

    if (pad) {
      const stick = pad.leftStick
      if (stick.length() > 0.2) {
        x = stick.x
        y = stick.y
      }
    }

    this.move.set(x, y)
    if (this.move.lengthSq() > 1) {
      this.move.normalize()
    }
  }

  private readAim(
    pad: Phaser.Input.Gamepad.Gamepad | undefined,
    originX: number,
    originY: number,
  ): void {
    const stick = pad?.rightStick
    if (stick && stick.length() > 0.25) {
      this.aim.set(stick.x, stick.y).normalize()
      return
    }

    const pointer = this.scene.input.activePointer
    const dx = pointer.worldX - originX
    const dy = pointer.worldY - originY

    if (dx !== 0 || dy !== 0) {
      this.aim.set(dx, dy).normalize()
      return
    }

    // Fall back to movement direction so the character never faces nowhere.
    if (this.move.lengthSq() > 0) {
      this.aim.copy(this.move).normalize()
    }
  }

  private readButtons(pad: Phaser.Input.Gamepad.Gamepad | undefined): void {
    const padLight = pad?.X ?? false
    const padDash = pad?.A ?? false

    this.lightPressed = this.pendingLight || (padLight && !this.padLightWasDown)
    this.dashPressed = this.pendingDash || (padDash && !this.padDashWasDown)

    this.padLightWasDown = padLight
    this.padDashWasDown = padDash

    this.pendingLight = false
    this.pendingDash = false

    const heavyDown =
      this.scene.input.activePointer.rightButtonDown() || (pad?.Y ?? false)

    this.heavyReleased = this.pendingHeavyRelease || (!heavyDown && this.heavyHeld)
    this.pendingHeavyRelease = false
    this.heavyHeld = heavyDown
  }
}
