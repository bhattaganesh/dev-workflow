/**
 * Microsoft Teams app module.
 * Uses the WindowsApps symlink path which works for new Teams (MSIX) on all Windows installs.
 * Skips launch if Teams is already running.
 *
 * config.json shape:
 *   "teams": { "enabled": true }
 */
import { execa } from 'execa';
import { spawn } from 'child_process';
import { resolve } from 'path';
import os from 'os';
import { isRunning, isWindows, isMac } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'Teams';
export const key = 'teams';

// WindowsApps symlink — present on all Windows 10/11 machines with new Teams installed
const TEAMS_WIN_PATH = resolve(os.homedir(), 'AppData/Local/Microsoft/WindowsApps/ms-teams.exe');

export async function start(config) {
  const cfg = config.apps?.teams;
  if (!cfg?.enabled) return null;

  if (isWindows) {
    const alreadyRunning = await isRunning('ms-teams.exe');
    if (alreadyRunning) {
      logger.info('Teams already open — skipping');
      return null;
    }
    // Launching via URI opens the UI immediately; spawning the exe starts it in the tray
    const child = spawn('explorer.exe', ['ms-teams:'], { detached: true, stdio: 'ignore' });
    child.unref();
  } else if (isMac) {
    const alreadyRunning = await isRunning('Microsoft Teams');
    if (alreadyRunning) {
      logger.info('Teams already open — skipping');
      return null;
    }
    await execa('open', ['-a', 'Microsoft Teams']);
  } else {
    const alreadyRunning = await isRunning('teams');
    if (alreadyRunning) {
      logger.info('Teams already open — skipping');
      return null;
    }
    const child = spawn('teams', [], { detached: true, stdio: 'ignore' });
    child.unref();
  }

  return { key };
}

export async function stop(_session, config) {
  const cfg = config.apps?.teams;
  if (!cfg?.enabled) return;

  try {
    if (isWindows) {
      await execa('taskkill', ['/IM', 'ms-teams.exe']).catch(() =>
        execa('taskkill', ['/IM', 'Teams.exe'])
      );
    } else if (isMac) {
      await execa('osascript', ['-e', 'quit app "Microsoft Teams"']);
    } else {
      await execa('pkill', ['-SIGTERM', '-f', 'teams']);
    }
  } catch {
    // Already closed
  }
}
