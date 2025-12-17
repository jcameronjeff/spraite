# Sprite Pipeline Documentation

The Spraite sprite pipeline automates the process of converting AI-generated images into game-ready texture atlases for Phaser. This document describes each stage of the pipeline.

## Pipeline Overview

```
[Generate] → [Validate] → [Slice] → [Pack] → [Phaser Atlas]
```

The pipeline takes sprite specifications as input and produces optimized texture atlases with JSON metadata for Phaser.

## Stage 1: Generate Sprite Strips

**Command**: `npm run sprite:generate`

### Purpose
Generate sprite strips from AI prompts based on specifications defined in `sprite-spec.json` files.

### Input
- Sprite specification files (JSON)
- AI generation parameters (model, style, dimensions)

### Output
- PNG sprite strips in `assets/generated/`
- Each strip contains multiple animation frames in a horizontal layout

### Process
1. Read sprite specifications from `tools/sprite-agent/`
2. Send prompts to AI image generation service
3. Request sprite strips with specified frame counts
4. Save generated images to `assets/generated/`

### Example Output
```
assets/generated/
├── character-idle-strip.png   (8 frames)
├── character-walk-strip.png   (12 frames)
└── character-attack-strip.png (6 frames)
```

## Stage 2: Validate True Alpha

**Command**: `npm run sprite:validate`

### Purpose
Verify that generated sprites have true alpha transparency (not just white/black backgrounds).

### Input
- Generated sprite strips from Stage 1

### Output
- Validation report (JSON)
- Pass/fail status for each sprite
- Alpha channel statistics

### Process
1. Load each generated sprite strip
2. Analyze alpha channel data
3. Check for true transparency (not fake transparency)
4. Detect common issues:
   - Solid backgrounds
   - Partial transparency where full is expected
   - Missing alpha channel
5. Generate validation report

### Validation Criteria
- ✅ True alpha channel present
- ✅ Background pixels are fully transparent (alpha = 0)
- ✅ Sprite pixels have appropriate opacity
- ❌ No solid color backgrounds masquerading as transparency
- ❌ No premultiplied alpha issues

### Example Report
```json
{
  "validated": "2025-12-17T12:34:10.000Z",
  "sprites": [
    {
      "file": "character-idle-strip.png",
      "status": "pass",
      "alphaChannelPresent": true,
      "transparentPixels": 65.4,
      "issues": []
    },
    {
      "file": "character-walk-strip.png",
      "status": "fail",
      "alphaChannelPresent": false,
      "issues": ["No alpha channel detected"]
    }
  ]
}
```

## Stage 3: Slice Sprite Strips

**Command**: `npm run sprite:slice`

### Purpose
Cut validated sprite strips into individual frame images.

### Input
- Validated sprite strips (from Stage 2)
- Frame count from sprite specifications

### Output
- Individual frame PNGs in `assets/generated/frames/`
- Organized by animation name

### Process
1. Read sprite specifications for frame counts
2. Calculate frame dimensions (width = stripWidth / frameCount)
3. Slice each strip into individual frames
4. Save frames with sequential naming

### Example Output
```
assets/generated/frames/
├── character-idle/
│   ├── frame-001.png
│   ├── frame-002.png
│   └── ... (8 frames)
├── character-walk/
│   ├── frame-001.png
│   ├── frame-002.png
│   └── ... (12 frames)
└── character-attack/
    └── ... (6 frames)
```

## Stage 4: Pack Texture Atlas

**Command**: `npm run sprite:pack`

### Purpose
Combine individual frames into optimized texture atlases with Phaser-compatible JSON metadata.

### Input
- Individual frame images (from Stage 3)
- Packing configuration (padding, max size, etc.)

### Output
- Texture atlas PNG files
- Phaser atlas JSON files
- Organized in `assets/generated/atlases/`

### Process
1. Collect all frames from Stage 3
2. Calculate optimal packing layout
3. Add padding between frames (prevent bleeding)
4. Generate texture atlas image
5. Create Phaser JSON metadata with:
   - Frame positions and dimensions
   - Animation definitions
   - Source image references

### Packing Algorithm
- **Bin packing**: Efficiently arrange frames to minimize atlas size
- **Power-of-two sizing**: Optimize for GPU texture handling
- **Padding**: 2px minimum between frames
- **Max atlas size**: 4096x4096 (configurable)

### Example Output
```
assets/generated/atlases/
├── character-sprites.png
├── character-sprites.json
└── metadata.json
```

### Phaser Atlas JSON Format
```json
{
  "frames": {
    "character-idle-001": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "sourceSize": { "w": 64, "h": 64 }
    },
    "character-idle-002": {
      "frame": { "x": 66, "y": 0, "w": 64, "h": 64 },
      "sourceSize": { "w": 64, "h": 64 }
    }
  },
  "animations": {
    "character-idle": {
      "frames": ["character-idle-001", "character-idle-002", "..."],
      "frameRate": 12
    }
  },
  "meta": {
    "image": "character-sprites.png",
    "format": "RGBA8888",
    "size": { "w": 1024, "h": 512 }
  }
}
```

## Stage 5: Phaser Integration

### Purpose
Load and use the generated atlases in Phaser games.

### Implementation

```javascript
// In your Phaser Scene preload()
this.load.atlas(
  'character',
  'assets/generated/atlases/character-sprites.png',
  'assets/generated/atlases/character-sprites.json'
);

// In your Phaser Scene create()
const sprite = this.add.sprite(400, 300, 'character', 'character-idle-001');

// Create animation
this.anims.create({
  key: 'idle',
  frames: this.anims.generateFrameNames('character', {
    prefix: 'character-idle-',
    start: 1,
    end: 8,
    zeroPad: 3
  }),
  frameRate: 12,
  repeat: -1
});

// Play animation
sprite.play('idle');
```

## Running the Complete Pipeline

To run all stages sequentially:

```bash
npm run sprite:pipeline
```

This executes:
1. Generate sprites from specifications
2. Validate alpha channels
3. Slice into individual frames
4. Pack into texture atlases
5. Output Phaser-ready assets

## Configuration

Pipeline behavior can be customized through configuration files:

- `tools/sprite-agent/sprite-spec.json` - Sprite generation specs
- `scripts/pipeline-config.json` - Pipeline settings (future)

## Troubleshooting

### Common Issues

**Issue**: Validation fails with "No alpha channel detected"
- **Solution**: Check AI generation settings, ensure PNG with alpha is requested

**Issue**: Frames have white/black backgrounds
- **Solution**: Update AI prompt to emphasize transparent backgrounds

**Issue**: Atlas packing fails
- **Solution**: Check frame dimensions, reduce max atlas size, or split into multiple atlases

**Issue**: Bleeding between frames in-game
- **Solution**: Increase padding in pack configuration

## Future Enhancements

- [ ] Support for multiple sprite sheets per atlas
- [ ] Automatic frame detection (no manual frame count needed)
- [ ] Real-time preview during generation
- [ ] Batch processing for multiple sprite sets
- [ ] Integration with popular AI image services
- [ ] GUI for sprite specification editing
- [ ] Hot-reload in development mode

## References

- [Phaser Texture Atlas Documentation](https://photonstorm.github.io/phaser3-docs/Phaser.Textures.TextureManager.html#addAtlas)
- [TexturePacker File Formats](https://www.codeandweb.com/texturepacker/documentation)
- [PNG Transparency Best Practices](https://en.wikipedia.org/wiki/Portable_Network_Graphics#Transparency)
