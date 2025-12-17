# Spraite

AI-powered pixel art sprite generation agent for Phaser games.

Spraite generates 16-bit era pixel art character sprites using OpenAI's GPT Image API, then validates, slices, and packs them into Phaser-compatible texture atlases.

## Features

- **AI Image Generation**: Uses GPT Image 1.5 for high-quality pixel art generation
- **Smart Prompting**: Optimized prompts for consistent 16-bit era pixel art style
- **Validation Gates**: Ensures PNG format, RGBA channels, true alpha transparency
- **Automatic Retry**: Retries generation if validation fails
- **Strip-based Generation**: Generates small animation strips (4-8 frames) for consistency
- **Deterministic Packing**: Packs frames into optimized texture atlases
- **Phaser Compatible**: Outputs Phaser JSON (hash) format atlases

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Add your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
```

## Usage

### Generate Sprites

```bash
# Generate from a specification file
npm run generate -- specs/example-pirate.json

# Or using npx
npx spraite generate specs/example-pirate.json

# With options
npx spraite generate specs/example-pirate.json --output ./my-assets --verbose
```

### Create a New Specification

```bash
# Create a basic spec
npx spraite init mycharacter --description "A brave hero with a sword"

# This creates specs/mycharacter.json
```

### Validate a Specification

```bash
npx spraite validate specs/example-pirate.json
```

### List Available Specs

```bash
npx spraite list
```

## Specification Format

Create a JSON file describing your character:

```json
{
  "name": "pirate",
  "character": {
    "description": "A cartoon pirate captain with a tricorn hat, eyepatch, and cutlass",
    "details": "Blue coat with gold buttons, brown boots, red sash"
  },
  "frameWidth": 64,
  "frameHeight": 64,
  "animations": {
    "idle": { "frames": 4, "fps": 8 },
    "walk": { "frames": 6, "fps": 10 },
    "run": { "frames": 6, "fps": 12 },
    "attack": { "frames": 4, "fps": 12 },
    "hurt": { "frames": 2, "fps": 8 }
  }
}
```

### Specification Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Character name (used for output filenames) |
| `character.description` | string | Main character description for AI |
| `character.details` | string | Additional visual details |
| `frameWidth` | number | Width of each frame (16-256) |
| `frameHeight` | number | Height of each frame (16-256) |
| `animations` | object | Animation definitions |
| `animations.<name>.frames` | number | Number of frames (1-16) |
| `animations.<name>.fps` | number | Playback speed (1-60) |

### Supported Animations

The following animation names have optimized prompts:

- `idle` - Standing still with subtle motion
- `walk` - Walking cycle
- `run` - Running cycle
- `jump` - Jump sequence
- `attack` - Attack swing
- `hurt` - Taking damage
- `death` - Falling/dying
- `cast` - Casting spell
- `climb` - Climbing motion
- `swim` - Swimming stroke

## Output

Generated assets are saved to `assets/generated/<character>/`:

```
assets/generated/pirate/
├── pirate.png        # Packed sprite sheet
├── pirate.json       # Phaser JSON atlas (hash format)
├── animations.json   # Animation definitions (fps, frames)
└── strip_*.png       # Individual animation strips (debug)
```

### Using in Phaser

```javascript
// Load the atlas
this.load.atlas('pirate', 'assets/pirate.png', 'assets/pirate.json');

// Create animations from the atlas
const animData = await fetch('assets/animations.json').then(r => r.json());

for (const [name, config] of Object.entries(animData)) {
  this.anims.create({
    key: `pirate_${name}`,
    frames: config.frames.map(f => ({ key: 'pirate', frame: f.key })),
    frameRate: config.fps,
    repeat: config.loop ? -1 : 0
  });
}

// Use the sprite
const player = this.add.sprite(100, 100, 'pirate');
player.play('pirate_idle');
```

## Art Style Constraints

All generated sprites follow these rules:

- **16-bit era pixel art** (SNES/Genesis style)
- **Maximum 16-color palette**
- **Clean pixels** - no anti-aliasing or blur
- **1px black outline** around characters
- **True transparent background** (RGBA alpha = 0)
- **Consistent baseline** across all frames

## Validation Gates

Every generated image must pass:

1. **Format**: PNG only
2. **Channels**: 4 (RGBA)
3. **Alpha**: Alpha channel present
4. **Transparency**: Border pixels have alpha = 0
5. **Dimensions**: Match specification exactly

Failed validations trigger automatic retry with adjusted prompts.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `MAX_RETRIES` | 3 | Max generation retries |
| `RETRY_DELAY_MS` | 2000 | Delay between retries |
| `OUTPUT_DIR` | assets/generated | Output directory |

## Project Structure

```
spraite/
├── src/
│   ├── cli.js              # CLI entry point
│   ├── index.js            # Main orchestrator
│   ├── config.js           # Configuration
│   ├── generator/
│   │   ├── openai-client.js    # OpenAI API wrapper
│   │   └── prompt-builder.js   # Prompt construction
│   ├── validator/
│   │   └── png-validator.js    # PNG/alpha validation
│   ├── processor/
│   │   ├── slicer.js          # Sprite strip slicer
│   │   └── packer.js          # Atlas packer
│   └── utils/
│       ├── logger.js          # Logging
│       └── file-utils.js      # File operations
├── specs/                  # Example specifications
├── assets/generated/       # Output directory
└── package.json
```

## License

MIT
