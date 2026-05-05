import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as logger from './logger.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_PATH = resolve(ROOT, 'config.json');
export const EXAMPLE_PATH = resolve(ROOT, 'config.example.json');

export function load() {
  if (!existsSync(CONFIG_PATH)) {
    logger.error('config.json not found.');
    logger.info(`Copy the template and fill in your paths:`);
    logger.info(`  cp config.example.json config.json`);
    process.exit(1);
  }

  let cfg;
  try {
    cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    logger.error(`config.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  return cfg;
}
