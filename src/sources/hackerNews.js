const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(2);
const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';

class HackerNewsSource {
  constructor() {
    this.name = 'hackernews';
  }

  async search(query, options = {}) {
    const { maxResults = 25, onLog } = options;
    const log = onLog || (() => {});

    await limiter.wait();

    try {
      const response = await axios.get(`${ALGOLIA_BASE}/search`, {
        params: {
          query,
          tags: 'story',
          hitsPerPage: Math.min(maxResults, 50),
          attributesToRetrieve: 'title,url,author,points,num_comments,created_at,objectID,story_text',
        },
        timeout: 15000,
      });

      const hits = response.data.hits || [];
      log('success', `HN: ${hits.length} stories found`);

      return hits.map(hit => ({
        id: hit.objectID,
        title: hit.title || '',
        text: hit.story_text || '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || '',
        score: hit.points || 0,
        numComments: hit.num_comments || 0,
        created: hit.created_at || '',
        source: 'hackernews',
        sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        topComments: [],
      }));
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        log('warn', 'HN Algolia rate limited (429)');
      } else {
        log('error', `HN search error: ${error.message}`);
      }
      return [];
    }
  }

  async getComments(storyId, maxComments = 10, onLog) {
    const log = onLog || (() => {});

    await limiter.wait();

    try {
      const response = await axios.get(`${ALGOLIA_BASE}/items/${storyId}`, {
        timeout: 15000,
      });

      const children = response.data.children || [];
      return children
        .filter(c => c.type === 'comment' && c.text)
        .slice(0, maxComments)
        .map(c => ({
          author: c.author || '',
          text: (c.text || '').replace(/<[^>]*>/g, '').substring(0, 500),
          score: c.points || 0,
        }));
    } catch (error) {
      log('error', `HN comments error: ${error.message}`);
      return [];
    }
  }

  async searchWithComments(query, options = {}) {
    const { maxResults = 15, maxCommentsPerPost = 5, onLog } = options;
    const posts = await this.search(query, { maxResults, onLog });

    for (const post of posts.slice(0, 10)) {
      try {
        post.topComments = await this.getComments(post.id, maxCommentsPerPost, onLog);
      } catch {
        post.topComments = [];
      }
    }

    return posts;
  }
}

module.exports = new HackerNewsSource();
