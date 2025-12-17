/**
 * Deterministic atlas packer for Phaser
 * Packs frames into a sprite sheet and generates Phaser-compatible JSON atlas
 */

import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * Frame metadata for atlas
 * @typedef {Object} FrameData
 * @property {string} name - Frame name (animation_frameIndex)
 * @property {Buffer} buffer - Frame image buffer
 * @property {number} width - Frame width
 * @property {number} height - Frame height
 * @property {string} animation - Animation name
 * @property {number} frameIndex - Index within animation
 */

/**
 * Atlas packing result
 * @typedef {Object} AtlasResult
 * @property {Buffer} image - Packed sprite sheet PNG
 * @property {Object} atlas - Phaser JSON atlas (hash format)
 * @property {Object} animations - Animation definitions
 */

/**
 * Packs frames into a sprite sheet with Phaser atlas metadata
 * Uses a simple row-based packing algorithm (deterministic)
 * @param {FrameData[]} frames - Array of frames to pack
 * @param {Object} options - Packing options
 * @param {number} options.padding - Padding between frames (default: 1)
 * @param {number} options.maxWidth - Maximum sheet width (default: 2048)
 * @param {boolean} options.powerOfTwo - Force power-of-two dimensions (default: false)
 * @returns {Promise<AtlasResult>} Packed atlas result
 */
export async function packFrames(frames, options = {}) {
  const {
    padding = 1,
    maxWidth = 2048,
    powerOfTwo = false,
  } = options;

  if (frames.length === 0) {
    throw new Error('No frames to pack');
  }

  // Sort frames by height (tallest first) for better packing
  const sortedFrames = [...frames].sort((a, b) => b.height - a.height);

  // Calculate layout using row-based packing
  const layout = calculateLayout(sortedFrames, padding, maxWidth);

  // Adjust to power of two if needed
  let { width, height } = layout;
  if (powerOfTwo) {
    width = nextPowerOfTwo(width);
    height = nextPowerOfTwo(height);
  }

  logger.info(`Packing ${frames.length} frames into ${width}x${height} sheet`);

  // Create the composite image
  const composites = layout.positions.map((pos, i) => ({
    input: sortedFrames[i].buffer,
    left: pos.x,
    top: pos.y,
  }));

  const sheetBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Generate Phaser atlas JSON (hash format)
  const atlas = generatePhaserAtlas(sortedFrames, layout.positions, { width, height });

  // Generate animations metadata
  const animations = generateAnimationsJson(frames);

  return {
    image: sheetBuffer,
    atlas,
    animations,
  };
}

/**
 * Calculates deterministic layout positions using row-based packing
 * @param {FrameData[]} frames - Sorted frames
 * @param {number} padding - Padding between frames
 * @param {number} maxWidth - Maximum row width
 * @returns {Object} Layout with positions and dimensions
 */
function calculateLayout(frames, padding, maxWidth) {
  const positions = [];
  let currentX = padding;
  let currentY = padding;
  let rowHeight = 0;
  let sheetWidth = 0;
  let sheetHeight = 0;

  for (const frame of frames) {
    // Check if frame fits in current row
    if (currentX + frame.width + padding > maxWidth) {
      // Move to next row
      currentX = padding;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    positions.push({
      x: currentX,
      y: currentY,
    });

    // Update tracking
    currentX += frame.width + padding;
    rowHeight = Math.max(rowHeight, frame.height);
    sheetWidth = Math.max(sheetWidth, currentX);
    sheetHeight = Math.max(sheetHeight, currentY + rowHeight + padding);
  }

  return {
    positions,
    width: sheetWidth,
    height: sheetHeight,
  };
}

/**
 * Generates Phaser JSON atlas in hash format
 * @param {FrameData[]} frames - Frame data
 * @param {Object[]} positions - Frame positions
 * @param {Object} size - Sheet dimensions
 * @returns {Object} Phaser atlas JSON
 */
function generatePhaserAtlas(frames, positions, size) {
  const atlas = {
    frames: {},
    meta: {
      app: 'spraite',
      version: '1.0.0',
      image: '', // Will be set by caller
      format: 'RGBA8888',
      size: {
        w: size.width,
        h: size.height,
      },
      scale: '1',
    },
  };

  // Add each frame to the atlas
  frames.forEach((frame, i) => {
    const frameName = frame.name || `${frame.animation}_${frame.frameIndex}`;

    atlas.frames[frameName] = {
      frame: {
        x: positions[i].x,
        y: positions[i].y,
        w: frame.width,
        h: frame.height,
      },
      rotated: false,
      trimmed: false,
      spriteSourceSize: {
        x: 0,
        y: 0,
        w: frame.width,
        h: frame.height,
      },
      sourceSize: {
        w: frame.width,
        h: frame.height,
      },
    };
  });

  return atlas;
}

/**
 * Generates animation definitions JSON
 * @param {FrameData[]} frames - Frame data with animation info
 * @returns {Object} Animation definitions
 */
function generateAnimationsJson(frames) {
  const animations = {};

  // Group frames by animation
  for (const frame of frames) {
    const animName = frame.animation;
    if (!animName) continue;

    if (!animations[animName]) {
      animations[animName] = {
        fps: frame.fps || 10,
        frames: [],
        loop: true,
      };
    }

    animations[animName].frames.push({
      key: frame.name || `${frame.animation}_${frame.frameIndex}`,
      frame: frame.frameIndex,
    });
  }

  // Sort frames within each animation by index
  for (const anim of Object.values(animations)) {
    anim.frames.sort((a, b) => a.frame - b.frame);
  }

  return animations;
}

/**
 * Calculates next power of two
 * @param {number} n - Input number
 * @returns {number} Next power of two >= n
 */
function nextPowerOfTwo(n) {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Creates a simple grid-based atlas (fixed cell size)
 * @param {FrameData[]} frames - Frames to pack
 * @param {number} frameWidth - Uniform frame width
 * @param {number} frameHeight - Uniform frame height
 * @param {number} columns - Number of columns
 * @returns {Promise<AtlasResult>} Packed atlas result
 */
export async function packGrid(frames, frameWidth, frameHeight, columns) {
  const rows = Math.ceil(frames.length / columns);
  const width = frameWidth * columns;
  const height = frameHeight * rows;

  logger.info(`Packing ${frames.length} frames into ${columns}x${rows} grid (${width}x${height})`);

  const composites = frames.map((frame, i) => ({
    input: frame.buffer,
    left: (i % columns) * frameWidth,
    top: Math.floor(i / columns) * frameHeight,
  }));

  const sheetBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Generate atlas with grid positions
  const positions = frames.map((_, i) => ({
    x: (i % columns) * frameWidth,
    y: Math.floor(i / columns) * frameHeight,
  }));

  const framedData = frames.map((f, i) => ({
    ...f,
    width: frameWidth,
    height: frameHeight,
  }));

  const atlas = generatePhaserAtlas(framedData, positions, { width, height });
  const animations = generateAnimationsJson(frames);

  return {
    image: sheetBuffer,
    atlas,
    animations,
  };
}

export default {
  packFrames,
  packGrid,
};
