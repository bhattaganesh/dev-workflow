#!/usr/bin/env node
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as logger from './lib/logger.js';
import { load as loadConfig } from './lib/config.js';
import { load as loadSession, clear as clearSession } from './lib/session.js';
import { APP_KEYS } from './apps-registry.js';

const ROOT = dirname(fileURLToPath(import.meta.url));

async function main() {
  logger.banner('🛑  Ending Work Session', new Date().toLocaleTimeString());

  const config = loadConfig();
  const session = loadSession();

  if (!session) {
    logger.warn('No active session found — nothing to close.');
    logger.info('(Run work-start first to begin a tracked session)');
    logger.newline();
    return;
  }

  const startedKeys = new Set(session.apps.map((a) => a.key));
  const t0 = Date.now();

  // Close in reverse start order
  const stopOrder = [...APP_KEYS].reverse();

  for (const key of stopOrder) {
    if (!startedKeys.has(key)) continue;

    const mod = await import(resolve(ROOT, 'apps', `${key}.js`));
    const label = mod.name ?? key;

    logger.step(`Closing ${label}`);
    try {
      await mod.stop(session, config);
      logger.done(`${label} closed`);
    } catch (err) {
      logger.error(`${label}: ${err.message}`);
    }
  }

  clearSession();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  logger.endSummary(elapsed);
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
