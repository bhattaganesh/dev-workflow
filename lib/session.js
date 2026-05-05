import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import os from 'os';

const SESSION_PATH = resolve(os.homedir(), '.dev-workflow-session.json');

export function save(apps) {
  writeFileSync(
    SESSION_PATH,
    JSON.stringify({ startedAt: new Date().toISOString(), apps }, null, 2)
  );
}

export function load() {
  if (!existsSync(SESSION_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function clear() {
  if (existsSync(SESSION_PATH)) unlinkSync(SESSION_PATH);
}
