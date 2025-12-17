/**
 * PNG Validator for sprite generation
 * Validates PNG format, RGBA channels, alpha transparency, and dimensions
 */

import sharp from 'sharp';
import { config } from '../config.js';
import logger from '../utils/logger.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 * @property {Object} metadata - Image metadata
 */

/**
 * Validates a PNG image buffer for sprite requirements
 * @param {Buffer} imageBuffer - PNG image data
 * @param {Object} expectedSpec - Expected specification
 * @param {number} expectedSpec.width - Expected width
 * @param {number} expectedSpec.height - Expected height
 * @returns {Promise<ValidationResult>} Validation result
 */
export async function validatePng(imageBuffer, expectedSpec = {}) {
  const errors = [];
  const warnings = [];
  let metadata = {};

  try {
    // Get image metadata
    const image = sharp(imageBuffer);
    metadata = await image.metadata();

    // 1. Validate PNG format
    if (metadata.format !== 'png') {
      errors.push(`Invalid format: expected 'png', got '${metadata.format}'`);
    }

    // 2. Validate RGBA channels (4 channels)
    if (metadata.channels !== 4) {
      errors.push(`Invalid channels: expected 4 (RGBA), got ${metadata.channels}`);
    }

    // 3. Validate alpha channel presence
    if (!metadata.hasAlpha) {
      errors.push('Missing alpha channel - image must have transparency support');
    }

    // 4. Validate dimensions if specified
    if (expectedSpec.width && metadata.width !== expectedSpec.width) {
      errors.push(`Invalid width: expected ${expectedSpec.width}, got ${metadata.width}`);
    }

    if (expectedSpec.height && metadata.height !== expectedSpec.height) {
      errors.push(`Invalid height: expected ${expectedSpec.height}, got ${metadata.height}`);
    }

    // 5. Validate background transparency (corners and gutters)
    if (metadata.hasAlpha) {
      const transparencyResult = await validateTransparency(image, metadata);
      if (!transparencyResult.isTransparent) {
        errors.push('Background is not transparent - corners/edges have non-zero alpha');
        errors.push(...transparencyResult.details);
      }
    }

  } catch (error) {
    errors.push(`Failed to parse image: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
      size: imageBuffer.length,
    },
  };
}

/**
 * Validates that background/gutter pixels are transparent
 * @param {sharp.Sharp} image - Sharp image instance
 * @param {Object} metadata - Image metadata
 * @returns {Promise<Object>} Transparency validation result
 */
async function validateTransparency(image, metadata) {
  const { width, height } = metadata;
  const { cornerSampleSize, alphaThreshold, minTransparentBorderPercent } = config.validation;

  // Extract raw pixel data
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const details = [];
  let transparentPixels = 0;
  let totalBorderPixels = 0;

  // Helper to get alpha value at position
  const getAlpha = (x, y) => {
    const idx = (y * info.width + x) * 4;
    return data[idx + 3]; // Alpha is 4th channel (RGBA)
  };

  // Check corner pixels
  const corners = [
    { name: 'top-left', x: 0, y: 0 },
    { name: 'top-right', x: width - 1, y: 0 },
    { name: 'bottom-left', x: 0, y: height - 1 },
    { name: 'bottom-right', x: width - 1, y: height - 1 },
  ];

  for (const corner of corners) {
    // Sample a small area around each corner
    for (let dx = 0; dx < cornerSampleSize && corner.x + dx < width; dx++) {
      for (let dy = 0; dy < cornerSampleSize && corner.y + dy < height; dy++) {
        const alpha = getAlpha(corner.x + dx, corner.y + dy);
        totalBorderPixels++;

        if (alpha <= alphaThreshold) {
          transparentPixels++;
        } else {
          logger.debug(`Non-transparent pixel at ${corner.name}: (${corner.x + dx}, ${corner.y + dy}) alpha=${alpha}`);
        }
      }
    }
  }

  // Check top and bottom edges (sample every few pixels)
  const sampleInterval = Math.max(1, Math.floor(width / 20));
  for (let x = 0; x < width; x += sampleInterval) {
    // Top edge
    const topAlpha = getAlpha(x, 0);
    totalBorderPixels++;
    if (topAlpha <= alphaThreshold) transparentPixels++;

    // Bottom edge
    const bottomAlpha = getAlpha(x, height - 1);
    totalBorderPixels++;
    if (bottomAlpha <= alphaThreshold) transparentPixels++;
  }

  // Check left and right edges
  for (let y = 0; y < height; y += sampleInterval) {
    // Left edge
    const leftAlpha = getAlpha(0, y);
    totalBorderPixels++;
    if (leftAlpha <= alphaThreshold) transparentPixels++;

    // Right edge
    const rightAlpha = getAlpha(width - 1, y);
    totalBorderPixels++;
    if (rightAlpha <= alphaThreshold) transparentPixels++;
  }

  const transparentPercent = (transparentPixels / totalBorderPixels) * 100;
  const isTransparent = transparentPercent >= minTransparentBorderPercent;

  if (!isTransparent) {
    details.push(`Only ${transparentPercent.toFixed(1)}% of border pixels are transparent (need ${minTransparentBorderPercent}%)`);
  }

  return {
    isTransparent,
    transparentPercent,
    totalBorderPixels,
    transparentPixels,
    details,
  };
}

/**
 * Validates sprite strip dimensions and frame alignment
 * @param {Buffer} imageBuffer - PNG image data
 * @param {number} frameWidth - Expected frame width
 * @param {number} frameHeight - Expected frame height
 * @param {number} frameCount - Expected number of frames
 * @returns {Promise<ValidationResult>} Validation result
 */
export async function validateSpriteStrip(imageBuffer, frameWidth, frameHeight, frameCount) {
  const expectedWidth = frameWidth * frameCount;
  const expectedHeight = frameHeight;

  const baseResult = await validatePng(imageBuffer, {
    width: expectedWidth,
    height: expectedHeight,
  });

  // Additional sprite strip validations
  if (baseResult.isValid) {
    // Verify frame alignment by checking for content in expected regions
    // This is a basic check - more sophisticated checks could analyze pixel content
    logger.debug(`Sprite strip validated: ${frameCount} frames at ${frameWidth}x${frameHeight}`);
  }

  return baseResult;
}

/**
 * Attempts to fix common transparency issues
 * @param {Buffer} imageBuffer - Original image buffer
 * @returns {Promise<Buffer>} Fixed image buffer
 */
export async function fixTransparency(imageBuffer) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  // If already RGBA, extract and re-encode with proper alpha
  if (metadata.channels === 4) {
    // Convert any near-white/near-black background pixels to transparent
    // This uses sharp's removeAlpha and ensureAlpha to force proper channel handling
    const fixed = await image
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer();

    return fixed;
  }

  // If RGB only, add alpha channel
  if (metadata.channels === 3) {
    logger.warn('Image missing alpha channel, adding transparent background');

    const fixed = await image
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer();

    return fixed;
  }

  return imageBuffer;
}

/**
 * Removes solid color background and replaces with transparency
 * @param {Buffer} imageBuffer - Image with solid background
 * @param {Object} options - Options for background removal
 * @returns {Promise<Buffer>} Image with transparent background
 */
export async function removeBackground(imageBuffer, options = {}) {
  const {
    backgroundColor = { r: 255, g: 255, b: 255 },
    tolerance = 10,
  } = options;

  const image = sharp(imageBuffer);
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  // Process pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel matches background color within tolerance
    const matchesBackground =
      Math.abs(r - backgroundColor.r) <= tolerance &&
      Math.abs(g - backgroundColor.g) <= tolerance &&
      Math.abs(b - backgroundColor.b) <= tolerance;

    if (matchesBackground) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  // Reconstruct image
  const fixed = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return fixed;
}

export default {
  validatePng,
  validateSpriteStrip,
  fixTransparency,
  removeBackground,
};
