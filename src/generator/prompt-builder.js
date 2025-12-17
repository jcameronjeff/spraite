/**
 * Prompt builder for pixel art sprite generation
 * Constructs optimized prompts for GPT Image model
 */

import { config } from '../config.js';

/**
 * Animation-specific prompt enhancements
 */
const ANIMATION_PROMPTS = {
  idle: 'standing still with subtle breathing motion, slight bob up and down',
  walk: 'walking cycle, legs moving, arms swinging naturally',
  run: 'running cycle, dynamic leg and arm movement, leaning forward',
  jump: 'jumping sequence from crouch to airborne to landing',
  attack: 'attack swing motion, weapon or fist moving through arc',
  hurt: 'taking damage, flinching backward, pained expression',
  death: 'falling down sequence, collapsing to ground',
  cast: 'casting spell, arms raised, magical gesture',
  climb: 'climbing motion, alternating arm and leg reaches',
  swim: 'swimming stroke motion, arms and legs paddling',
};

/**
 * Builds a comprehensive prompt for sprite strip generation
 * @param {Object} spec - Sprite specification
 * @param {string} animationName - Name of the animation
 * @param {Object} animationConfig - Animation configuration
 * @returns {string} Complete prompt for image generation
 */
export function buildSpriteStripPrompt(spec, animationName, animationConfig) {
  const { character, frameWidth, frameHeight } = spec;
  const { frames } = animationConfig;

  const totalWidth = frameWidth * frames;
  const totalHeight = frameHeight;

  // Get animation-specific motion description
  const motionDescription = ANIMATION_PROMPTS[animationName.toLowerCase()]
    || `performing ${animationName} animation`;

  // Build the comprehensive prompt
  const prompt = `Create a horizontal sprite strip for a video game character:

CHARACTER: ${character.description}
${character.details ? `DETAILS: ${character.details}` : ''}

TECHNICAL REQUIREMENTS (CRITICAL):
- Exactly ${frames} frames arranged horizontally in a single row
- Each frame is exactly ${frameWidth}x${frameHeight} pixels
- Total image size: exactly ${totalWidth}x${totalHeight} pixels
- TRUE TRANSPARENT BACKGROUND - pure alpha transparency, NOT checkerboard, NOT solid color
- PNG format with RGBA channels

ART STYLE (STRICT):
- 16-bit era pixel art style (like SNES/Genesis games)
- Maximum ${config.style.maxColors} colors in palette
- Clean, crisp pixels with NO anti-aliasing, NO blur, NO smoothing
- Bold ${config.style.outlineWidth}px black outline around the character
- No dithering or gradient effects

ANIMATION: ${animationName.toUpperCase()}
- ${motionDescription}
- Character should be centered in each frame
- Consistent baseline/ground level across all frames
- Smooth progression from first frame to last frame
- Animation should loop seamlessly if applicable

COMPOSITION:
- Character faces right in all frames
- Each frame clearly separated (no overlap)
- Equal spacing between frames
- No background elements, props, or effects outside the character
- Pure transparent space around the character in each frame

This is for a 2D game engine - the transparency MUST be true alpha channel transparency.`;

  return prompt;
}

/**
 * Builds a prompt for a single animation frame (fallback method)
 * @param {Object} spec - Sprite specification
 * @param {string} animationName - Animation name
 * @param {number} frameIndex - Frame number in animation
 * @param {number} totalFrames - Total frames in animation
 * @returns {string} Prompt for single frame
 */
export function buildSingleFramePrompt(spec, animationName, frameIndex, totalFrames) {
  const { character, frameWidth, frameHeight } = spec;

  const motionDescription = ANIMATION_PROMPTS[animationName.toLowerCase()]
    || `performing ${animationName}`;

  // Determine frame position in animation cycle
  const progress = frameIndex / (totalFrames - 1);
  let phaseDescription = '';

  if (progress === 0) {
    phaseDescription = 'at the start of the motion';
  } else if (progress < 0.5) {
    phaseDescription = `early in the motion (${Math.round(progress * 100)}% through)`;
  } else if (progress < 1) {
    phaseDescription = `late in the motion (${Math.round(progress * 100)}% through)`;
  } else {
    phaseDescription = 'at the end of the motion';
  }

  return `Create a single pixel art game sprite frame:

CHARACTER: ${character.description}
${character.details ? `DETAILS: ${character.details}` : ''}

TECHNICAL REQUIREMENTS:
- Exactly ${frameWidth}x${frameHeight} pixels
- TRUE TRANSPARENT BACKGROUND (alpha = 0)
- PNG with RGBA channels

ART STYLE:
- 16-bit pixel art (SNES/Genesis era)
- Max ${config.style.maxColors} colors
- Clean pixels, NO anti-aliasing or blur
- ${config.style.outlineWidth}px black outline

ANIMATION: Frame ${frameIndex + 1} of ${totalFrames} - ${animationName}
- ${motionDescription}
- ${phaseDescription}
- Character faces right, centered in frame`;
}

/**
 * Validates a sprite specification
 * @param {Object} spec - Sprite specification to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateSpec(spec) {
  const errors = [];

  if (!spec.character?.description) {
    errors.push('character.description is required');
  }

  if (!spec.frameWidth || spec.frameWidth < 16 || spec.frameWidth > 256) {
    errors.push('frameWidth must be between 16 and 256');
  }

  if (!spec.frameHeight || spec.frameHeight < 16 || spec.frameHeight > 256) {
    errors.push('frameHeight must be between 16 and 256');
  }

  if (!spec.animations || Object.keys(spec.animations).length === 0) {
    errors.push('At least one animation is required');
  }

  // Validate each animation
  if (spec.animations) {
    for (const [name, anim] of Object.entries(spec.animations)) {
      if (!anim.frames || anim.frames < 1 || anim.frames > 16) {
        errors.push(`Animation '${name}': frames must be between 1 and 16`);
      }
      if (!anim.fps || anim.fps < 1 || anim.fps > 60) {
        errors.push(`Animation '${name}': fps must be between 1 and 60`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a default sprite specification
 * @param {string} characterDescription - Character description
 * @returns {Object} Default sprite specification
 */
export function createDefaultSpec(characterDescription) {
  return {
    name: 'character',
    character: {
      description: characterDescription,
      details: '',
    },
    frameWidth: 64,
    frameHeight: 64,
    animations: {
      idle: { frames: 4, fps: 8 },
      walk: { frames: 6, fps: 10 },
      run: { frames: 6, fps: 12 },
      jump: { frames: 4, fps: 10 },
      attack: { frames: 4, fps: 12 },
      hurt: { frames: 2, fps: 8 },
    },
  };
}

export default {
  buildSpriteStripPrompt,
  buildSingleFramePrompt,
  validateSpec,
  createDefaultSpec,
};
