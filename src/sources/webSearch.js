const axios = require('axios');
const cheerio = require('cheerio');
const DynamicScraper = require('../scraping/browserScraper');

class WebSearch {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    this.scraper = null;
  }

  async search(query, options = {}) {
    const { maxResults = 10, onLog, scraper } = options;
    this.scraper = scraper || null;
    const log = onLog || (() => {});
    
    // Try DuckDuckGo Lite (free, no API key)
    log('info', 'Searching DuckDuckGo Lite...');
    const results = await this.searchDuckDuckGo(query, maxResults);
    if (results.length > 0) {
      log('success', `DuckDuckGo returned ${results.length} results`);
      return results;
    }
    
    // Fallback to Brave Search
    log('warn', 'DuckDuckGo failed, trying Brave Search...');
    const braveResults = await this.searchBrave(query, maxResults);
    if (braveResults.length > 0) {
      log('success', `Brave returned ${braveResults.length} results`);
      return braveResults;
    }

    // Puppeteer fallback
    if (this.scraper) {
      log('warn', 'Brave failed, trying browser fallback...');
      try {
        const browser = await this.scraper.launch();
        const puppeteerResults = await this.searchViaPuppeteer(query, maxResults, browser);
        log(puppeteerResults.length > 0 ? 'success' : 'error', `Browser returned ${puppeteerResults.length} results`);
        return puppeteerResults;
      } catch (e) {
        log('error', `Browser fallback failed: ${e.message}`);
      }
    }

    return braveResults;
  }

  async searchDuckDuckGo(query, maxResults) {
    try {
      const response = await axios.post('https://lite.duckduckgo.com/lite/',
        `q=${encodeURIComponent(query)}&kl=wt-wt`,
        {
          headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );
      
      const $ = cheerio.load(response.data);
      const results = [];
      
      // Extract search results
      $('table tr').each((_, row) => {
        const link = $(row).find('a.result-link');
        const snippet = $(row).find('td.result-snippet');
        
        if (link.length) {
          const title = link.text().trim();
          const url = link.attr('href');
          const description = snippet.text().trim();
          
          if (title && url && !url.includes('duckduckgo.com')) {
            results.push({
              title,
              url,
              description,
              type: 'web',
            });
          }
        }
      });
      
      return results.slice(0, maxResults);
    } catch (error) {
      console.error('DuckDuckGo search error:', error.message);
      return [];
    }
  }

  async searchBrave(query, maxResults = 10) {
    try {
      const response = await axios.get(`https://search.brave.com/search?q=${encodeURIComponent(query)}`, {
        headers: this.headers,
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const results = [];
      const seen = new Set();

      $('a[href]').each((_, el) => {
        const url = $(el).attr('href');
        const title = $(el).text().trim();

        if (!url || !title || title.length < 10) return;
        if (url.includes('brave.com') || url.startsWith('#') || url.startsWith('javascript:')) return;
        if (seen.has(url)) return;
        seen.add(url);

        const description = $(el).closest('.snippet, div').find('.snippet-description, p').first().text().trim() || '';

        results.push({ title: title.substring(0, 200), url, description: description.substring(0, 300), type: 'web' });
      });
      
      return results.slice(0, maxResults);
    } catch (error) {
      return [];
    }
  }

  async searchViaPuppeteer(query, maxResults, browser) {
    const page = await browser.newPage();
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const results = await page.evaluate(() => {
        const items = [];
        const resultElements = document.querySelectorAll('[data-testid="result"], .result, article');
        resultElements.forEach((el) => {
          const titleEl = el.querySelector('a h2, h2 a, .result__title a');
          const snippetEl = el.querySelector('.result__snippet, [data-result="snippet"]');
          const url = titleEl?.getAttribute('href') || titleEl?.closest('a')?.getAttribute('href') || '';

          if (titleEl && url) {
            items.push({
              title: titleEl.textContent.trim(),
              url,
              description: snippetEl?.textContent?.trim() || '',
              type: 'web',
            });
          }
        });
        return items;
      });

      return results.slice(0, maxResults);
    } finally {
      await page.close();
    }
  }
}

module.exports = new WebSearch();
