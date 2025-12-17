/**
 * Logging utility with colored output
 */

import chalk from 'chalk';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel = LOG_LEVELS.info;

export const logger = {
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      currentLevel = LOG_LEVELS[level];
    }
  },

  debug(...args) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  },

  info(...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(chalk.blue('[INFO]'), ...args);
    }
  },

  success(...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(chalk.green('[OK]'), ...args);
    }
  },

  warn(...args) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.log(chalk.yellow('[WARN]'), ...args);
    }
  },

  error(...args) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.log(chalk.red('[ERROR]'), ...args);
    }
  },

  step(step, total, message) {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  },

  box(title, content) {
    const width = 60;
    const border = '='.repeat(width);
    console.log(chalk.cyan(border));
    console.log(chalk.cyan('|'), chalk.bold(title.padEnd(width - 4)), chalk.cyan('|'));
    console.log(chalk.cyan(border));
    if (content) {
      console.log(content);
    }
  },
};

export default logger;
