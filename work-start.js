#!/usr/bin/env node
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as logger from './lib/logger.js';
import { load as loadConfig } from './lib/config.js';
import { save as saveSession } from './lib/session.js';
import { APP_KEYS } from './apps-registry.js';

const ROOT = dirname(fileURLToPath(import.meta.url));

async function main() {
  logger.banner('🚀  Work Session Starting', new Date().toLocaleTimeString());

  const config = loadConfig();
  const t0 = Date.now();
  const started = [];
  const failed = [];

  for (const key of APP_KEYS) {
    if (!config.apps?.[key]?.enabled) continue;

    const mod = await import(pathToFileURL(resolve(ROOT, 'apps', `${key}.js`)).href);
    const label = mod.name ?? key;

    logger.step(label);
    try {
      const result = await mod.start(config);
      if (result) {
        started.push(result);
        logger.done(label);
      }
    } catch (err) {
      failed.push(label);
      logger.error(`${label}: ${err.message}`);
    }
  }

  saveSession(started);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  logger.startSummary(elapsed, started, failed);
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
