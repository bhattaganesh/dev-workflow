/**
 * Local WP app module.
 *
 * Site start/stop uses local-cli if installed.
 * Install it once with: npm install -g @getflywheel/local-cli
 *
 * config.json shape:
 *   "local-wp": {
 *     "enabled": true,
 *     "siteName": "masteriiyo",
 *     "execPath": { "win32": "...", "darwin": "...", "linux": "" }
 *   }
 */
import { execa } from 'execa';
import { getPath, launchApp, closeApp, isRunning, sleep } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'Local WP';
export const key = 'local-wp';

export async function start(config) {
  const cfg = config.apps?.[key];
  if (!cfg?.enabled) return null;

  const execPath = getPath(cfg.execPath ?? {});
  const alreadyRunning = await isRunning('Local.exe');

  if (!alreadyRunning) {
    if (!execPath) {
      logger.warn('Local WP: execPath not set in config.json — skipping');
      return null;
    }
    logger.step('Launching Local WP');
    await launchApp(execPath);
    // Give Local WP time to initialise before we try to start the site
    await sleep(5000);
  } else {
    logger.info('Local WP already running');
  }

  if (cfg.siteName) {
    await startSite(cfg.siteName);
  }

  return { key };
}

export async function stop(_session, config) {
  const cfg = config.apps?.[key];
  if (!cfg?.enabled) return;

  if (cfg.siteName) {
    try {
      await execa('local-cli', ['stop', cfg.siteName]);
      logger.done(`Site "${cfg.siteName}" stopped`);
    } catch {
      // local-cli not available — closing the app will stop it
    }
  }

  await closeApp({ win: 'Local.exe', mac: 'Local', linux: 'local' });
  logger.done('Local WP closed');
}

async function startSite(siteName) {
  try {
    await execa('local-cli', ['start', siteName]);
    logger.done(`Site "${siteName}" is live`, `${siteName}.local`);
  } catch {
    logger.warn(`local-cli not found — site must be started manually.`);
    logger.info(`Install once with: npm install -g @getflywheel/local-cli`);
  }
}
