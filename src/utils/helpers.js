const fs = require('fs').promises;
const path = require('path');

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
}

function truncate(str, len = 200) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = { ensureDir, sleep, sanitizeFilename, truncate, formatDate };
