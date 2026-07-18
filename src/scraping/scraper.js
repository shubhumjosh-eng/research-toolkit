const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(0.5); // 1 request per 2 seconds

class StaticScraper {
  constructor() {
    this.headers = {
      'User-Agent': config.SCRAPING.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
  }

  async scrape(url, selector = null) {
    await limiter.wait();
    
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: config.SCRAPING.timeout,
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract basic page info
      const result = {
        url,
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        content: '',
        links: [],
        images: [],
      };
      
      // Extract text content
      if (selector) {
        result.content = $(selector).text().trim();
      } else {
        // Remove script and style elements, then get text
        $('script, style, nav, footer, header').remove();
        result.content = $('body').text().trim().substring(0, 5000);
      }
      
      // Extract links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text) {
          result.links.push({ href, text: text.substring(0, 100) });
        }
      });
      
      // Extract images
      $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt') || '';
        if (src) {
          result.images.push({ src, alt });
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to scrape ${url}: ${error.message}`);
      throw error;
    }
  }

  async scrapeMultiple(urls, selector = null) {
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.scrape(url, selector);
        results.push(result);
      } catch (error) {
        results.push({ url, error: error.message });
      }
    }
    return results;
  }
}

module.exports = new StaticScraper();
