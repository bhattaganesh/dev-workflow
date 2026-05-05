#!/usr/bin/env node
/**
 * Interactive setup wizard.
 * Detects installed apps, auto-installs missing ones via winget (Windows) or
 * brew (Mac), asks a few questions, writes config.json, and links commands
 * globally. Run once after cloning: node setup.js
 */
import { execSync }                                        from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname }                                from 'path';
import { fileURLToPath }                                   from 'url';
import { createInterface }                                 from 'readline/promises';
import os                                                  from 'os';

const ROOT      = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const isMac     = process.platform === 'darwin';
const isLinux   = process.platform === 'linux';

// ── Pre-flight: Node version ──────────────────────────────────────────────────
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  console.error(`\n  Error: Node.js 18+ required (you have ${process.versions.node})`);
  console.error('  Download from https://nodejs.org or upgrade with nvm/fnm.\n');
  process.exit(1);
}

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

/** Check if a CLI command is available in PATH. */
function commandExists(cmd) {
  try {
    execSync(isWindows ? `where ${cmd}` : `which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

/**
 * Try to auto-install an app via winget or brew.
 * Shows the download URL and returns false when no package manager is available
 * or when the app has no package-manager ID (e.g. Local WP).
 */
async function tryInstall(label, { wingetId = null, brewCask = null, downloadUrl }) {
  const canWinget = isWindows && !!wingetId && commandExists('winget');
  const canBrew   = isMac    && !!brewCask  && commandExists('brew');

  if (!canWinget && !canBrew) {
    log.warn(`${label} not found.`);
    log.info(`Download manually: ${downloadUrl}`);
    return false;
  }

  const ans = await ask(`     ${label} not found — install it now? [Y/n]: `);
  if (ans.trim().toLowerCase() === 'n') {
    log.info(`Download ${label}: ${downloadUrl}`);
    return false;
  }

  try {
    if (canWinget) {
      log.step(`Installing ${label} via winget…`);
      execSync(
        `winget install --id ${wingetId} --silent --accept-source-agreements --accept-package-agreements`,
        { stdio: 'inherit' }
      );
    } else {
      log.step(`Installing ${label} via brew…`);
      execSync(`brew install --cask ${brewCask}`, { stdio: 'inherit' });
    }
    log.done(`${label} installed`);
    return true;
  } catch {
    log.warn('Auto-install failed.');
    log.info(`Download ${label} manually: ${downloadUrl}`);
    return false;
  }
}

/** Ask user to confirm a detected path, or enter one manually. */
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

// ── Known install locations ───────────────────────────────────────────────────
const PATHS = {
  localWp: {
    win32 : [
      'C:/Program Files (x86)/Local/Local.exe',
      'C:/Program Files/Local/Local.exe',
      resolve(os.homedir(), 'AppData/Local/Programs/local/Local.exe'),
    ],
    darwin: ['/Applications/Local.app'],
    linux : [],
  },
  chrome: {
    win32 : [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      resolve(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    ],
    darwin: ['/Applications/Google Chrome.app'],
    linux : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
  },
};

// ── Package-manager IDs & download URLs ──────────────────────────────────────
const INSTALL = {
  localWp: {
    wingetId   : null,
    brewCask   : null,
    downloadUrl: 'https://localwp.com/',
  },
  chrome: {
    wingetId   : 'Google.Chrome',
    brewCask   : 'google-chrome',
    downloadUrl: 'https://www.google.com/chrome/',
  },
  teams: {
    wingetId   : 'Microsoft.Teams',
    brewCask   : 'microsoft-teams',
    downloadUrl: 'https://www.microsoft.com/microsoft-teams/download-app',
  },
  vscode: {
    wingetId   : 'Microsoft.VisualStudioCode',
    brewCask   : 'visual-studio-code',
    downloadUrl: 'https://code.visualstudio.com/',
  },
};

const GIT_BASH_PATHS = [
  'C:/Program Files/Git/bin/bash.exe',
  'C:/Program Files (x86)/Git/bin/bash.exe',
  resolve(os.homedir(), 'AppData/Local/Programs/Git/bin/bash.exe'),
];

/** Write terminal profile + default into VSCode's user settings.json. */
function setVSCodeTerminal(shellName, shellPath) {
  const settingsPath = isWindows
    ? resolve(os.homedir(), 'AppData/Roaming/Code/User/settings.json')
    : isMac
      ? resolve(os.homedir(), 'Library/Application Support/Code/User/settings.json')
      : resolve(os.homedir(), '.config/Code/User/settings.json');

  const dir = dirname(settingsPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let settings = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch {}
  }

  if (isWindows) {
    settings['terminal.integrated.profiles.windows'] ??= {};
    settings['terminal.integrated.profiles.windows']['Git Bash'] = { source: 'Git Bash' };
    settings['terminal.integrated.defaultProfile.windows'] = 'Git Bash';
  } else if (isMac) {
    settings['terminal.integrated.profiles.osx'] ??= {};
    settings['terminal.integrated.profiles.osx']['zsh'] = { path: shellPath };
    settings['terminal.integrated.defaultProfile.osx'] = 'zsh';
  } else {
    settings['terminal.integrated.profiles.linux'] ??= {};
    settings['terminal.integrated.profiles.linux']['zsh'] = { path: shellPath };
    settings['terminal.integrated.defaultProfile.linux'] = 'zsh';
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  log.done(`VSCode default terminal → ${shellName}`);
}

// ── Main wizard ───────────────────────────────────────────────────────────────
async function main() {
  const osLabel = isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux';

  log.nl();
  console.log(cyan('╔══════════════════════════════════════════════╗'));
  console.log(cyan('║  ') + bold('🔧  dev-workflow setup wizard'.padEnd(44)) + cyan('  ║'));
  console.log(cyan('╚══════════════════════════════════════════════╝'));
  log.nl();
  log.info(`OS: ${osLabel}  |  Node: ${process.versions.node}`);
  log.info('Press Enter to accept a suggestion, or type your own value.');
  log.nl();

  const config = { apps: {} };

  // ── Local WP ──────────────────────────────────────────────────────────────
  console.log(bold('  Local WP'));
  let detectedLocal = detect(PATHS.localWp[process.platform] ?? []);

  if (!detectedLocal) {
    await tryInstall('Local WP', INSTALL.localWp);
    detectedLocal = detect(PATHS.localWp[process.platform] ?? []);
  }

  const localPath = await confirmPath('Local WP', detectedLocal);

  const siteNames = [];
  if (localPath) {
    console.log(gray('     Enter site names one by one (as shown in Local WP). Leave blank when done.'));
    for (let i = 1; ; i++) {
      const s = (await ask(`     Site ${i} name: `)).trim();
      if (!s) break;
      siteNames.push(s);
      log.done(`Added: ${gray(s)}`);
    }
  }
  log.nl();

  config.apps['local-wp'] = {
    enabled  : !!localPath && siteNames.length > 0,
    siteNames: siteNames,
    execPath : {
      win32 : isWindows ? (localPath ?? '') : 'C:/Program Files (x86)/Local/Local.exe',
      darwin: isMac     ? (localPath ?? '') : '/Applications/Local.app',
      linux : isLinux   ? (localPath ?? '') : '',
    },
  };

  // ── Chrome ────────────────────────────────────────────────────────────────
  console.log(bold('  Chrome'));
  let detectedChrome = detect(PATHS.chrome[process.platform] ?? []);

  if (!detectedChrome) {
    const installed = await tryInstall('Chrome', INSTALL.chrome);
    if (installed) detectedChrome = detect(PATHS.chrome[process.platform] ?? []);
  }

  const chromePath = await confirmPath('Chrome', detectedChrome);
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
  const teamsWinPath = resolve(os.homedir(), 'AppData/Local/Microsoft/WindowsApps/ms-teams.exe');
  let teamsDetected  = isWindows ? existsSync(teamsWinPath) : isMac;

  if (!teamsDetected) {
    const installed = await tryInstall('Microsoft Teams', INSTALL.teams);
    if (installed) teamsDetected = isWindows ? existsSync(teamsWinPath) : isMac;
  } else {
    log.done('Teams detected');
  }

  const teamsAns = await ask(`     Include Teams? [Y/n]: `);
  config.apps.teams = { enabled: teamsAns.trim().toLowerCase() !== 'n' };
  log.nl();

  // ── VSCode ────────────────────────────────────────────────────────────────
  console.log(bold('  VSCode'));
  let codeInPath = commandExists('code');

  if (!codeInPath) {
    const installed = await tryInstall('VSCode', INSTALL.vscode);
    if (installed) {
      codeInPath = commandExists('code');
      if (!codeInPath) {
        log.warn('"code" CLI not yet in PATH.');
        log.info('Open VSCode → Command Palette (Ctrl+Shift+P) →');
        log.info('  "Shell Command: Install \'code\' command in PATH"');
        log.info('Then re-run this setup to finish.');
      }
    }
  } else {
    log.done('VSCode (code CLI) detected');
  }

  console.log(gray('     Enter project paths to open (absolute). Leave blank when done.'));
  const projects = [];
  for (let i = 1; ; i++) {
    const p = (await ask(`     Project ${i} path: `)).trim();
    if (!p) break;
    projects.push(p);
    log.done(`Added: ${gray(p)}`);
  }
  log.nl();

  config.apps.vscode = { enabled: projects.length > 0, projects };

  // ── Shell: Zsh + Oh My Zsh ───────────────────────────────────────────────
  console.log(bold('  Shell — Zsh + autosuggestions'));

  if (isWindows) {
    // Windows: use Git Bash (ships with Git for Windows). Full zsh requires WSL.
    let gitBashPath = detect(GIT_BASH_PATHS);

    if (!gitBashPath) {
      const installed = await tryInstall('Git for Windows (Git Bash)', {
        wingetId   : 'Git.Git',
        brewCask   : null,
        downloadUrl: 'https://git-scm.com/download/win',
      });
      if (installed) gitBashPath = detect(GIT_BASH_PATHS);
    } else {
      log.done('Git Bash detected');
    }

    if (gitBashPath) {
      setVSCodeTerminal('Git Bash', gitBashPath);
    }

    log.info('For full Zsh + Oh My Zsh on Windows, enable WSL:');
    log.info('  https://learn.microsoft.com/windows/wsl/install');

  } else {
    // Mac / Linux
    let zshPath = null;
    try { zshPath = execSync('which zsh', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

    if (!zshPath && isMac && commandExists('brew')) {
      log.step('Installing zsh via brew…');
      try {
        execSync('brew install zsh', { stdio: 'inherit' });
        zshPath = execSync('which zsh', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch { log.warn('brew install zsh failed — install manually.'); }
    }

    if (!zshPath && isLinux) {
      const installCmd = commandExists('apt-get') ? 'sudo apt-get install -y zsh'
                       : commandExists('dnf')     ? 'sudo dnf install -y zsh'
                       : commandExists('pacman')  ? 'sudo pacman -S --noconfirm zsh'
                       : null;
      if (installCmd) {
        log.warn('Zsh not found. Run this, then re-run node setup.js:');
        log.info(`  ${installCmd}`);
      }
    }

    if (zshPath) {
      log.done(`Zsh: ${zshPath}`);

      // Oh My Zsh
      const omzDir = resolve(os.homedir(), '.oh-my-zsh');
      if (!existsSync(omzDir)) {
        const omzAns = await ask('     Install Oh My Zsh + autosuggestions? [Y/n]: ');
        if (omzAns.trim().toLowerCase() !== 'n') {
          try {
            log.step('Installing Oh My Zsh…');
            execSync(
              'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended',
              { stdio: 'inherit' }
            );
            log.done('Oh My Zsh installed');

            // zsh-autosuggestions plugin
            const suggestDir = resolve(os.homedir(), '.oh-my-zsh/custom/plugins/zsh-autosuggestions');
            if (!existsSync(suggestDir)) {
              execSync(`git clone https://github.com/zsh-users/zsh-autosuggestions "${suggestDir}"`, { stdio: 'inherit' });
              const zshrc = resolve(os.homedir(), '.zshrc');
              if (existsSync(zshrc)) {
                let content = readFileSync(zshrc, 'utf8');
                content = content.replace(/^(plugins=\()([^)]*?)(\))/m, (_, open, inner, close) =>
                  inner.includes('zsh-autosuggestions')
                    ? `${open}${inner}${close}`
                    : `${open}${inner.trim()} zsh-autosuggestions${close}`
                );
                writeFileSync(zshrc, content);
              }
              log.done('zsh-autosuggestions installed');
            }
          } catch (err) {
            log.warn(`Oh My Zsh install failed: ${err.message}`);
            log.info('Install manually: https://ohmyz.sh/#install');
          }
        }
      } else {
        log.done('Oh My Zsh already installed');
      }

      setVSCodeTerminal('zsh', zshPath);
    }
  }
  log.nl();

  // ── Write config.json ─────────────────────────────────────────────────────
  rl.close();

  const configPath = resolve(ROOT, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.done('config.json saved');
  log.nl();

  // ── Install npm deps ──────────────────────────────────────────────────────
  log.step('Installing npm dependencies…');
  execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
  log.done('Dependencies installed');
  log.nl();

  // ── Link commands globally ────────────────────────────────────────────────
  log.step('Linking commands globally (npm link)…');
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
