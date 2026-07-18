const puppeteer = require('puppeteer-core');
const config = require('../config');

class DynamicScraper {
  constructor(options = {}) {
    this.browser = null;
    this.headless = options.headless !== undefined ? options.headless : config.PUPPETEER.headless;
    this.windowWidth = options.windowWidth || config.PUPPETEER.windowWidth;
    this.windowHeight = options.windowHeight || config.PUPPETEER.windowHeight;
  }

  static isDisplayAvailable() {
    return !!(process.env.DISPLAY || process.platform === 'darwin' || process.platform === 'win32');
  }

  async launch() {
    const fs = require('fs');
    const path = require('path');

    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];

    // Also check Puppeteer's own bundled Chrome
    const puppeteerCacheDir = path.join(
      require('os').homedir(), '.cache', 'puppeteer', 'chrome'
    );

    let executablePath = null;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.size > 1000000) {
          executablePath = p;
          break;
        }
      }
    }

    if (!executablePath && fs.existsSync(puppeteerCacheDir)) {
      const findChrome = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isFile() && (entry.name === 'chrome' || entry.name === 'chromium')) {
            return full;
          }
          if (entry.isDirectory()) {
            const found = findChrome(full);
            if (found) return found;
          }
        }
        return null;
      };
      executablePath = findChrome(puppeteerCacheDir);
    }

    if (!executablePath) {
      throw new Error('Chrome/Chromium not found. Install with: npm install puppeteer');
    }

    // Auto-fallback to headless if no display available
    const headless = this.headless || !DynamicScraper.isDisplayAvailable();

    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
    if (!headless) {
      launchArgs.push(`--window-size=${this.windowWidth},${this.windowHeight}`);
    }

    this.browser = await puppeteer.launch({
      executablePath,
      headless: headless ? 'new' : false,
      args: launchArgs,
    });
    
    return this.browser;
  }

  async scrape(url, waitForSelector = null, extractFn = null) {
    if (!this.browser) await this.launch();
    
    const page = await this.browser.newPage();
    await page.setUserAgent(config.SCRAPING.userAgent);
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.SCRAPING.timeout,
      });
      
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }
      
      // Wait a bit for dynamic content
      await new Promise(r => setTimeout(r, 2000));
      
      let result;
      
      if (extractFn) {
        result = await page.evaluate(extractFn);
      } else {
        // Default extraction
        result = await page.evaluate(() => {
          return {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            text: document.body.innerText.substring(0, 5000),
            links: [...document.querySelectorAll('a[href]')].slice(0, 50).map(a => ({
              href: a.href,
              text: a.textContent.trim().substring(0, 100),
            })),
          };
        });
      }
      
      result.url = url;
      return result;
    } catch (error) {
      console.error(`Failed to scrape ${url}: ${error.message}`);
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeMultiple(urls, waitForSelector = null, extractFn = null) {
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.scrape(url, waitForSelector, extractFn);
        results.push(result);
      } catch (error) {
        results.push({ url, error: error.message });
      }
    }
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = DynamicScraper;
