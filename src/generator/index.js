/**
 * Main generator module - orchestrates sprite generation
 */

export { generateImage, generateImageWithRetry, refinePrompt } from './openai-client.js';
export {
  buildSpriteStripPrompt,
  buildSingleFramePrompt,
  validateSpec,
  createDefaultSpec
} from './prompt-builder.js';
