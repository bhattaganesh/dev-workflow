/**
 * Google Chrome app module.
 * Launches Chrome and restores its last session automatically.
 *
 * config.json shape:
 *   "chrome": {
 *     "enabled": true,
 *     "execPath": { "win32": "...", "darwin": "...", "linux": "google-chrome" }
 *   }
 */
import { execa } from 'execa';
import { getPath, launchApp, isWindows, isMac } from '../lib/platform.js';

export const name = 'Chrome';
export const key = 'chrome';

const DEFAULTS = {
  win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  darwin: '/Applications/Google Chrome.app',
  linux: 'google-chrome',
};

export async function start(config) {
  const cfg = config.apps?.chrome;
  if (!cfg?.enabled) return null;

  const execPath = getPath(cfg.execPath ?? {}) || getPath(DEFAULTS);
  await launchApp(execPath);
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
