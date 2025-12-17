# Sprite Agent

The Sprite Agent is a tool for generating AI-powered sprite animations with automatic validation and processing.

## Overview

The Sprite Agent orchestrates the entire sprite generation pipeline, from AI prompt to game-ready texture atlas. It uses sprite specification files to define what sprites to generate and how to process them.

## Sprite Specification Format

Sprite specifications are defined in JSON files that describe the sprites to generate, their properties, and pipeline settings.

### Example Specification

See `sprite-spec.example.json` for a complete example. Copy this file to `sprite-spec.json` and customize it for your project:

```bash
cp sprite-spec.example.json sprite-spec.json
```

### Specification Structure

```json
{
  "version": "1.0",
  "sprites": [...],      // Array of sprite definitions
  "settings": {...},     // AI generation settings
  "pipeline": {...}      // Pipeline configuration
}
```

### Sprite Definition

Each sprite in the `sprites` array includes:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier for the sprite |
| `description` | string | Human-readable description |
| `prompt` | string | AI generation prompt |
| `frames` | number | Number of frames in the animation |
| `frameWidth` | number | Width of each frame in pixels |
| `frameHeight` | number | Height of each frame in pixels |
| `frameRate` | number | Playback speed (frames per second) |
| `tags` | array | Classification tags |

### Generation Settings

Configure AI generation parameters:

| Field | Type | Description |
|-------|------|-------------|
| `outputFormat` | string | Image format (png, webp) |
| `alphaChannel` | boolean | Include alpha transparency |
| `backgroundColor` | string | Background color or "transparent" |
| `aiModel` | string | AI model to use |
| `quality` | string | Output quality (low, medium, high) |
| `seed` | number/null | Random seed for reproducibility |

### Pipeline Settings

Control pipeline behavior:

```json
{
  "validate": {
    "enabled": true,
    "minTransparency": 0.3,
    "requireTrueAlpha": true
  },
  "slice": {
    "enabled": true,
    "padding": 0
  },
  "pack": {
    "enabled": true,
    "padding": 2,
    "maxAtlasSize": 4096,
    "powerOfTwo": true,
    "format": "phaser3"
  }
}
```

## Usage

### Generate Sprites

Generate all sprites defined in your specification:

```bash
npm run sprite:generate
```

This will:
1. Read sprite specifications
2. Send prompts to AI service
3. Download generated sprite strips
4. Save to `assets/generated/`

### Validate Sprites

Check that generated sprites have proper alpha transparency:

```bash
npm run sprite:validate
```

This will:
1. Analyze each sprite's alpha channel
2. Detect transparency issues
3. Generate validation report
4. Exit with error if validation fails

### Process Sprites

Slice and pack sprites into atlases:

```bash
npm run sprite:slice
npm run sprite:pack
```

Or run the complete pipeline:

```bash
npm run sprite:pipeline
```

## Best Practices

### Writing Effective Prompts

1. **Be specific about style**: "pixel art", "hand-drawn", "3D rendered"
2. **Specify transparency**: Always include "transparent background"
3. **Define dimensions**: "64x64 pixels per frame"
4. **Describe motion**: "smooth walk cycle", "dynamic action"
5. **Set the view**: "side view", "top-down", "isometric"
6. **Include context**: "fantasy RPG style", "sci-fi theme"

### Example Prompts

**Good prompts:**
```
"pixel art warrior idle stance, transparent background, 8 frames,
64x64 per frame, side view, medieval fantasy style, subtle breathing motion"

"hand-drawn explosion effect, transparent background, 12 frames,
128x128 per frame, dynamic expanding blast, bright orange and yellow"
```

**Poor prompts:**
```
"character" (too vague)
"walking person with background" (no transparency specified)
"animation" (missing all key details)
```

### Frame Count Guidelines

| Animation Type | Typical Frames |
|---------------|----------------|
| Idle | 4-8 |
| Walk/Run | 8-12 |
| Attack | 4-8 |
| Special Move | 10-16 |
| Death | 6-10 |
| Effects | 8-16 |

### Performance Considerations

- Keep frame dimensions reasonable (32x32 to 128x128 for most sprites)
- Limit total atlas size to 4096x4096 or less
- Use power-of-two dimensions for better GPU performance
- Group related sprites in the same atlas
- Add 2px padding to prevent texture bleeding

## Troubleshooting

### Issue: AI service returns error

**Check:**
- API credentials are configured
- Prompt follows service guidelines
- Requested dimensions are supported

### Issue: Sprites have white backgrounds

**Solution:**
- Emphasize "transparent background" in prompt
- Check AI service supports alpha channel
- Try different model or service

### Issue: Validation fails

**Solution:**
- Regenerate with explicit transparency request
- Manually edit in image editor to add alpha
- Adjust validation thresholds in pipeline config

### Issue: Packed atlas is too large

**Solution:**
- Reduce frame dimensions
- Split sprites into multiple atlases
- Lower maxAtlasSize in config
- Use compression

## Advanced Usage

### Multiple Specification Files

You can maintain multiple specification files for different sprite sets:

```bash
tools/sprite-agent/
├── sprite-spec.example.json
├── characters.json
├── enemies.json
├── effects.json
└── environment.json
```

Specify which file to use:

```bash
node scripts/generate-sprites.js --spec tools/sprite-agent/characters.json
```

### Custom Pipeline

Run individual stages with custom options:

```bash
# Generate specific sprite
node scripts/generate-sprites.js --name character-idle

# Validate with custom threshold
node scripts/validate-sprites.js --min-alpha 0.5

# Pack with custom settings
node scripts/pack-sprites.js --max-size 2048 --padding 4
```

## Future Features

- [ ] GUI editor for sprite specifications
- [ ] Real-time preview during generation
- [ ] Batch generation queue
- [ ] Version control for generated assets
- [ ] Integration with multiple AI services
- [ ] Automatic prompt optimization
- [ ] Cost estimation before generation
- [ ] A/B testing for different prompts

## Resources

- [Main Documentation](../../README.md)
- [Sprite Pipeline Details](../../docs/sprite-pipeline.md)
- [Phaser Atlas Format](https://photonstorm.github.io/phaser3-docs/Phaser.Textures.TextureManager.html)

## Support

For issues and questions, please refer to the main project documentation or open an issue on the repository.
