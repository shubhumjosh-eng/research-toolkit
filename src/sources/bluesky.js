const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(1);
const PUBLIC_API = 'https://public.api.bsky.app/xrpc';

class BlueskySource {
  constructor() {
    this.name = 'bluesky';
    this.accessJwt = null;
  }

  async ensureAuth() {
    if (this.accessJwt) return this.accessJwt;

    const identifier = process.env.BLUESKY_IDENTIFIER;
    const password = process.env.BLUESKY_PASSWORD;

    if (!identifier || !password) return null;

    try {
      const response = await axios.post('https://bsky.social/xrpc/com.atproto.server.createSession', {
        identifier,
        password,
      }, { timeout: 10000 });

      this.accessJwt = response.data.accessJwt;
      return this.accessJwt;
    } catch (error) {
      return null;
    }
  }

  async search(query, options = {}) {
    const { maxResults = 25, onLog } = options;
    const log = onLog || (() => {});

    await limiter.wait();

    const jwt = await this.ensureAuth();
    const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};

    try {
      const response = await axios.get(`${PUBLIC_API}/app.bsky.feed.searchPosts`, {
        params: {
          q: query,
          limit: Math.min(maxResults, 100),
          sort: 'top',
        },
        headers,
        timeout: 15000,
      });

      const posts = response.data.posts || [];
      log('success', `Bluesky: ${posts.length} posts found`);

      return posts.map(post => ({
        id: post.uri || '',
        title: (post.record?.text || '').substring(0, 100),
        text: post.record?.text || '',
        author: post.author?.handle || '',
        authorName: post.author?.displayName || post.author?.handle || '',
        score: (post.likeCount || 0) + (post.repostCount || 0) * 2,
        likeCount: post.likeCount || 0,
        repostCount: post.repostCount || 0,
        replyCount: post.replyCount || 0,
        created: post.record?.createdAt || '',
        source: 'bluesky',
        url: `https://bsky.app/profile/${post.author?.handle}/post/${post.uri?.split('/').pop() || ''}`,
        topComments: [],
      }));
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        log('warn', 'Bluesky rate limited (429)');
      } else if (status === 401) {
        log('warn', 'Bluesky auth failed — search may require login');
        this.accessJwt = null;
      } else {
        log('error', `Bluesky search error: ${error.message}`);
      }
      return [];
    }
  }

  async getThread(postUri, onLog) {
    const log = onLog || (() => {});

    await limiter.wait();

    try {
      const response = await axios.get(`${PUBLIC_API}/app.bsky.feed.getThread`, {
        params: { uri: postUri },
        timeout: 15000,
      });

      const thread = response.data.thread;
      if (!thread?.replies) return [];

      return thread.replies
        .filter(r => r.post?.record?.text)
        .slice(0, 10)
        .map(r => ({
          author: r.post.author?.handle || '',
          text: r.post.record.text.substring(0, 500),
          score: r.post.likeCount || 0,
        }));
    } catch (error) {
      log('error', `Bluesky thread error: ${error.message}`);
      return [];
    }
  }
}

module.exports = new BlueskySource();
