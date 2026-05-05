/**
 * Local WP app module.
 *
 * Site start/stop uses Local WP's built-in GraphQL API (no external CLI needed).
 * Local exposes the API at http://127.0.0.1:4000/graphql when the app is running.
 * Connection info is read dynamically from:
 *   %APPDATA%/Local/graphql-connection-info.json  (Windows)
 *   ~/Library/Application Support/Local/...        (Mac)
 *   ~/.config/Local/...                            (Linux)
 *
 * config.json shape:
 *   "local-wp": {
 *     "enabled": true,
 *     "siteName": "Masteriiyo",
 *     "execPath": { "win32": "...", "darwin": "...", "linux": "" }
 *   }
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import os from 'os';
import { getPath, launchApp, closeApp, isRunning, isWindows, isMac, sleep } from '../lib/platform.js';
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
    logger.info('Launching Local WP app...');
    launchApp(execPath);
    logger.info('Waiting for Local WP to initialise...');
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
    const stopped = await callLocalApi('stop', cfg.siteName);
    if (stopped) logger.done(`Site "${cfg.siteName}" stopped`);
  }

  await closeApp({ win: 'Local.exe', mac: 'Local', linux: 'local' });
  logger.done('Local WP closed');
}

// ─── Local WP GraphQL API ────────────────────────────────────────────────────

function getLocalApiConfig() {
  const candidates = [
    // Windows
    resolve(os.homedir(), 'AppData/Roaming/Local/graphql-connection-info.json'),
    // Mac
    resolve(os.homedir(), 'Library/Application Support/Local/graphql-connection-info.json'),
    // Linux
    resolve(os.homedir(), '.config/Local/graphql-connection-info.json'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  return null;
}

function getLocalSites() {
  const candidates = [
    resolve(os.homedir(), 'AppData/Roaming/Local/sites.json'),
    resolve(os.homedir(), 'Library/Application Support/Local/sites.json'),
    resolve(os.homedir(), '.config/Local/sites.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  return null;
}

function findSiteId(siteName) {
  const sites = getLocalSites();
  if (!sites) return null;
  const entry = Object.entries(sites).find(
    ([, v]) => v.name.toLowerCase() === siteName.toLowerCase()
  );
  return entry ? entry[0] : null;
}

async function callLocalApi(action, siteName) {
  const apiCfg = getLocalApiConfig();
  if (!apiCfg) {
    logger.warn('Local WP API config not found — start site manually');
    return false;
  }

  const siteId = findSiteId(siteName);
  if (!siteId) {
    logger.warn(`Site "${siteName}" not found in Local WP — check siteName in config.json`);
    return false;
  }

  const mutation = action === 'start'
    ? `mutation { startSite(id: "${siteId}") { id } }`
    : `mutation { stopSite(id: "${siteId}") { id } }`;

  try {
    const res = await fetch(apiCfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiCfg.authToken,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const json = await res.json();

    if (json.errors?.length) {
      logger.warn(`Local WP API: ${json.errors[0].message}`);
      return false;
    }

    return true;
  } catch (err) {
    logger.warn(`Local WP API unreachable — start site manually (${err.message})`);
    return false;
  }
}

async function startSite(siteName) {
  logger.info(`Starting site "${siteName}" via Local WP API...`);
  const ok = await callLocalApi('start', siteName);
  if (ok) {
    await sleep(3000); // give nginx/php a moment to come up
    logger.done(`Site "${siteName}" is live`, `${siteName}.local`);
  }
}
