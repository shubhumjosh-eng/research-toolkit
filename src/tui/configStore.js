const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.research-toolkit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  reportFormat: 'both',
  depth: 500,
  theme: 'auto',
  historySize: 20,
};

function load() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(updates) {
  const current = load();
  const merged = { ...current, ...updates };
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  } catch {}
  return merged;
}

function get(key) {
  return load()[key];
}

function set(key, value) {
  return save({ [key]: value });
}

module.exports = { load, save, get, set, DEFAULTS, CONFIG_FILE };
