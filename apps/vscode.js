/**
 * Visual Studio Code app module.
 * Opens each configured project in its own VSCode window.
 * Skips launch if VSCode is already running.
 *
 * config.json shape:
 *   "vscode": {
 *     "enabled": true,
 *     "projects": ["/absolute/path/to/project-a", "/absolute/path/to/project-b"]
 *   }
 */
import { execa } from 'execa';
import { isRunning, isWindows, isMac, sleep } from '../lib/platform.js';
import * as logger from '../lib/logger.js';

export const name = 'VSCode';
export const key = 'vscode';

export async function start(config) {
  const cfg = config.apps?.vscode;
  if (!cfg?.enabled) return null;

  const projects = cfg.projects ?? [];
  if (projects.length === 0) {
    logger.warn('VSCode: no projects configured in config.json');
    return null;
  }

  const alreadyRunning = await isRunning('Code.exe');
  if (alreadyRunning) {
    logger.info('VSCode already open — opening projects in new windows');
  }

  for (const projectPath of projects) {
    try {
      await execa('code', ['-n', projectPath]);
      await sleep(600);
    } catch {
      logger.warn(`VSCode: could not open ${projectPath} — is "code" in your PATH?`);
    }
  }

  return { key };
}

export async function stop(_session, config) {
  const cfg = config.apps?.vscode;
  if (!cfg?.enabled) return;

  try {
    if (isWindows) {
      await execa('taskkill', ['/IM', 'Code.exe']);
    } else if (isMac) {
      await execa('osascript', ['-e', 'quit app "Visual Studio Code"']);
    } else {
      await execa('pkill', ['-SIGTERM', 'code']);
    }
  } catch {
    // Already closed
  }
}
