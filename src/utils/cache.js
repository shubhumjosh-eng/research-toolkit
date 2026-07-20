const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { ensureDir, sanitizeFilename } = require('./helpers');

const CACHE_DIR = path.join(process.cwd(), 'cache');
const DEFAULT_TTL_MS = (config.RESEARCH.cacheTTLDays || 1) * 24 * 60 * 60 * 1000;

class Cache {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }

  getKey(topic, source) {
    const normalized = sanitizeFilename(topic.toLowerCase());
    return path.join(CACHE_DIR, `${normalized}-${source}.json`);
  }

  async get(topic, source) {
    if (!this.enabled) return null;

    const filePath = this.getKey(topic, source);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const entry = JSON.parse(raw);

      if (Date.now() - entry.timestamp > this.ttlMs) {
        await fs.unlink(filePath).catch(() => {});
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set(topic, source, data) {
    if (!this.enabled || !data || data.length === 0) return;

    if (!Array.isArray(data) || data.length === 0) return;

    await ensureDir(CACHE_DIR);
    const filePath = this.getKey(topic, source);

    const entry = {
      timestamp: Date.now(),
      topic,
      source,
      count: data.length,
      data,
    };

    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
  }

  async clear() {
    try {
      const files = await fs.readdir(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
      }
    } catch {
      // Cache dir doesn't exist, nothing to clear
    }
  }
}

module.exports = new Cache();
