/**
 * Spraite - Main generation orchestrator
 * Coordinates the full sprite generation pipeline
 */

import { join } from 'path';
import ora from 'ora';

import { config, validateConfig } from './config.js';
import logger from './utils/logger.js';
import { ensureDir, readJson, writeJson, writeBinary } from './utils/file-utils.js';
import {
  generateImageWithRetry,
  buildSpriteStripPrompt,
  validateSpec,
} from './generator/index.js';
import { validateSpriteStrip, removeBackground } from './validator/index.js';
import { sliceStrip } from './processor/slicer.js';
import { packFrames } from './processor/packer.js';
import sharp from 'sharp';

/**
 * Main sprite generation function
 * @param {string} specPath - Path to sprite specification JSON
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result with paths to created files
 */
export async function generateSprites(specPath, options = {}) {
  const {
    outputDir = null,
    dryRun = false,
    verbose = false,
  } = options;

  if (verbose) {
    logger.setLevel('debug');
  }

  // Validate configuration
  const configValidation = validateConfig();
  if (!configValidation.isValid) {
    throw new Error(`Configuration invalid: ${configValidation.errors.join(', ')}`);
  }

  // Load and validate spec
  logger.info(`Loading spec from: ${specPath}`);
  const spec = await readJson(specPath);

  const specValidation = validateSpec(spec);
  if (!specValidation.isValid) {
    throw new Error(`Spec invalid: ${specValidation.errors.join(', ')}`);
  }

  const characterName = spec.name || 'character';
  const targetDir = outputDir || join(config.paths.root, config.paths.output, characterName);

  logger.box(`Generating: ${characterName}`, `
  Frame size: ${spec.frameWidth}x${spec.frameHeight}
  Animations: ${Object.keys(spec.animations).join(', ')}
  Output: ${targetDir}
  `);

  if (dryRun) {
    logger.info('Dry run - no images will be generated');
    return { dryRun: true, spec };
  }

  await ensureDir(targetDir);

  // Generate each animation strip
  const allFrames = [];
  const animationNames = Object.keys(spec.animations);

  for (let i = 0; i < animationNames.length; i++) {
    const animName = animationNames[i];
    const animConfig = spec.animations[animName];

    logger.step(i + 1, animationNames.length, `Generating ${animName} (${animConfig.frames} frames)`);

    const frames = await generateAnimation(spec, animName, animConfig, targetDir);
    allFrames.push(...frames);
  }

  // Pack all frames into atlas
  const spinner = ora('Packing sprite atlas...').start();

  try {
    const atlasResult = await packFrames(allFrames, {
      padding: 1,
      maxWidth: 2048,
    });

    // Set the image filename in atlas metadata
    atlasResult.atlas.meta.image = `${characterName}.png`;

    // Write output files
    const imagePath = join(targetDir, `${characterName}.png`);
    const atlasPath = join(targetDir, `${characterName}.json`);
    const animationsPath = join(targetDir, 'animations.json');

    await writeBinary(imagePath, atlasResult.image);
    await writeJson(atlasPath, atlasResult.atlas);
    await writeJson(animationsPath, atlasResult.animations);

    spinner.succeed('Atlas packed successfully');

    logger.success(`Generated files:`);
    logger.info(`  - ${imagePath}`);
    logger.info(`  - ${atlasPath}`);
    logger.info(`  - ${animationsPath}`);

    return {
      success: true,
      characterName,
      outputDir: targetDir,
      files: {
        image: imagePath,
        atlas: atlasPath,
        animations: animationsPath,
      },
      frameCount: allFrames.length,
    };
  } catch (error) {
    spinner.fail('Atlas packing failed');
    throw error;
  }
}

/**
 * Generates a single animation strip and returns frame data
 * @param {Object} spec - Sprite specification
 * @param {string} animName - Animation name
 * @param {Object} animConfig - Animation configuration
 * @param {string} outputDir - Output directory for intermediate files
 * @returns {Promise<Object[]>} Array of frame data objects
 */
async function generateAnimation(spec, animName, animConfig, outputDir) {
  const { frameWidth, frameHeight } = spec;
  const { frames: frameCount, fps } = animConfig;

  const spinner = ora(`  Generating ${animName}...`).start();

  try {
    // Build prompt for this animation
    const prompt = buildSpriteStripPrompt(spec, animName, animConfig);

    // Calculate expected strip dimensions
    const stripWidth = frameWidth * frameCount;
    const stripHeight = frameHeight;

    // Generate the image
    let imageBuffer = await generateImageWithRetry(prompt, {
      width: stripWidth,
      height: stripHeight,
      quality: 'high',
    });

    // Resize to exact dimensions if needed
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.width !== stripWidth || metadata.height !== stripHeight) {
      spinner.text = `  Resizing ${animName} to ${stripWidth}x${stripHeight}...`;
      imageBuffer = await sharp(imageBuffer)
        .resize(stripWidth, stripHeight, {
          kernel: sharp.kernel.nearest,
          fit: 'fill',
        })
        .png()
        .toBuffer();
    }

    // Validate the strip
    spinner.text = `  Validating ${animName}...`;
    const validation = await validateSpriteStrip(imageBuffer, frameWidth, frameHeight, frameCount);

    if (!validation.isValid) {
      spinner.warn(`  ${animName}: validation warnings`);
      logger.warn(`Validation issues for ${animName}:`);
      validation.errors.forEach(e => logger.warn(`  - ${e}`));

      // Attempt to fix transparency issues
      if (validation.errors.some(e => e.includes('transparent'))) {
        spinner.text = `  Fixing transparency for ${animName}...`;
        imageBuffer = await removeBackground(imageBuffer, {
          backgroundColor: { r: 255, g: 255, b: 255 },
          tolerance: 30,
        });
      }
    }

    // Save strip for debugging
    const stripPath = join(outputDir, `strip_${animName}.png`);
    await writeBinary(stripPath, imageBuffer);

    // Slice into individual frames
    spinner.text = `  Slicing ${animName} frames...`;
    const extractedFrames = await sliceStrip(imageBuffer, frameWidth, frameHeight, frameCount);

    // Convert to frame data format for packer
    const frameData = extractedFrames.map((frame, index) => ({
      name: `${animName}_${index}`,
      buffer: frame.buffer,
      width: frameWidth,
      height: frameHeight,
      animation: animName,
      frameIndex: index,
      fps: fps,
    }));

    spinner.succeed(`  ${animName}: ${frameCount} frames`);
    return frameData;
  } catch (error) {
    spinner.fail(`  ${animName}: generation failed`);
    throw error;
  }
}

/**
 * Validates a sprite specification file without generating
 * @param {string} specPath - Path to spec file
 * @returns {Promise<Object>} Validation result
 */
export async function validateSpecFile(specPath) {
  const spec = await readJson(specPath);
  return validateSpec(spec);
}

/**
 * Validates an existing sprite sheet image
 * @param {string} imagePath - Path to image file
 * @param {Object} expectedSpec - Expected dimensions
 * @returns {Promise<Object>} Validation result
 */
export async function validateImage(imagePath, expectedSpec) {
  const { promises: fs } = await import('fs');
  const imageBuffer = await fs.readFile(imagePath);
  return validateSpriteStrip(imageBuffer, expectedSpec.frameWidth, expectedSpec.frameHeight, expectedSpec.frameCount);
}

export default {
  generateSprites,
  validateSpecFile,
  validateImage,
};
