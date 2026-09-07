/**
 * Single source of truth for every tunable number in the game.
 *
 * Combat feel is iterated by editing values here, never by editing entity code.
 * Keeping them in one place is what makes the "juice" pass fast.
 */
export const GameConfig = {
  view: {
    // Sized so the Warden, rendered at ~130px tall per ART_PIPELINE.md, occupies
    // roughly 18% of screen height. That is the proportion Hades uses, and it is
    // what keeps a detailed character readable without crowding the arena.
    width: 1280,
    height: 720,
    backgroundColor: '#0a090c',
  },

  player: {
    /**
     * Spatial values are tied to the character's on-screen size. The Warden is
     * about 106px tall in a 720px view, so a reach of roughly one body height
     * is what makes a swing look like it connects with what it hits.
     */
    maxSpeed: 330,
    acceleration: 3200,
    drag: 2000,
    radius: 24,
    maxHealth: 100,
  },

  dash: {
    speed: 1150,
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
    range: 116,
    arcDegrees: 110,
    damage: [9, 9, 16],
    knockback: [280, 280, 580],
    /** Forward lunge applied on each swing. */
    lungeSpeed: [230, 255, 410],
    /**
     * The swing arc is drawn this far above the character's ground position.
     * Negative is up. Without it the arc would sweep around the ankles.
     */
    arcHeightOffset: -44,
  },

  heavy: {
    chargeMs: 520,
    activeMs: 90,
    recoveryMs: 240,
    range: 144,
    arcDegrees: 150,
    damage: 34,
    knockback: 780,
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
    dummyHitRadius: 34,
    dummyDrag: 900,
  },
} as const
