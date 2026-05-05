/**
 * Microsoft Teams app module.
 * Supports new Teams (MSIX/Store) on Windows, and native installs on Mac/Linux.
 *
 * config.json shape:
 *   "teams": { "enabled": true }
 *   No execPath needed — Teams is launched via protocol/system on all platforms.
 */
import { execa } from 'execa';
import { isWindows, isMac } from '../lib/platform.js';

export const name = 'Teams';
export const key = 'teams';

export async function start(config) {
  const cfg = config.apps?.teams;
  if (!cfg?.enabled) return null;

  if (isWindows) {
    // New Teams (MSIX) — launch via shell app folder
    try {
      await execa('explorer.exe', ['shell:AppsFolder\\MSTeams_8wekyb3d8bbwe!MSTeams']);
    } catch {
      // Fallback: classic Teams via URI protocol
      await execa('cmd', ['/c', 'start', '', 'ms-teams://'], { shell: false });
    }
  } else if (isMac) {
    await execa('open', ['-a', 'Microsoft Teams']);
  } else {
    const sub = (await import('execa')).execa('teams', [], { detached: true, stdio: 'ignore' });
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
