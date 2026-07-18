const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(0.5);

class RedditSearch {
  constructor() {
    this.headers = {
      'User-Agent': 'ResearchToolkit/1.0 (Educational Research)',
    };
  }

  async search(query, options = {}) {
    const { maxResults = 25, subreddit = null, sort = 'relevance' } = options;

    await limiter.wait();

    try {
      const searchUrl = subreddit
        ? `https://www.reddit.com/r/${subreddit}/search.json`
        : 'https://www.reddit.com/search.json';

      const response = await axios.get(searchUrl, {
        params: {
          q: query,
          limit: maxResults,
          sort,
          t: 'year',
        },
        headers: this.headers,
        timeout: 15000,
      });

      return response.data.data.children.map(post => ({
        id: post.data.id,
        title: post.data.title,
        text: (post.data.selftext || '').substring(0, 3000),
        score: post.data.score || 0,
        numComments: post.data.num_comments || 0,
        subreddit: post.data.subreddit,
        author: post.data.author || '[deleted]',
        url: `https://www.reddit.com${post.data.permalink}`,
        created: new Date(post.data.created_utc * 1000).toISOString(),
        topComments: [],
      }));
    } catch (error) {
      if (error.response && error.response.status === 403) {
        throw new Error(`Reddit blocked (403): ${error.message}`);
      }
      console.error('Reddit search error:', error.message);
      return [];
    }
  }

  async getSubreddit(subreddit, sort = 'hot', limit = 25) {
    await limiter.wait();

    try {
      const response = await axios.get(`https://www.reddit.com/r/${subreddit}/${sort}.json`, {
        params: { limit },
        headers: this.headers,
        timeout: 15000,
      });

      return response.data.data.children.map(post => ({
        id: post.data.id,
        title: post.data.title,
        text: (post.data.selftext || '').substring(0, 3000),
        score: post.data.score || 0,
        numComments: post.data.num_comments || 0,
        subreddit: post.data.subreddit,
        author: post.data.author || '[deleted]',
        url: `https://www.reddit.com${post.data.permalink}`,
        created: new Date(post.data.created_utc * 1000).toISOString(),
        topComments: [],
      }));
    } catch (error) {
      if (error.response && error.response.status === 403) {
        throw new Error(`Reddit blocked (403): ${error.message}`);
      }
      console.error('Reddit fetch error:', error.message);
      return [];
    }
  }

  async getPostComments(postUrl, limit = 30) {
    await limiter.wait();

    try {
      const response = await axios.get(`${postUrl}.json`, {
        params: { limit },
        headers: this.headers,
        timeout: 15000,
      });

      const comments = response.data[1]?.data?.children || [];

      return comments
        .filter(c => c.kind === 't1' && c.data.body)
        .map(comment => ({
          author: comment.data.author || '[deleted]',
          text: (comment.data.body || '').substring(0, 1000),
          score: comment.data.score || 0,
          created: new Date(comment.data.created_utc * 1000).toISOString(),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        throw new Error(`Reddit comments blocked (403): ${error.message}`);
      }
      console.error('Reddit comments error:', error.message);
      return [];
    }
  }
}

module.exports = new RedditSearch();
