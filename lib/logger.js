import chalk from 'chalk';

export function banner(title, subtitle = '') {
  const width = 46;
  const pad = (s) => s.padEnd(width - 4);
  console.log('');
  console.log(chalk.cyan('╔' + '═'.repeat(width) + '╗'));
  console.log(chalk.cyan('║  ') + chalk.bold.white(pad(title)) + chalk.cyan('  ║'));
  if (subtitle) {
    console.log(chalk.cyan('║  ') + chalk.gray(pad(subtitle)) + chalk.cyan('  ║'));
  }
  console.log(chalk.cyan('╚' + '═'.repeat(width) + '╝'));
  console.log('');
}

export function step(msg) {
  console.log(chalk.cyan('  →') + '  ' + msg);
}

export function done(msg, note = '') {
  const suffix = note ? chalk.gray(`  (${note})`) : '';
  console.log(chalk.green('  ✓') + '  ' + msg + suffix);
}

export function warn(msg) {
  console.log(chalk.yellow('  ⚠') + '  ' + chalk.yellow(msg));
}

export function error(msg) {
  console.log(chalk.red('  ✗') + '  ' + chalk.red(msg));
}

export function info(msg) {
  console.log(chalk.gray('  •') + '  ' + chalk.gray(msg));
}

export function newline() {
  console.log('');
}

export function startSummary(elapsedSec, started, failed) {
  newline();
  if (failed.length === 0) {
    console.log(chalk.bold.green(`  ✅  Ready in ${elapsedSec}s — have a great session!`));
  } else {
    console.log(chalk.bold.yellow(`  ⚠   ${started.length} app(s) up in ${elapsedSec}s — failed: ${failed.join(', ')}`));
  }
  newline();
}

export function endSummary(elapsedSec) {
  newline();
  console.log(chalk.bold.blue(`  👋  Session ended in ${elapsedSec}s — see you next time!`));
  newline();
}
