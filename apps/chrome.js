/**
 * Google Chrome app module.
 * Launches Chrome and restores its last session automatically.
 * Skips launch if Chrome is already running.
 *
 * config.json shape:
 *   "chrome": {
 *     "enabled": true,
 *     "execPath": { "win32": "...", "darwin": "...", "linux": "google-chrome" }
 *   }
 */
import { execa } from 'execa';
import { resolve } from 'path';
import os from 'os';
import { getPath, launchApp, isRunning, isWindows, isMac } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'Chrome';
export const key = 'chrome';

// Array values: getPath() picks the first path that exists on disk,
// covering both system-level and user-level Chrome installs.
const DEFAULTS = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    resolve(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
  ],
  darwin: '/Applications/Google Chrome.app',
  linux: 'google-chrome',
};

const PROCESS_NAME = { win32: 'chrome.exe', darwin: 'Google Chrome', linux: 'chrome' };

export async function start(config) {
  const cfg = config.apps?.chrome;
  if (!cfg?.enabled) return null;

  const procName = PROCESS_NAME[process.platform] ?? 'chrome';
  if (await isRunning(procName)) {
    logger.info('Chrome already open — skipping');
    return null;
  }

  const execPath = getPath(cfg.execPath ?? {}) || getPath(DEFAULTS);
  launchApp(execPath);
  return { key };
}

export async function stop(_session, config) {
  const cfg = config.apps?.chrome;
  if (!cfg?.enabled) return;

  try {
    if (isWindows) {
      await execa('taskkill', ['/IM', 'chrome.exe']);
    } else if (isMac) {
      await execa('osascript', ['-e', 'quit app "Google Chrome"']);
    } else {
      await execa('pkill', ['-SIGTERM', 'chrome']);
    }
  } catch {
    // Already closed
  }
}
