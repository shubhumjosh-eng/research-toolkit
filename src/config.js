require('dotenv').config();

module.exports = {
  // Free news API (no key required for basic use)
  GNEWS_API_KEY: process.env.GNEWS_API_KEY || '',
  
  // Web scraping settings
  SCRAPING: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delayBetweenRequests: 2000, // 2 seconds between requests
    maxRetries: 3,
    timeout: 30000,
  },
  
  // Research pipeline settings
  RESEARCH: {
    newsMaxResults: 50,
    webSearchRatio: 0.2,    // 20% of depth
    webSearchMax: 50,
    redditRatio: 0.7,       // 70% of depth
    youtubeRatio: 0.3,      // 30% of depth
    youtubeMax: 100,
    cacheTTLDays: 1,
  },

  // Puppeteer browser settings
  PUPPETEER: {
    headless: true,         // false = visible browser window
    windowWidth: 400,
    windowHeight: 300,
    timeout: 15000,
  },
  
  // Video analysis settings
  VIDEO: {
    tempDir: '/tmp/research-toolkit/temp',
    maxVideoDuration: 600, // 10 minutes max
    whisperModel: 'base', // tiny, base, small, medium, large
  },
  
  // Report settings
  REPORT: {
    outputDir: './reports',
    templateDir: './src/report/templates',
  },
};
