/**
 * OpenAI API client for image generation
 * Uses GPT Image 1.5 for generating pixel art sprites
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import logger from '../utils/logger.js';

let client = null;

/**
 * Gets or creates the OpenAI client instance
 * @returns {OpenAI} OpenAI client
 */
function getClient() {
  if (!client) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return client;
}

/**
 * Generates an image using GPT Image model
 * @param {string} prompt - The image generation prompt
 * @param {Object} options - Generation options
 * @param {number} options.width - Image width in pixels
 * @param {number} options.height - Image height in pixels
 * @param {string} options.quality - Quality setting ('low', 'medium', 'high')
 * @returns {Promise<Buffer>} Generated image as PNG buffer
 */
export async function generateImage(prompt, options = {}) {
  const openai = getClient();

  const { width = 512, height = 512, quality = 'high' } = options;

  // Determine size parameter - OpenAI accepts specific sizes
  // We'll use the closest supported size and resize if needed
  const size = getSupportedSize(width, height);

  logger.debug(`Generating image: ${width}x${height} (using ${size})`);
  logger.debug(`Prompt: ${prompt.substring(0, 100)}...`);

  try {
    const response = await openai.images.generate({
      model: config.openai.imageModel,
      prompt: prompt,
      n: 1,
      size: size,
      response_format: 'b64_json',
      quality: quality,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data in response');
    }

    const base64Data = response.data[0].b64_json;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    logger.debug(`Generated image: ${imageBuffer.length} bytes`);

    return imageBuffer;
  } catch (error) {
    if (error.status === 400) {
      logger.error('Bad request - prompt may be invalid or rejected');
    } else if (error.status === 429) {
      logger.error('Rate limited - please wait before retrying');
    }
    throw error;
  }
}

/**
 * Maps requested dimensions to supported OpenAI image sizes
 * @param {number} width - Requested width
 * @param {number} height - Requested height
 * @returns {string} Supported size string
 */
function getSupportedSize(width, height) {
  // OpenAI DALL-E/GPT Image supported sizes
  const supportedSizes = [
    { w: 1024, h: 1024, str: '1024x1024' },
    { w: 1024, h: 1792, str: '1024x1792' },
    { w: 1792, h: 1024, str: '1792x1024' },
    { w: 512, h: 512, str: '512x512' },
    { w: 256, h: 256, str: '256x256' },
  ];

  // For sprite strips, we typically want wide images
  const aspectRatio = width / height;

  if (aspectRatio > 1.5) {
    return '1792x1024'; // Wide format for strips
  } else if (aspectRatio < 0.7) {
    return '1024x1792'; // Tall format
  } else {
    return '1024x1024'; // Square
  }
}

/**
 * Uses GPT text model to refine or validate prompts
 * @param {string} userPrompt - Initial user prompt
 * @param {Object} context - Additional context for refinement
 * @returns {Promise<string>} Refined prompt
 */
export async function refinePrompt(userPrompt, context = {}) {
  const openai = getClient();

  const systemPrompt = `You are an expert at crafting prompts for AI image generation,
specifically for pixel art game sprites. Your job is to refine the user's prompt
to ensure it produces:
- Clean 16-bit era pixel art with no anti-aliasing or blur
- Maximum 16-color palette
- Bold 1px black outline around the character
- True transparent background (not checkerboard, not solid color)
- Consistent character positioning and baseline

Respond with ONLY the refined prompt, no explanation.`;

  const refinementRequest = `
Original prompt: ${userPrompt}

Context:
- Frame size: ${context.frameWidth || 64}x${context.frameHeight || 64} pixels
- Animation: ${context.animationName || 'idle'}
- Frame count: ${context.frameCount || 4}
- Character description: ${context.characterDescription || 'game character'}

Refine this prompt for pixel art sprite generation:`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.textModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: refinementRequest },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.warn('Prompt refinement failed, using original prompt');
    return userPrompt;
  }
}

/**
 * Generates image with automatic retry on failure
 * @param {string} prompt - Image generation prompt
 * @param {Object} options - Generation options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Buffer>} Generated image buffer
 */
export async function generateImageWithRetry(prompt, options = {}, maxRetries = null) {
  const retries = maxRetries ?? config.generation.maxRetries;
  const delayMs = config.generation.retryDelayMs;

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Generation attempt ${attempt}/${retries}`);
      return await generateImage(prompt, options);
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt < retries) {
        const waitTime = delayMs * attempt; // Exponential backoff
        logger.debug(`Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      }
    }
  }

  throw new Error(`Image generation failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  generateImage,
  generateImageWithRetry,
  refinePrompt,
};
