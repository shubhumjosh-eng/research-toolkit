const axios = require('axios');
const config = require('../config');
const { sleep } = require('../utils/helpers');

class NewsApi {
  constructor() {
    this.gnewsApiKey = config.GNEWS_API_KEY;
  }

  async search(query, options = {}) {
    const { maxResults = 10, language = 'en', onLog } = options;
    const log = onLog || (() => {});

    if (this.gnewsApiKey) {
      log('info', 'Using GNews API...');
      return await this.searchGNews(query, maxResults, language, log);
    }

    log('info', 'Using Google News RSS feed...');
    return await this.searchRSS(query, maxResults, log);
  }

  async searchGNews(query, maxResults, language, log) {
    try {
      const response = await axios.get('https://gnews.io/api/v4/search', {
        params: {
          q: query,
          lang: language,
          max: maxResults,
          token: this.gnewsApiKey,
        },
      });

      const articles = response.data?.articles;
      if (!Array.isArray(articles)) {
        log('warn', 'GNews returned unexpected response structure');
        return [];
      }

      return articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || 'Unknown',
        publishedAt: article.publishedAt,
        imageUrl: article.image,
        type: 'news',
      }));
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        log('warn', 'GNews API rate limited (429)');
      } else if (status === 500) {
        log('error', 'GNews API server error (500)');
      } else {
        log('error', `GNews API error: ${error.message}`);
      }
      return [];
    }
  }

  async searchRSS(query, maxResults, log) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
      await sleep(1500);
      const response = await axios.get(rssUrl, {
        headers: { 'User-Agent': 'Research Toolkit' },
        timeout: 15000,
      });

      if (response.status === 202) {
        log('warn', 'Google News returned consent page (202), skipping');
        return [];
      }

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
      const status = error.response?.status;
      if (status === 429) {
        log('warn', 'Google News RSS rate limited (429)');
      } else if (status === 500) {
        log('error', 'Google News RSS server error (500)');
      } else {
        log('error', `Google News RSS error: ${error.message}`);
      }
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
