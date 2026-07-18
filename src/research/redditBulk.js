const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');
const redditDirect = require('../sources/reddit');
const DynamicScraper = require('../scraping/browserScraper');

const limiter = new RateLimiter(0.25);

const ARCTIC_SHIFT_BASE = 'https://arctic-shift.photon-reddit.com';
const PULLPUSH_BASE = 'https://api.pullpush.io';

class RedditBulkScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'ResearchToolkit/1.0 (Educational Research)',
    };
    this.scraped = new Map();
    this.stats = { posts: 0, comments: 0, errors: 0 };
    this.primarySource = 'arctic-shift';
    this.fallbackTriggered = false;
    this.scraper = null;
    this.log = () => {};
  }

  async scrapeAll(subreddits, queries, targetCount = 500, onProgress = null, onLog = null, options = {}) {
    this.stats = { posts: 0, comments: 0, errors: 0 };
    this.scraped.clear();
    this.rateLimitCount = 0;
    this.consecutiveFailCount = 0;
    this.primarySource = 'arctic-shift';
    this.fallbackTriggered = false;
    this.scraper = options.scraper || null;
    this.log = onLog || (() => {});

    this.log('info', `Scraping Reddit: ${subreddits.length} subreddits, target ${targetCount} posts`);
    this.log('info', `Source: Arctic Shift → PullPush → Reddit Direct${this.scraper ? ' → Browser' : ''}`);

    const allPosts = [];
    const postsPerSubreddit = Math.ceil(targetCount / subreddits.length);
    let allSourcesFailed = false;

    for (const sub of subreddits) {
      if (allPosts.length >= targetCount) break;

      for (const query of queries) {
        if (allPosts.length >= targetCount) break;

        if (allSourcesFailed) break;

        try {
          const posts = await this.scrapeSubreddit(sub.name, query, Math.min(postsPerSubreddit, 100));

          for (const post of posts) {
            if (!this.scraped.has(post.id) && allPosts.length < targetCount) {
              this.scraped.set(post.id, true);
              allPosts.push(post);
              this.stats.posts++;
            }
          }

          if (onProgress) {
            onProgress({
              posts: this.stats.posts,
              comments: this.stats.comments,
              target: targetCount,
              currentSub: sub.name,
            });
          }

          if (posts.length > 0) {
            this.log('success', `r/${sub.name}: ${posts.length} posts`);
          }

          limiter.reset();
        } catch (error) {
          this.stats.errors++;

          if (error.response && error.response.status === 429) {
            this.rateLimitCount = (this.rateLimitCount || 0) + 1;
            this.consecutiveFailCount = 0;

            if (this.rateLimitCount >= 2) {
              if (this.primarySource === 'arctic-shift' && !this.fallbackTriggered) {
                this.log('warn', `Arctic Shift rate limited, switching to PullPush...`);
                this.primarySource = 'pullpush';
                this.fallbackTriggered = true;
                this.rateLimitCount = 0;
                limiter.reset();
                continue;
              }
              if (this.primarySource === 'pullpush') {
                this.log('warn', `PullPush exhausted, switching to Reddit Direct...`);
                this.primarySource = 'reddit';
                this.rateLimitCount = 0;
                limiter.reset();
                continue;
              }
              if (this.primarySource === 'reddit' && this.scraper) {
                this.log('warn', `All API sources exhausted, trying browser fallback...`);
                this.primarySource = 'puppeteer';
                allSourcesFailed = true;
                break;
              }
              this.log('error', `All Reddit sources exhausted, stopping...`);
              return allPosts;
            }

            this.log('warn', `429 on ${this.primarySource} (attempt ${this.rateLimitCount}/3)`);
            await limiter.backoff(this.log);
          } else {
            this.log('error', `r/${sub.name} failed: ${error.message}`);

            if (this.primarySource === 'reddit') {
              this.consecutiveFailCount = (this.consecutiveFailCount || 0) + 1;
              if (this.consecutiveFailCount >= 3) {
                if (this.scraper) {
                  this.log('warn', `Reddit Direct blocked (403), switching to browser fallback...`);
                  this.primarySource = 'puppeteer';
                  allSourcesFailed = true;
                  break;
                }
                this.log('error', `Reddit Direct blocked and no browser available, stopping...`);
                return allPosts;
              }
            }
          }
        }
      }

      if (allSourcesFailed) break;
    }

    if (allSourcesFailed && this.scraper && allPosts.length < targetCount) {
      this.log('info', 'Starting browser fallback for remaining posts...');
      try {
        const browser = await this.scraper.launch();
        for (const sub of subreddits) {
          if (allPosts.length >= targetCount) break;
          for (const query of queries) {
            if (allPosts.length >= targetCount) break;
            try {
              const posts = await this.scrapeSubredditPuppeteer(sub.name, query, Math.min(postsPerSubreddit, 25), browser);
              for (const post of posts) {
                if (!this.scraped.has(post.id) && allPosts.length < targetCount) {
                  this.scraped.set(post.id, true);
                  allPosts.push(post);
                  this.stats.posts++;
                }
              }
              if (posts.length > 0) {
                this.log('success', `r/${sub.name} (browser): ${posts.length} posts`);
              }
              if (onProgress) {
                onProgress({ posts: this.stats.posts, comments: this.stats.comments, target: targetCount, currentSub: `${sub.name} (browser)` });
              }
            } catch (e) {
              this.log('error', `r/${sub.name} browser scrape failed: ${e.message}`);
            }
          }
        }
      } catch (e) {
        this.log('error', `Browser fallback failed: ${e.message}`);
      }
    }

    this.log('success', `Reddit done: ${this.stats.posts} posts, ${this.stats.comments} comments via ${this.primarySource}`);
    return allPosts;
  }

  async scrapeSubreddit(subreddit, query, limit = 50) {
    if (this.primarySource === 'arctic-shift') {
      return this.scrapeSubredditArcticShift(subreddit, query, limit);
    }
    if (this.primarySource === 'pullpush') {
      return this.scrapeSubredditPullPush(subreddit, query, limit);
    }
    return this.scrapeSubredditReddit(subreddit, query, limit);
  }

  async scrapeSubredditArcticShift(subreddit, query, limit = 50) {
    await limiter.wait();

    const response = await limiter.retryRequest(() =>
      axios.get(`${ARCTIC_SHIFT_BASE}/api/posts/search`, {
        params: {
          subreddit,
          query,
          limit: Math.min(limit, 100),
          sort: 'desc',
          fields: 'id,title,selftext,score,num_comments,subreddit,author,created_utc,url',
        },
        headers: this.headers,
        timeout: 20000,
      })
    , 3, this.log);

    const posts = (response.data.data || [])
      .map(p => this.formatPostArcticShift(p, subreddit));

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await this.getPostCommentsArcticShift(post.id, 30);
        post.topComments = comments;
        this.stats.comments += comments.length;
        postsWithComments.push(post);
      } catch {
        post.topComments = [];
        postsWithComments.push(post);
      }
    }

    return postsWithComments;
  }

  async getPostCommentsArcticShift(postId, limit = 30) {
    await limiter.wait();

    const response = await limiter.retryRequest(() =>
      axios.get(`${ARCTIC_SHIFT_BASE}/api/comments/search`, {
        params: {
          link_id: postId,
          limit: Math.min(limit, 100),
          sort: 'desc',
          fields: 'author,body,score,created_utc,id',
        },
        headers: this.headers,
        timeout: 20000,
      })
    , 3, this.log);

    const comments = response.data.data || [];

    return comments
      .filter(c => c.body)
      .map(c => ({
        author: c.author || '[deleted]',
        text: (c.body || '').substring(0, 1000),
        score: c.score || 0,
        created: new Date((c.created_utc || 0) * 1000).toISOString(),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async scrapeSubredditPullPush(subreddit, query, limit = 50) {
    await limiter.wait();

    const response = await limiter.retryRequest(() =>
      axios.get(`${PULLPUSH_BASE}/reddit/search/submission/`, {
        params: {
          q: query,
          subreddit,
          size: Math.min(limit, 100),
          sort: 'desc',
          sort_type: 'score',
        },
        headers: this.headers,
        timeout: 20000,
      })
    , 3, this.log);

    const posts = (response.data.data || [])
      .map(p => this.formatPostPullPush(p, subreddit));

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await this.getPostCommentsPullPush(post.id, 30);
        post.topComments = comments;
        this.stats.comments += comments.length;
        postsWithComments.push(post);
      } catch {
        post.topComments = [];
        postsWithComments.push(post);
      }
    }

    return postsWithComments;
  }

  async getPostCommentsPullPush(postId, limit = 30) {
    await limiter.wait();

    const response = await limiter.retryRequest(() =>
      axios.get(`${PULLPUSH_BASE}/reddit/search/comment/`, {
        params: {
          link_id: postId,
          size: Math.min(limit, 100),
          sort: 'desc',
          sort_type: 'score',
        },
        headers: this.headers,
        timeout: 20000,
      })
    , 3, this.log);

    const comments = response.data.data || [];

    return comments
      .filter(c => c.body)
      .map(c => ({
        author: c.author || '[deleted]',
        text: (c.body || '').substring(0, 1000),
        score: c.score || 0,
        created: new Date((c.created_utc || 0) * 1000).toISOString(),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async scrapeSubredditReddit(subreddit, query, limit = 50) {
    const posts = await redditDirect.search(query, {
      maxResults: Math.min(limit, 25),
      subreddit,
      onLog: this.log,
    });

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await redditDirect.getPostComments(post.url, 30);
        post.topComments = comments;
        this.stats.comments += comments.length;
        postsWithComments.push(post);
      } catch {
        post.topComments = [];
        postsWithComments.push(post);
      }
    }

    return postsWithComments;
  }

  async scrapeSubredditPuppeteer(subreddit, query, limit = 25, browser) {
    const page = await browser.newPage();
    const searchUrl = `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(query)}&sort=relevance&t=year`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));

      const posts = await page.evaluate((sub) => {
        const items = [];
        const postElements = document.querySelectorAll('shreddit-post, [data-testid="post-container"], article');
        postElements.forEach((el) => {
          const titleEl = el.querySelector('a[slot="title"], h3, [slot="title"]');
          const bodyEl = el.querySelector('[slot="text-body"], .md, p');
          const metaEl = el.querySelector('[slot="author"], .author');
          const scoreEl = el.querySelector('[slot="score"], .score');
          const commentsEl = el.querySelector('[slot="comments-button"], .comments');

          if (titleEl) {
            const href = (titleEl.closest('a') || titleEl.querySelector('a') || {}).href || '';
            items.push({
              id: href.match(/comments\/([a-z0-9]+)/)?.[1] || Math.random().toString(36).substring(7),
              title: titleEl.textContent.trim(),
              text: (bodyEl?.textContent || '').substring(0, 3000),
              author: metaEl?.textContent?.trim() || '[unknown]',
              score: parseInt(scoreEl?.textContent?.replace(/[^\d-]/g, '') || '0', 10) || 0,
              numComments: parseInt(commentsEl?.textContent?.replace(/[^\d]/g, '') || '0', 10) || 0,
              subreddit: sub,
              url: href,
            });
          }
        });
        return items;
      }, subreddit);

      return posts.slice(0, limit).map(p => ({
        ...p,
        created: new Date().toISOString(),
        topComments: [],
      }));
    } finally {
      await page.close();
    }
  }

  formatPostArcticShift(data, subreddit) {
    return {
      id: data.id,
      title: data.title || '',
      text: (data.selftext || '').substring(0, 3000),
      score: data.score || 0,
      numComments: data.num_comments || 0,
      subreddit: subreddit || data.subreddit,
      author: data.author || '[deleted]',
      url: `https://www.reddit.com/r/${subreddit || data.subreddit}/comments/${data.id}`,
      created: new Date((data.created_utc || 0) * 1000).toISOString(),
      topComments: [],
    };
  }

  formatPostPullPush(data, subreddit) {
    return {
      id: data.id,
      title: data.title || '',
      text: (data.selftext || '').substring(0, 3000),
      score: data.score || 0,
      numComments: data.num_comments || 0,
      subreddit: subreddit || data.subreddit,
      author: data.author || '[deleted]',
      url: data.url || `https://www.reddit.com/r/${subreddit || data.subreddit}/comments/${data.id}`,
      created: new Date((data.created_utc || 0) * 1000).toISOString(),
      topComments: [],
    };
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = new RedditBulkScraper();
