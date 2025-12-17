#!/usr/bin/env node

/**
 * Spraite CLI - Command line interface for sprite generation
 */

import { Command } from 'commander';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';

import { generateSprites, validateSpecFile } from './index.js';
import { createDefaultSpec } from './generator/prompt-builder.js';
import { writeJson, ensureDir } from './utils/file-utils.js';
import { config, validateConfig } from './config.js';
import logger from './utils/logger.js';

const program = new Command();

program
  .name('spraite')
  .description('AI-powered pixel art sprite generation for Phaser games')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .alias('gen')
  .description('Generate sprites from a specification file')
  .argument('<spec>', 'Path to sprite specification JSON file')
  .option('-o, --output <dir>', 'Output directory (default: assets/generated/<name>)')
  .option('-d, --dry-run', 'Validate spec without generating images')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (specPath, options) => {
    try {
      // Resolve spec path
      const resolvedPath = resolve(specPath);
      if (!existsSync(resolvedPath)) {
        logger.error(`Spec file not found: ${resolvedPath}`);
        process.exit(1);
      }

      // Check API key
      const configCheck = validateConfig();
      if (!configCheck.isValid && !options.dryRun) {
        logger.error('Configuration errors:');
        configCheck.errors.forEach(e => logger.error(`  - ${e}`));
        logger.info('\nSet OPENAI_API_KEY in your .env file or environment');
        process.exit(1);
      }

      // Run generation
      const result = await generateSprites(resolvedPath, {
        outputDir: options.output ? resolve(options.output) : null,
        dryRun: options.dryRun,
        verbose: options.verbose,
      });

      if (result.success) {
        console.log(chalk.green('\n✓ Generation complete!'));
        console.log(chalk.gray(`  ${result.frameCount} frames packed into ${result.files.image}`));
      }
    } catch (error) {
      logger.error(`Generation failed: ${error.message}`);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate a sprite specification file')
  .argument('<spec>', 'Path to sprite specification JSON file')
  .action(async (specPath) => {
    try {
      const resolvedPath = resolve(specPath);
      if (!existsSync(resolvedPath)) {
        logger.error(`Spec file not found: ${resolvedPath}`);
        process.exit(1);
      }

      const result = await validateSpecFile(resolvedPath);

      if (result.isValid) {
        console.log(chalk.green('✓ Specification is valid'));
      } else {
        console.log(chalk.red('✗ Specification has errors:'));
        result.errors.forEach(e => console.log(chalk.red(`  - ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Validation failed: ${error.message}`);
      process.exit(1);
    }
  });

// Init command - create a new spec file
program
  .command('init')
  .description('Create a new sprite specification file')
  .argument('[name]', 'Character name', 'character')
  .option('-d, --description <desc>', 'Character description', 'A game character')
  .option('-o, --output <dir>', 'Output directory', 'specs')
  .action(async (name, options) => {
    try {
      const spec = createDefaultSpec(options.description);
      spec.name = name;

      const outputDir = resolve(options.output);
      await ensureDir(outputDir);

      const specPath = join(outputDir, `${name}.json`);
      await writeJson(specPath, spec);

      console.log(chalk.green(`✓ Created spec file: ${specPath}`));
      console.log(chalk.gray('\nEdit this file to customize your character, then run:'));
      console.log(chalk.cyan(`  npx spraite generate ${specPath}`));
    } catch (error) {
      logger.error(`Init failed: ${error.message}`);
      process.exit(1);
    }
  });

// List command - show example specs
program
  .command('list')
  .description('List available example specifications')
  .action(async () => {
    const specsDir = join(config.paths.root, config.paths.specs);

    try {
      const { promises: fs } = await import('fs');
      const files = await fs.readdir(specsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      if (jsonFiles.length === 0) {
        console.log(chalk.yellow('No specification files found.'));
        console.log(chalk.gray('Create one with: npx spraite init <name>'));
        return;
      }

      console.log(chalk.bold('Available specifications:\n'));
      for (const file of jsonFiles) {
        const specPath = join(specsDir, file);
        const spec = JSON.parse(await fs.readFile(specPath, 'utf-8'));
        console.log(`  ${chalk.cyan(file)}`);
        console.log(`    Name: ${spec.name || 'unnamed'}`);
        console.log(`    Character: ${spec.character?.description || 'no description'}`);
        console.log(`    Animations: ${Object.keys(spec.animations || {}).join(', ')}`);
        console.log();
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(chalk.yellow('Specs directory not found.'));
        console.log(chalk.gray('Create a spec with: npx spraite init <name>'));
      } else {
        throw error;
      }
    }
  });

// Parse arguments
program.parse();
