/**
 * File system utilities
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to ensure
 */
export async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Reads and parses a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Parsed JSON content
 */
export async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Writes an object as JSON to a file
 * @param {string} filePath - Path to write to
 * @param {Object} data - Data to serialize as JSON
 * @param {boolean} pretty - Whether to pretty-print (default: true)
 */
export async function writeJson(filePath, data, pretty = true) {
  await ensureDir(dirname(filePath));
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Writes binary data to a file
 * @param {string} filePath - Path to write to
 * @param {Buffer} data - Binary data to write
 */
export async function writeBinary(filePath, data) {
  await ensureDir(dirname(filePath));
  await fs.writeFile(filePath, data);
}

/**
 * Checks if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists files in a directory matching a pattern
 * @param {string} dirPath - Directory to list
 * @param {string} extension - File extension to filter (optional)
 * @returns {string[]} Array of file names
 */
export async function listFiles(dirPath, extension = null) {
  const files = await fs.readdir(dirPath);
  if (extension) {
    return files.filter(f => f.endsWith(extension));
  }
  return files;
}

export default {
  ensureDir,
  readJson,
  writeJson,
  writeBinary,
  fileExists,
  listFiles,
};
