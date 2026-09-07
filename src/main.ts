import Phaser from 'phaser'
import { GameConfig } from './config/GameConfig'
import { BootScene } from './scenes/BootScene'
import { ArenaScene } from './scenes/ArenaScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GameConfig.view.width,
  height: GameConfig.view.height,
  backgroundColor: GameConfig.view.backgroundColor,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene, ArenaScene],
}

const game = new Phaser.Game(config)

// Development handle for inspecting live state from the browser console.
// Stripped from production builds by the bundler.
if (import.meta.env.DEV) {
  ;(window as unknown as { game: Phaser.Game }).game = game
}
