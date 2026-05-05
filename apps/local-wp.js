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
import { getPath, launchApp, closeApp, isRunning, isWindows, sleep } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'Local WP';
export const key = 'local-wp';

const SITE_START_TIMEOUT_MS = 60_000;

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
    logger.info('Launching Local WP app...');
    launchApp(execPath);
    logger.info('Waiting for Local WP to initialise...');
    await sleep(3000);
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

  if (cfg.siteName && (await localCliAvailable())) {
    try {
      await execa('local-cli', ['stop', cfg.siteName], { timeout: 15_000 });
      logger.done(`Site "${cfg.siteName}" stopped`);
    } catch {
      // Closing the app will stop the site anyway
    }
  }

  await closeApp({ win: 'Local.exe', mac: 'Local', linux: 'local' });
  logger.done('Local WP closed');
}

async function startSite(siteName) {
  if (!(await localCliAvailable())) {
    logger.warn('local-cli not found — start the site manually in Local WP.');
    logger.info('Install once with: npm install -g @getflywheel/local-cli');
    return;
  }

  logger.info(`Starting site "${siteName}" via local-cli (may take ~30s)...`);
  try {
    await execa('local-cli', ['start', siteName], { timeout: SITE_START_TIMEOUT_MS });
    logger.done(`Site "${siteName}" is live`, `${siteName}.local`);
  } catch (err) {
    if (err.timedOut) {
      logger.warn(`Site start timed out — start "${siteName}" manually in Local WP.`);
    } else {
      logger.warn(`local-cli error: ${err.message}`);
    }
  }
}

async function localCliAvailable() {
  try {
    const cmd = isWindows ? 'where' : 'which';
    await execa(cmd, ['local-cli']);
    return true;
  } catch {
    return false;
  }
}
