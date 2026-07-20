const fs = require('fs');
const { readdir, readFile, writeFile, unlink, stat, mkdir } = require('fs').promises;
const path = require('path');
const os = require('os');

const SESSIONS_DIR = path.join(os.homedir(), '.research-toolkit', 'sessions');
const MAX_SESSIONS = 50;

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

async function ensureDirAsync(dir) {
  try { await mkdir(dir, { recursive: true }); } catch {}
}

function generateId() {
  return 's-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

class SessionStore {
  constructor() {
    ensureDir(SESSIONS_DIR);
  }

  create(topic) {
    const id = generateId();
    const session = {
      id,
      topic,
      startedAt: new Date().toISOString(),
      queries: [],
      results: null,
      reportPath: null,
      metadata: {},
    };
    this.save(session);
    return session;
  }

  save(session) {
    ensureDir(SESSIONS_DIR);
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    this.pruneOld();
  }

  load(sessionId) {
    try {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  addQuery(sessionId, queryData) {
    const session = this.load(sessionId);
    if (!session) return null;

    session.queries.push({
      ...queryData,
      timestamp: new Date().toISOString(),
    });
    this.save(session);
    return session;
  }

  async updateResults(sessionId, results, reportPath) {
    const session = this.load(sessionId);
    if (!session) return null;

    session.results = {
      topic: results.topic,
      timestamp: results.timestamp,
      reddit: Array.isArray(results.reddit) ? results.reddit : [],
      youtube: Array.isArray(results.youtube) ? results.youtube : [],
      news: Array.isArray(results.news) ? results.news : [],
      webSearch: Array.isArray(results.webSearch) ? results.webSearch : [],
      hackernews: Array.isArray(results.hackernews) ? results.hackernews : [],
      bluesky: Array.isArray(results.bluesky) ? results.bluesky : [],
      discourse: Array.isArray(results.discourse) ? results.discourse : [],
      stackexchange: Array.isArray(results.stackexchange) ? results.stackexchange : [],
      semanticScholar: Array.isArray(results.semanticScholar) ? results.semanticScholar : [],
      arxiv: Array.isArray(results.arxiv) ? results.arxiv : [],
    };
    session.reportPath = reportPath;
    session.metadata = results.metadata || {};
    session.completedAt = new Date().toISOString();
    this.save(session);
    return session;
  }

  async listRecent(limit = 20) {
    try {
      await ensureDirAsync(SESSIONS_DIR);
      const files = (await readdir(SESSIONS_DIR))
        .filter(f => f.endsWith('.json'));

      const withStats = await Promise.all(files.map(async f => {
        try {
          const s = await stat(path.join(SESSIONS_DIR, f));
          return { f, mtime: s.mtimeMs };
        } catch { return { f, mtime: 0 }; }
      }));

      withStats.sort((a, b) => b.mtime - a.mtime);
      const top = withStats.slice(0, limit);

      return (await Promise.all(top.map(async ({ f }) => {
        try {
          const raw = await readFile(path.join(SESSIONS_DIR, f), 'utf8');
          const session = JSON.parse(raw);
          return {
            id: session.id,
            topic: session.topic,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            queryCount: session.queries?.length || 0,
            reportPath: session.reportPath,
          };
        } catch {
          return null;
        }
      }))).filter(Boolean);
    } catch {
      return [];
    }
  }

  getAll() {
    return this.listRecent(50);
  }

  pruneOld() {
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(SESSIONS_DIR, a));
          const statB = fs.statSync(path.join(SESSIONS_DIR, b));
          return statB.mtimeMs - statA.mtimeMs;
        });

      if (files.length > MAX_SESSIONS) {
        for (const f of files.slice(MAX_SESSIONS)) {
          fs.unlinkSync(path.join(SESSIONS_DIR, f));
        }
      }
    } catch {}
  }

  delete(sessionId) {
    try {
      fs.unlinkSync(path.join(SESSIONS_DIR, `${sessionId}.json`));
    } catch {}
  }

  async clearAll() {
    try {
      const files = (await readdir(SESSIONS_DIR)).filter(f => f.endsWith('.json'));
      for (const f of files) {
        await unlink(path.join(SESSIONS_DIR, f));
      }
    } catch {}
  }
}

module.exports = new SessionStore();
