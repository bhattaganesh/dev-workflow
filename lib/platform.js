import { execa } from 'execa';
import { spawn } from 'child_process';

export const platform = process.platform;
export const isWindows = platform === 'win32';
export const isMac = platform === 'darwin';
export const isLinux = platform === 'linux';

/**
 * Pick the right path for the current OS from a { win32, darwin, linux } map.
 */
export function getPath(paths = {}) {
  return paths[platform] ?? paths.linux ?? '';
}

/**
 * Launch an app fully detached from this process.
 * Uses spawn() directly — bypasses cmd.exe so paths with (x86), spaces,
 * or other special characters never block or get misparse.
 */
export function launchApp(execPath, args = []) {
  if (!execPath) throw new Error('execPath is empty — check your config.json');

  if (isMac && (execPath.endsWith('.app') || execPath.includes('.app/'))) {
    const child = spawn('open', [execPath, ...args], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const child = spawn(execPath, args, { detached: true, stdio: 'ignore', shell: false });
    child.unref();
  }
}

/**
 * Gracefully close an app by process image name (Windows) or app/process name (Mac/Linux).
 * Sends a normal close signal — does NOT force-kill.
 */
export async function closeApp({ win, mac, linux } = {}) {
  try {
    if (isWindows && win) {
      // /IM without /F = graceful WM_CLOSE (app can prompt to save)
      await execa('taskkill', ['/IM', win]);
    } else if (isMac && mac) {
      await execa('osascript', ['-e', `quit app "${mac}"`]);
    } else if (isLinux && linux) {
      await execa('pkill', ['-SIGTERM', '-f', linux]);
    }
  } catch {
    // Process may already be closed — safe to ignore
  }
}

/**
 * Check if a process is currently running.
 */
export async function isRunning(processName) {
  try {
    if (isWindows) {
      const { stdout } = await execa('tasklist', ['/FI', `IMAGENAME eq ${processName}`, '/NH']);
      return stdout.toLowerCase().includes(processName.toLowerCase());
    } else {
      const { stdout } = await execa('pgrep', ['-f', processName]);
      return stdout.trim().length > 0;
    }
  } catch {
    return false;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
