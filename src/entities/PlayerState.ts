/** Mutually exclusive states of the player character's action machine. */
export enum PlayerState {
  /** Free movement. The only state that accepts new attack input. */
  Free = 'free',
  Dashing = 'dashing',
  LightSwing = 'light-swing',
  HeavyCharge = 'heavy-charge',
  HeavySwing = 'heavy-swing',
}
