/**
 * Microsoft Teams app module.
 * Supports new Teams (MSIX/Store) on Windows, and native installs on Mac/Linux.
 * Skips launch if Teams is already running.
 *
 * config.json shape:
 *   "teams": { "enabled": true }
 */
import { execa } from 'execa';
import { isRunning, isWindows, isMac } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'Teams';
export const key = 'teams';

const PROCESS_NAME = { win32: 'ms-teams.exe', darwin: 'Microsoft Teams', linux: 'teams' };

export async function start(config) {
  const cfg = config.apps?.teams;
  if (!cfg?.enabled) return null;

  const procName = PROCESS_NAME[process.platform] ?? 'teams';
  if (await isRunning(procName)) {
    logger.info('Teams already open — skipping');
    return null;
  }

  if (isWindows) {
    try {
      await execa('explorer.exe', ['shell:AppsFolder\\MSTeams_8wekyb3d8bbwe!MSTeams']);
    } catch {
      await execa('cmd', ['/c', 'start', '', 'ms-teams://'], { shell: false });
    }
  } else if (isMac) {
    await execa('open', ['-a', 'Microsoft Teams']);
  } else {
    const sub = execa('teams', [], { detached: true, stdio: 'ignore' });
    sub.unref();
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
