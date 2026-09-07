/**
 * Single source of truth for every tunable number in the game.
 *
 * Combat feel is iterated by editing values here, never by editing entity code.
 * Keeping them in one place is what makes the "juice" pass fast.
 */
export const GameConfig = {
  view: {
    width: 960,
    height: 540,
    backgroundColor: '#0a090c',
  },

  player: {
    maxSpeed: 260,
    acceleration: 2600,
    drag: 2000,
    radius: 14,
    maxHealth: 100,
  },

  dash: {
    speed: 900,
    durationMs: 140,
    cooldownMs: 320,
    invulnerableMs: 160,
    /** Stretch along travel axis while dashing. */
    stretch: 1.35,
    squash: 0.72,
  },

  attack: {
    /** Frames of the three-hit light combo. */
    windupMs: 55,
    activeMs: 70,
    recoveryMs: 120,
    /** Time after a swing during which the next input continues the combo. */
    comboWindowMs: 420,
    range: 78,
    arcDegrees: 110,
    damage: [9, 9, 16],
    knockback: [220, 220, 460],
    /** Forward lunge applied on each swing. */
    lungeSpeed: [180, 200, 320],
  },

  heavy: {
    chargeMs: 520,
    activeMs: 90,
    recoveryMs: 240,
    range: 96,
    arcDegrees: 150,
    damage: 34,
    knockback: 620,
  },

  feedback: {
    hitstopLightMs: 55,
    hitstopHeavyMs: 110,
    shakeLight: 0.004,
    shakeHeavy: 0.011,
    shakeDurationMs: 110,
    flashMs: 70,
  },

  enemy: {
    dummyMaxHealth: 120,
    dummyDrag: 900,
  },
} as const
