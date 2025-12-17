/**
 * Sprite strip slicer
 * Slices horizontal sprite strips into individual frames using sharp
 */

import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * Represents a single extracted frame
 * @typedef {Object} ExtractedFrame
 * @property {Buffer} buffer - PNG image buffer
 * @property {number} index - Frame index in animation
 * @property {number} x - X position in original strip
 * @property {number} y - Y position in original strip
 * @property {number} width - Frame width
 * @property {number} height - Frame height
 */

/**
 * Slices a horizontal sprite strip into individual frames
 * @param {Buffer} stripBuffer - PNG buffer of the sprite strip
 * @param {number} frameWidth - Width of each frame
 * @param {number} frameHeight - Height of each frame
 * @param {number} frameCount - Number of frames to extract
 * @returns {Promise<ExtractedFrame[]>} Array of extracted frames
 */
export async function sliceStrip(stripBuffer, frameWidth, frameHeight, frameCount) {
  const frames = [];

  // Verify strip dimensions
  const metadata = await sharp(stripBuffer).metadata();
  const expectedWidth = frameWidth * frameCount;

  if (metadata.width !== expectedWidth) {
    logger.warn(
      `Strip width mismatch: expected ${expectedWidth}, got ${metadata.width}. ` +
      `Will extract what we can.`
    );
  }

  if (metadata.height !== frameHeight) {
    logger.warn(
      `Strip height mismatch: expected ${frameHeight}, got ${metadata.height}. ` +
      `Frames may be cropped.`
    );
  }

  // Extract each frame
  for (let i = 0; i < frameCount; i++) {
    const x = i * frameWidth;

    // Ensure we don't exceed image bounds
    if (x + frameWidth > metadata.width) {
      logger.warn(`Frame ${i} would exceed strip bounds, stopping extraction`);
      break;
    }

    try {
      const frameBuffer = await sharp(stripBuffer)
        .extract({
          left: x,
          top: 0,
          width: Math.min(frameWidth, metadata.width - x),
          height: Math.min(frameHeight, metadata.height),
        })
        .png({ compressionLevel: 9 })
        .toBuffer();

      frames.push({
        buffer: frameBuffer,
        index: i,
        x: x,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      });

      logger.debug(`Extracted frame ${i + 1}/${frameCount} at x=${x}`);
    } catch (error) {
      logger.error(`Failed to extract frame ${i}: ${error.message}`);
      throw error;
    }
  }

  logger.info(`Sliced ${frames.length} frames from sprite strip`);
  return frames;
}

/**
 * Slices a grid-based sprite sheet into individual frames
 * @param {Buffer} sheetBuffer - PNG buffer of the sprite sheet
 * @param {number} frameWidth - Width of each frame
 * @param {number} frameHeight - Height of each frame
 * @param {number} columns - Number of columns in the grid
 * @param {number} rows - Number of rows in the grid
 * @returns {Promise<ExtractedFrame[]>} Array of extracted frames
 */
export async function sliceGrid(sheetBuffer, frameWidth, frameHeight, columns, rows) {
  const frames = [];
  const metadata = await sharp(sheetBuffer).metadata();

  let frameIndex = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;

      // Bounds check
      if (x + frameWidth > metadata.width || y + frameHeight > metadata.height) {
        logger.warn(`Frame at (${col}, ${row}) exceeds sheet bounds, skipping`);
        continue;
      }

      try {
        const frameBuffer = await sharp(sheetBuffer)
          .extract({
            left: x,
            top: y,
            width: frameWidth,
            height: frameHeight,
          })
          .png({ compressionLevel: 9 })
          .toBuffer();

        frames.push({
          buffer: frameBuffer,
          index: frameIndex++,
          x,
          y,
          width: frameWidth,
          height: frameHeight,
        });
      } catch (error) {
        logger.error(`Failed to extract frame at (${col}, ${row}): ${error.message}`);
      }
    }
  }

  logger.info(`Sliced ${frames.length} frames from ${columns}x${rows} grid`);
  return frames;
}

/**
 * Resizes a frame to a new size while maintaining pixel art crispness
 * @param {Buffer} frameBuffer - Frame to resize
 * @param {number} newWidth - Target width
 * @param {number} newHeight - Target height
 * @returns {Promise<Buffer>} Resized frame
 */
export async function resizeFrame(frameBuffer, newWidth, newHeight) {
  return sharp(frameBuffer)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.nearest, // Nearest neighbor for pixel art
      fit: 'fill',
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Pads a frame to a larger size, centering the original content
 * @param {Buffer} frameBuffer - Frame to pad
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @returns {Promise<Buffer>} Padded frame
 */
export async function padFrame(frameBuffer, targetWidth, targetHeight) {
  const metadata = await sharp(frameBuffer).metadata();

  const left = Math.floor((targetWidth - metadata.width) / 2);
  const top = Math.floor((targetHeight - metadata.height) / 2);

  return sharp(frameBuffer)
    .extend({
      top: top,
      bottom: targetHeight - metadata.height - top,
      left: left,
      right: targetWidth - metadata.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Trims transparent borders from a frame
 * @param {Buffer} frameBuffer - Frame to trim
 * @returns {Promise<{buffer: Buffer, trimmed: Object}>} Trimmed frame and trim info
 */
export async function trimFrame(frameBuffer) {
  const trimmed = await sharp(frameBuffer)
    .trim()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: trimmed.data,
    trimmed: {
      offsetX: trimmed.info.trimOffsetLeft || 0,
      offsetY: trimmed.info.trimOffsetTop || 0,
      originalWidth: (await sharp(frameBuffer).metadata()).width,
      originalHeight: (await sharp(frameBuffer).metadata()).height,
      newWidth: trimmed.info.width,
      newHeight: trimmed.info.height,
    },
  };
}

export default {
  sliceStrip,
  sliceGrid,
  resizeFrame,
  padFrame,
  trimFrame,
};
