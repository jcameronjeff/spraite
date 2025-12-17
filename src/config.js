/**
 * Configuration management for Spraite
 * Handles environment variables and default settings
 */

import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    imageModel: 'gpt-image-1', // GPT Image 1.5 model identifier
    textModel: 'gpt-4o', // For planning and prompt construction
  },

  // Generation settings
  generation: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '2000', 10),
    maxFramesPerStrip: 8,
    minFramesPerStrip: 4,
  },

  // Pixel art style constraints
  style: {
    maxColors: 16,
    outlineWidth: 1,
    outlineColor: '#000000',
    antiAliasing: false,
  },

  // Validation thresholds
  validation: {
    // Corner pixels to check for transparency
    cornerSampleSize: 5,
    // Alpha threshold (0-255) - anything below is considered transparent
    alphaThreshold: 10,
    // Minimum percentage of border that must be transparent
    minTransparentBorderPercent: 95,
  },

  // Output paths
  paths: {
    root: join(__dirname, '..'),
    output: process.env.OUTPUT_DIR || 'assets/generated',
    specs: 'specs',
  },
};

/**
 * Validates that required configuration is present
 * @returns {Object} Validation result with isValid and errors array
 */
export function validateConfig() {
  const errors = [];

  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY environment variable is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default config;
