import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Sprite assets will be loaded here
    // Example: this.load.atlas('sprites', 'assets/sprites.png', 'assets/sprites.json');
  }

  create() {
    // Add welcome text
    this.add.text(400, 300, 'Spraite - AI Sprite Generator', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(400, 350, 'Ready for sprite generation!', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
  }

  update() {
    // Game loop logic here
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

const game = new Phaser.Game(config);
