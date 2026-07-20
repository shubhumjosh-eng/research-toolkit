require('dotenv').config();
const path = require('path');
const os = require('os');

module.exports = {
  GNEWS_API_KEY: process.env.GNEWS_API_KEY || '',
  BLUESKY_IDENTIFIER: process.env.BLUESKY_IDENTIFIER || '',
  BLUESKY_PASSWORD: process.env.BLUESKY_PASSWORD || '',
  STACKEXCHANGE_API_KEY: process.env.STACKEXCHANGE_API_KEY || '',

  SCRAPING: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    delayBetweenRequests: 2000,
    maxRetries: 3,
    timeout: 30000,
  },

  RESEARCH: {
    newsMaxResults: 50,
    webSearchRatio: 0.15,
    webSearchMax: 50,
    redditRatio: 0.1,
    youtubeRatio: 0.25,
    youtubeMax: 100,
    hackernewsRatio: 0.1,
    blueskyRatio: 0.1,
    discourseRatio: 0.1,
    stackexchangeRatio: 0.1,
    cacheTTLDays: 1,
  },

  PUPPETEER: {
    headless: true,
    windowWidth: 1280,
    windowHeight: 800,
    timeout: 15000,
  },

  VIDEO: {
    tempDir: path.join(os.tmpdir(), 'research-toolkit', 'temp'),
    maxVideoDuration: 600,
    whisperModel: 'base',
  },

  REPORT: {
    outputDir: './reports',
    templateDir: './src/report/templates',
  },
};
