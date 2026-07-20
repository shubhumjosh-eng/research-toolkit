const axios = require('axios');
const cheerio = require('cheerio');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(1);

const KNOWN_FORUMS = {
  tech: [
    'discuss.python.org', 'discourse.gnome.org',
    'forum.ubuntu.com', 'discuss.ruby-lang.org', 'forum.kicad.org',
    'forums.unrealengine.com', 'community.openai.com',
    'discuss.tensorflow.org', 'community.home-assistant.io',
    'meta.wikimedia.org',
  ],
  science: [
    'discuss.tensorflow.org', 'forum.crossplane.io',
    'community.home-assistant.io',
  ],
  gaming: [
    'forums.tomshardware.com', 'discourse.libretro.com',
    'forums.gentoo.org',
  ],
  general: [
    'meta.discourse.org', 'forums.tomshardware.com',
    'community.openai.com', 'forums.unrealengine.com',
  ],
};

const CATEGORY_KEYWORDS = {
  tech: ['programming', 'software', 'code', 'developer', 'python', 'javascript', 'rust', 'linux', 'api', 'database', 'server', 'docker', 'kubernetes', 'git', 'ai', 'machine learning', 'keyboard', 'hardware', 'computer'],
  science: ['research', 'study', 'experiment', 'hypothesis', 'theory', 'physics', 'chemistry', 'biology', 'math', 'data', 'analysis'],
  gaming: ['game', 'gaming', 'play', 'steam', 'console', 'pc gaming', 'mod', 'multiplayer'],
  general: ['how to', 'best', 'recommend', 'advice', 'tips', 'help', 'question', 'buy', 'review', 'compare'],
};

class DiscourseSource {
  constructor() {
    this.name = 'discourse';
  }

  discoverForums(topic) {
    const lower = topic.toLowerCase();
    const matched = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        matched.push(...(KNOWN_FORUMS[category] || []));
      }
    }

    if (matched.length === 0) {
      matched.push(...KNOWN_FORUMS.general);
    }

    return [...new Set(matched)].slice(0, 8);
  }

  async searchForum(domain, query, options = {}) {
    const { maxResults = 15, onLog } = options;
    const log = onLog || (() => {});

    await limiter.wait();

    try {
      const response = await limiter.retryRequest(() =>
        axios.get(`https://${domain}/search.json`, {
          params: { q: query },
          headers: { Accept: 'application/json' },
          timeout: 15000,
        })
      , 2, log);

      const data = response.data;
      const topics = (data.topics || []).slice(0, maxResults);
      const posts = (data.posts || []).slice(0, maxResults);

      const results = [];

      for (const topic of topics.slice(0, 8)) {
        const matchingPost = posts.find(p => p.topic_id === topic.id);
        results.push({
          id: `${domain}-${topic.id}`,
          title: topic.title || '',
          text: matchingPost ? this.stripHtml(matchingPost.blurb || '') : this.stripHtml(topic.excerpt || ''),
          url: `https://${domain}/t/${topic.slug}/${topic.id}`,
          author: matchingPost?.username || topic.last_poster_username || '',
          score: topic.like_count || 0,
          views: topic.views || 0,
          replyCount: Math.max(0, (topic.posts_count || 1) - 1),
          created: topic.last_posted_at || '',
          source: 'discourse',
          sourceForum: domain,
          topComments: [],
        });
      }

      for (const post of posts.slice(0, 5)) {
        if (results.some(r => r.id === `${domain}-${post.topic_id}`)) continue;
        results.push({
          id: `${domain}-post-${post.id}`,
          title: post.topic_title || '',
          text: this.stripHtml(post.blurb || ''),
          url: `https://${domain}/t/${post.topic_slug || ''}/${post.topic_id}/${post.post_number}`,
          author: post.username || '',
          score: Math.round(post.score || 0),
          views: 0,
          replyCount: post.reply_count || 0,
          created: post.created_at || '',
          source: 'discourse',
          sourceForum: domain,
          topComments: [],
        });
      }

      return results.slice(0, maxResults);
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        log('warn', `Discourse ${domain} rate limited (429)`);
      } else if (status === 403 || status === 401) {
        log('warn', `Discourse ${domain} access denied (${status})`);
      } else {
        log('error', `Discourse ${domain} error: ${error.message}`);
      }
      return [];
    }
  }

  async search(topic, options = {}) {
    const { maxResults = 25, onLog, keywords } = options;
    const log = onLog || (() => {});

    const forums = this.discoverForums(topic);
    log('info', `Discourse: searching ${forums.length} forums...`);

    const searchQuery = (keywords && keywords.length > 0)
      ? keywords.slice(0, 4).join(' ')
      : topic.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');

    const allResults = [];

    for (const forum of forums) {
      if (allResults.length >= maxResults) break;
      try {
        const results = await this.searchForum(forum, searchQuery, {
          maxResults: Math.ceil(maxResults / forums.length),
          onLog,
        });
        allResults.push(...results);
        if (results.length > 0) {
          log('success', `${forum}: ${results.length} results`);
        }
      } catch {
        // Already handled in searchForum
      }
    }

    log('success', `Discourse: ${allResults.length} total results`);
    return allResults.slice(0, maxResults);
  }

  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
  }
}

module.exports = new DiscourseSource();
