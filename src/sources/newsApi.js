const axios = require('axios');
const config = require('../config');

class NewsApi {
  constructor() {
    this.gnewsApiKey = config.GNEWS_API_KEY;
  }

  async search(query, options = {}) {
    const { maxResults = 10, language = 'en', onLog } = options;
    const log = onLog || (() => {});
    
    // Try GNews API if key is available
    if (this.gnewsApiKey) {
      log('info', 'Using GNews API...');
      return await this.searchGNews(query, maxResults, language);
    }
    
    // Fallback to RSS feeds
    log('info', 'Using Google News RSS feed...');
    return await this.searchRSS(query, maxResults);
  }

  async searchGNews(query, maxResults, language) {
    try {
      const response = await axios.get('https://gnews.io/api/v4/search', {
        params: {
          q: query,
          lang: language,
          max: maxResults,
          token: this.gnewsApiKey,
        },
      });
      
      return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
        imageUrl: article.image,
        type: 'news',
      }));
    } catch (error) {
      console.error('GNews API error:', error.message);
      return [];
    }
  }

  async searchRSS(query, maxResults) {
    // Use Google News RSS feed (free, no API key needed)
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    
    try {
      const response = await axios.get(rssUrl, {
        headers: { 'User-Agent': 'Research Toolkit' },
      });
      
      // Parse RSS XML
      const items = response.data.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      return items.slice(0, maxResults).map(item => {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                     item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || 'Google News';
        
        return {
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          url: link,
          publishedAt: pubDate,
          source,
          type: 'news',
        };
      });
    } catch (error) {
      console.error('RSS fetch error:', error.message);
      return [];
    }
  }

  async getHeadlines(country = 'us', category = null) {
    if (this.gnewsApiKey) {
      try {
        const params = {
          country,
          max: 10,
          token: this.gnewsApiKey,
        };
        if (category) params.category = category;
        
        const response = await axios.get('https://gnews.io/api/v4/top-headlines', { params });
        
        return response.data.articles.map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt,
          type: 'headline',
        }));
      } catch (error) {
        return [];
      }
    }
    
    return [];
  }
}

module.exports = new NewsApi();
