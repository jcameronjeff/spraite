# Spraite

**AI Game Sprite Generation with Phaser**

Spraite is a toolkit for generating, processing, and integrating AI-generated sprites into Phaser games. It provides a complete pipeline from sprite generation to game-ready texture atlases.

## Features

- 🎨 AI-powered sprite generation
- 🔍 Alpha channel validation
- ✂️ Automatic sprite slicing
- 📦 Texture atlas packing
- 🎮 Phaser integration

## Project Structure

```
spraite/
├── src/              # Phaser game source code
│   ├── index.html    # Main HTML entry point
│   └── main.js       # Phaser game configuration
├── assets/           # Game assets
│   └── generated/    # AI-generated sprites (output)
├── tools/            # Development tools
│   └── sprite-agent/ # Sprite generation agent
├── docs/             # Documentation
├── scripts/          # Build and automation scripts
└── package.json      # Project dependencies
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173` to see the game.

### Building

```bash
npm run build
```

## Sprite Pipeline

The sprite generation pipeline consists of several stages:

1. **Generate** - Create sprite strips using AI
2. **Validate** - Verify true alpha channels exist
3. **Slice** - Cut strips into individual frames
4. **Pack** - Create optimized texture atlases
5. **Integrate** - Load into Phaser

See [docs/sprite-pipeline.md](docs/sprite-pipeline.md) for detailed information.

## Available Scripts

- `npm start` - Start development server (alias for dev)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run sprite:generate` - Generate sprites from specifications
- `npm run sprite:validate` - Validate sprite alpha channels
- `npm run sprite:slice` - Slice sprite strips into frames
- `npm run sprite:pack` - Pack sprites into texture atlases
- `npm run sprite:pipeline` - Run complete sprite pipeline

## Documentation

- [Sprite Pipeline](docs/sprite-pipeline.md) - Detailed sprite processing workflow
- [Tools Documentation](tools/sprite-agent/README.md) - Sprite agent usage guide

## License

MIT
