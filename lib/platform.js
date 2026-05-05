import { execa } from 'execa';

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
 * Launch an app and detach it from this process so it stays open after the script exits.
 */
export async function launchApp(execPath, args = []) {
  if (!execPath) throw new Error('execPath is empty — check your config.json');

  if (isWindows) {
    // cmd /c start handles spaces in paths and detaches automatically
    await execa('cmd', ['/c', 'start', '', execPath, ...args], { shell: false });
  } else if (isMac) {
    if (execPath.endsWith('.app') || execPath.includes('.app/')) {
      await execa('open', [execPath, ...args]);
    } else {
      const sub = execa(execPath, args, { detached: true, stdio: 'ignore' });
      sub.unref();
    }
  } else {
    const sub = execa(execPath, args, { detached: true, stdio: 'ignore' });
    sub.unref();
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
