const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSIONS_DIR = path.join(os.homedir(), '.research-toolkit', 'sessions');
const MAX_SESSIONS = 50;

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
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

  updateResults(sessionId, results, reportPath) {
    const session = this.load(sessionId);
    if (!session) return null;

    session.results = {
      topic: results.topic,
      timestamp: results.timestamp,
      redditCount: results.reddit?.length || 0,
      youtubeCount: results.youtube?.length || 0,
      newsCount: results.news?.length || 0,
      webCount: results.webSearch?.length || 0,
      hackernewsCount: results.hackernews?.length || 0,
      blueskyCount: results.bluesky?.length || 0,
      discourseCount: results.discourse?.length || 0,
      stackexchangeCount: results.stackexchange?.length || 0,
    };
    session.reportPath = reportPath;
    session.metadata = results.metadata || {};
    session.completedAt = new Date().toISOString();
    this.save(session);
    return session;
  }

  listRecent(limit = 20) {
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(SESSIONS_DIR, a));
          const statB = fs.statSync(path.join(SESSIONS_DIR, b));
          return statB.mtimeMs - statA.mtimeMs;
        })
        .slice(0, limit);

      return files.map(f => {
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8');
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
      }).filter(Boolean);
    } catch {
      return [];
    }
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

  clearAll() {
    try {
      const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
      for (const f of files) {
        fs.unlinkSync(path.join(SESSIONS_DIR, f));
      }
    } catch {}
  }
}

module.exports = new SessionStore();
