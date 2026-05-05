#!/usr/bin/env node
/**
 * One-time setup — run this after cloning:
 *   node setup.js
 *
 * What it does:
 *   1. Installs npm dependencies
 *   2. Creates config.json from the template (if not already present)
 *   3. Links work-start and work-end globally so they work in any terminal
 */
import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow= (s) => `\x1b[33m${s}\x1b[0m`;
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;

function step(msg)  { console.log(cyan('  →') + '  ' + msg); }
function done(msg)  { console.log(green('  ✓') + '  ' + msg); }
function warn(msg)  { console.log(yellow('  ⚠') + '  ' + msg); }
function info(msg)  { console.log('     ' + msg); }

console.log('');
console.log(cyan('╔══════════════════════════════════════════════╗'));
console.log(cyan('║  ') + bold('🔧  dev-workflow setup'.padEnd(44)) + cyan('  ║'));
console.log(cyan('╚══════════════════════════════════════════════╝'));
console.log('');

// 1. Install dependencies
step('Installing dependencies...');
execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
done('Dependencies installed');
console.log('');

// 2. Config
const configPath  = resolve(ROOT, 'config.json');
const examplePath = resolve(ROOT, 'config.example.json');

if (!existsSync(configPath)) {
  copyFileSync(examplePath, configPath);
  done('config.json created from template');
  warn('Edit config.json with your local app paths before running work-start');
  info(`Open: ${configPath}`);
} else {
  done('config.json already exists — skipping');
}
console.log('');

// 3. Link globally
step('Linking commands globally (npm link)...');
try {
  execSync('npm link', { cwd: ROOT, stdio: 'inherit' });
  done('Commands linked!');
} catch {
  warn('npm link failed — try running as administrator (Windows) or with sudo (Mac/Linux)');
  info('Alternatively, add this folder to your PATH manually.');
}

console.log('');
console.log(green(bold('  ✅  Setup complete!')));
console.log('');
console.log('  Commands now available in any terminal:');
console.log(cyan('     work-start') + '  — spin up your dev environment');
console.log(cyan('     work-end  ') + '  — shut it all down gracefully');
console.log('');
console.log('  Next step: edit config.json with your app paths, then run:');
console.log(cyan('     work-start'));
console.log('');
