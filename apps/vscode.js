/**
 * Visual Studio Code app module.
 * Opens each configured project in its own VSCode window.
 *
 * config.json shape:
 *   "vscode": {
 *     "enabled": true,
 *     "projects": ["/path/to/project-a", "/path/to/project-b"]
 *   }
 */
import { execa } from 'execa';
import { isWindows, isMac, sleep } from '../lib/platform.js';
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

  for (const projectPath of projects) {
    try {
      // -n opens each project in a new window
      await execa('code', ['-n', projectPath]);
      await sleep(600); // small gap so windows don't stack on top of each other
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
      // Without /F, VSCode receives a normal close and prompts to save unsaved files
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
