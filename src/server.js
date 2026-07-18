const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs').promises;
const { ensureDir } = require('./utils/helpers');
const orchestrator = require('./research/orchestrator');
const { analyzeBatch } = require('./utils/sentiment');
const config = require('./config');
const DynamicScraper = require('./scraping/browserScraper');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
let isRunning = false;

async function init() {
  await ensureDir(REPORTS_DIR);
}

init();

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function log(level, msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  broadcast({ type: 'log', time, level, msg });
  const prefix = { info: '  ', success: '✓ ', warn: '⚠ ', error: '✕ ' }[level] || '  ';
  console.log(`[${time}] ${prefix} ${msg}`);
}

const onLog = (level, msg) => log(level, msg);

app.post('/api/research', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Research already in progress' });
  }

  const { topic, depth = 500, redditOnly = false, youtubeOnly = false } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  isRunning = true;
  res.json({ status: 'started', topic });

  const startTime = Date.now();
  const scraper = new DynamicScraper({ headless: config.PUPPETEER.headless });

  try {
    broadcast({ type: 'progress', step: 'start', topic, depth });
    log('info', `Research started: "${topic}" (depth: ${depth})`);

    broadcast({ type: 'progress', step: 'sources', message: 'Discovering relevant sources...' });
    log('info', 'Discovering relevant subreddits...');

    const topicAnalyzer = require('./research/topicAnalyzer');
    const subreddits = await topicAnalyzer.discoverSubreddits(topic);
    const queries = topicAnalyzer.buildSearchQueries(topic);

    broadcast({ type: 'progress', step: 'sources', message: `Found ${subreddits.length} subreddits`, count: subreddits.length });
    log('success', `Found ${subreddits.length} subreddits: ${subreddits.slice(0, 5).map(s => 'r/' + s.name).join(', ')}${subreddits.length > 5 ? '...' : ''}`);

    let newsResults = [];
    if (!youtubeOnly) {
      broadcast({ type: 'progress', step: 'news', message: 'Searching news articles...', current: 0, target: config.RESEARCH.newsMaxResults });
      log('info', '📰 Searching news articles...');
      try {
        const newsApi = require('./sources/newsApi');
        newsResults = await newsApi.search(topic, { maxResults: Math.min(depth, config.RESEARCH.newsMaxResults), onLog });
        broadcast({ type: 'progress', step: 'news', message: `Found ${newsResults.length} articles`, current: newsResults.length, target: newsResults.length });
        log('success', `Found ${newsResults.length} news articles`);
      } catch (e) {
        broadcast({ type: 'progress', step: 'news', message: `News failed: ${e.message}` });
        log('error', `News search failed: ${e.message}`);
      }
    }

    let webSearchResults = [];
    if (!youtubeOnly) {
      const webTarget = Math.min(Math.ceil(depth * config.RESEARCH.webSearchRatio), config.RESEARCH.webSearchMax);
      broadcast({ type: 'progress', step: 'web', message: 'Searching the web...', current: 0, target: webTarget });
      log('info', '🌐 Searching the web...');
      try {
        const webSearch = require('./sources/webSearch');
        webSearchResults = await webSearch.search(topic, { maxResults: webTarget, onLog, scraper });
        broadcast({ type: 'progress', step: 'web', message: `Found ${webSearchResults.length} results`, current: webSearchResults.length, target: webTarget });
        log('success', `Found ${webSearchResults.length} web results`);
      } catch (e) {
        broadcast({ type: 'progress', step: 'web', message: `Web search failed: ${e.message}` });
        log('error', `Web search failed: ${e.message}`);
      }
    }

    let redditResults = [];
    if (!youtubeOnly) {
      const redditTarget = Math.ceil(depth * config.RESEARCH.redditRatio);
      broadcast({ type: 'progress', step: 'reddit', message: 'Scraping Reddit...', current: 0, target: redditTarget });
      log('info', '🔴 Scraping Reddit...');

      try {
        const redditBulk = require('./research/redditBulk');
        redditResults = await redditBulk.scrapeAll(subreddits, queries, redditTarget, (p) => {
          broadcast({ type: 'progress', step: 'reddit', message: `r/${p.currentSub}`, current: p.posts, target: p.target, comments: p.comments });
        }, onLog, { scraper });
        broadcast({ type: 'progress', step: 'reddit', message: `Done! ${redditResults.length} posts`, current: redditResults.length, target: redditTarget });
      } catch (e) {
        broadcast({ type: 'progress', step: 'reddit', message: `Reddit failed: ${e.message}` });
        log('error', `Reddit scraping failed: ${e.message}`);
      }
    }

    let youtubeResults = [];
    if (!redditOnly) {
      const youtubeTarget = Math.min(Math.ceil(depth * config.RESEARCH.youtubeRatio), config.RESEARCH.youtubeMax);
      broadcast({ type: 'progress', step: 'youtube', message: 'Discovering YouTube videos...', current: 0, target: youtubeTarget });
      log('info', '📺 Discovering YouTube videos...');

      try {
        const youtubeDiscovery = require('./research/youtubeSearch');
        youtubeResults = await youtubeDiscovery.discover(topic, youtubeTarget, (p) => {
          broadcast({ type: 'progress', step: 'youtube', message: p.currentQuery, current: p.videos, target: p.target });
        }, onLog, { scraper });
        broadcast({ type: 'progress', step: 'youtube', message: `Found ${youtubeResults.length} videos`, current: youtubeResults.length, target: youtubeTarget });
      } catch (e) {
        broadcast({ type: 'progress', step: 'youtube', message: `YouTube failed: ${e.message}` });
        log('error', `YouTube discovery failed: ${e.message}`);
      }
    }

    broadcast({ type: 'progress', step: 'report', message: 'Generating report...' });
    log('info', '📊 Generating report...');

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const results = { topic, reddit: redditResults, youtube: youtubeResults, news: newsResults, webSearch: webSearchResults };
    const clusters = orchestrator.clusterTopics(redditResults, topic);
    const sentiment = analyzeBatch(redditResults);
    const authorProfiles = orchestrator.buildAuthorProfiles(redditResults);

    const reportData = {
      executiveSummary: orchestrator.generateSummary(results),
      clusters,
      sentiment,
      authorProfiles,
      redditAnalysis: redditResults,
      youtubeAnalysis: youtubeResults,
      newsAnalysis: newsResults,
      webSearchAnalysis: webSearchResults,
      metadata: {
        topic,
        timestamp: new Date().toISOString(),
        depth,
        duration: `${minutes}m ${seconds}s`,
        redditPosts: redditResults.length,
        youtubeVideos: youtubeResults.length,
        newsArticles: newsResults.length,
        webSearchResults: webSearchResults.length,
        totalComments: redditResults.reduce((sum, p) => sum + (p.topComments?.length || 0), 0),
      },
    };

    const filename = `research-${topic.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${Date.now()}.html`;
    const filepath = path.join(REPORTS_DIR, filename);

    const pdfGenerator = require('./report/reportGenerator');
    await pdfGenerator.generateResearchReport(reportData, filepath);

    log('success', `Report saved: ${filename}`);
    log('info', `Duration: ${minutes}m ${seconds}s | Reddit: ${redditResults.length} | YouTube: ${youtubeResults.length} | News: ${newsResults.length} | Web: ${webSearchResults.length}`);

    broadcast({
      type: 'complete',
      filename,
      metadata: reportData.metadata,
      url: `/api/reports/${filename}`,
    });

  } catch (error) {
    broadcast({ type: 'error', message: error.message });
  } finally {
    await scraper.close().catch(() => {});
    isRunning = false;
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const files = await fs.readdir(REPORTS_DIR);
    const reports = files
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        name: f,
        url: `/api/reports/${f}`,
        created: f,
      }))
      .sort((a, b) => b.created.localeCompare(a.created));
    res.json(reports);
  } catch {
    res.json([]);
  }
});

app.get('/api/reports/:name', async (req, res) => {
  const filepath = path.join(REPORTS_DIR, req.params.name);
  try {
    const content = await fs.readFile(filepath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch {
    res.status(404).json({ error: 'Report not found' });
  }
});

const PORT = process.env.PORT || 3000;

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  wss.clients.forEach(client => client.close());
  wss.close();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  Research Toolkit - Web UI`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  Reports: ${REPORTS_DIR}`);
  console.log(`${'='.repeat(50)}\n`);

  const url = `http://localhost:${PORT}`;
  try {
    if (process.platform === 'darwin') {
      require('child_process').exec(`open ${url}`);
    } else if (process.platform === 'win32') {
      require('child_process').exec(`start ${url}`);
    } else if (process.env.DISPLAY) {
      require('child_process').exec(`xdg-open ${url}`);
    }
  } catch (e) {
    // Browser open failed, that's fine - user can open manually
  }
});
