#!/usr/bin/env node
/**
 * Interactive setup wizard.
 * Auto-detects app paths, asks a few questions, writes config.json, links commands globally.
 * Run once after cloning: node setup.js
 */
import { execSync }                                        from 'child_process';
import { existsSync, writeFileSync }                       from 'fs';
import { resolve, dirname }                                from 'path';
import { fileURLToPath }                                   from 'url';
import { createInterface }                                 from 'readline/promises';
import os                                                  from 'os';

const ROOT      = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const isMac     = process.platform === 'darwin';
const isLinux   = process.platform === 'linux';

// ── Colours ───────────────────────────────────────────────────────────────────
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const gray   = (s) => `\x1b[90m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const log = {
  done : (msg) => console.log(green ('  ✓  ') + msg),
  step : (msg) => console.log(cyan  ('  →  ') + msg),
  warn : (msg) => console.log(yellow('  ⚠  ') + yellow(msg)),
  info : (msg) => console.log(gray  ('  •  ') + gray(msg)),
  nl   : ()    => console.log(''),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl  = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => rl.question(q);

/** Return first path in list that actually exists on disk. */
function detect(paths) {
  return paths.find((p) => existsSync(p)) ?? null;
}

/** Ask user to confirm or override a detected path. */
async function confirmPath(label, detected) {
  if (detected) {
    log.done(`${label} detected`);
    log.info(detected);
    const ans = await ask(`     Use this path? [Y/n]: `);
    if (ans.trim().toLowerCase() === 'n') {
      const custom = await ask(`     Enter path: `);
      return custom.trim() || detected;
    }
    return detected;
  }
  log.warn(`${label} not found automatically.`);
  const custom = await ask(`     Enter path manually (or leave blank to skip): `);
  return custom.trim() || null;
}

// ── Known default paths ───────────────────────────────────────────────────────
const PATHS = {
  localWp: {
    win32 : ['C:/Program Files (x86)/Local/Local.exe', 'C:/Program Files/Local/Local.exe'],
    darwin: ['/Applications/Local.app'],
    linux : [],
  },
  chrome: {
    win32 : [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    ],
    darwin: ['/Applications/Google Chrome.app'],
    linux : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
  },
};

// ── Main wizard ───────────────────────────────────────────────────────────────
async function main() {
  const os_label = isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux';

  log.nl();
  console.log(cyan('╔══════════════════════════════════════════════╗'));
  console.log(cyan('║  ') + bold('🔧  dev-workflow setup wizard'.padEnd(44)) + cyan('  ║'));
  console.log(cyan('╚══════════════════════════════════════════════╝'));
  log.nl();
  log.info(`OS: ${os_label}`);
  log.info("Press Enter to accept a suggestion, or type your own value.");
  log.nl();

  const config = { apps: {} };

  // ── Local WP ──────────────────────────────────────────────────────────────
  console.log(bold('  Local WP'));
  const detectedLocal = detect(PATHS.localWp[process.platform] ?? []);
  const localPath     = await confirmPath('Local WP', detectedLocal);

  let siteName = '';
  if (localPath) {
    siteName = (await ask(`     Site name shown in Local WP app: `)).trim();
  }
  log.nl();

  config.apps['local-wp'] = {
    enabled : !!localPath,
    siteName: siteName,
    execPath: {
      win32 : isWindows ? (localPath ?? '') : 'C:/Program Files (x86)/Local/Local.exe',
      darwin: isMac     ? (localPath ?? '') : '/Applications/Local.app',
      linux : isLinux   ? (localPath ?? '') : '',
    },
  };

  // ── Chrome ────────────────────────────────────────────────────────────────
  console.log(bold('  Chrome'));
  const detectedChrome = detect(PATHS.chrome[process.platform] ?? []);
  const chromePath     = await confirmPath('Chrome', detectedChrome);
  log.nl();

  config.apps.chrome = {
    enabled : !!chromePath,
    execPath: {
      win32 : isWindows ? (chromePath ?? '') : 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      darwin: isMac     ? (chromePath ?? '') : '/Applications/Google Chrome.app',
      linux : isLinux   ? (chromePath ?? '') : 'google-chrome',
    },
  };

  // ── Teams ─────────────────────────────────────────────────────────────────
  console.log(bold('  Microsoft Teams'));
  const teamsDetected = isWindows
    ? existsSync(resolve(os.homedir(), 'AppData/Local/Microsoft/WindowsApps/ms-teams.exe'))
    : isMac;

  if (teamsDetected) log.done('Teams detected');
  else               log.warn('Teams not detected on this machine');

  const teamsAns = await ask(`     Include Teams? [Y/n]: `);
  config.apps.teams = { enabled: teamsAns.trim().toLowerCase() !== 'n' };
  log.nl();

  // ── VSCode ────────────────────────────────────────────────────────────────
  console.log(bold('  VSCode — projects to open'));
  console.log(gray('     Enter absolute paths one by one. Leave blank when done.'));

  const projects = [];
  for (let i = 1; ; i++) {
    const p = (await ask(`     Project ${i} path: `)).trim();
    if (!p) break;
    projects.push(p);
    log.done(`Added: ${gray(p)}`);
  }
  log.nl();

  config.apps.vscode = { enabled: projects.length > 0, projects };

  // ── Write config.json ─────────────────────────────────────────────────────
  rl.close();

  const configPath = resolve(ROOT, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.done('config.json saved');
  log.nl();

  // ── Install deps ──────────────────────────────────────────────────────────
  log.step('Installing npm dependencies...');
  execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
  log.done('Dependencies installed');
  log.nl();

  // ── Link globally ─────────────────────────────────────────────────────────
  log.step('Linking commands globally (npm link)...');
  try {
    execSync('npm link', { cwd: ROOT, stdio: 'inherit' });
    log.done('Commands linked');
  } catch {
    log.warn('npm link failed.');
    if (isWindows) log.info('Try: Run terminal as Administrator, then run node setup.js again.');
    else           log.info('Try: sudo npm link  — or switch to a version manager (nvm/fnm).');
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  log.nl();
  console.log(green(bold('  ✅  All done!')));
  log.nl();
  console.log('  Two commands are now available in every terminal:');
  console.log(cyan('     work-start') + '  — boots your full dev environment');
  console.log(cyan('     work-end  ') + '  — shuts everything down gracefully');
  log.nl();
}

main().catch((err) => {
  console.error('\n  Error:', err.message);
  rl.close();
  process.exit(1);
});
