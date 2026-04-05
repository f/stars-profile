import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.config', 'stars-profile');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

export function getSavedQuery() {
  return readConfig().query || null;
}

export function saveQuery(query) {
  const config = readConfig();
  config.query = query;
  writeConfig(config);
}

export function getSavedToken() {
  return readConfig().token || null;
}

export function saveToken(token) {
  const config = readConfig();
  config.token = token;
  writeConfig(config);
}
