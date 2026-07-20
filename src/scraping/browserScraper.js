const puppeteer = require('puppeteer-core');
const config = require('../config');
const { execSync } = require('child_process');

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
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
    }

    const fs = require('fs');
    const path = require('path');

    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ];

    let executablePath = null;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    if (!executablePath) {
      try {
        executablePath = execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
      } catch {}
    }

    if (!executablePath) {
      throw new Error('Chrome/Chromium not found. Install with: apt install chromium');
    }

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
      
      let result;
      
      if (extractFn) {
        result = await page.evaluate(extractFn);
      } else {
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
