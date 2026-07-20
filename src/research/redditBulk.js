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
    const ctx = {
      stats: { posts: 0, comments: 0, errors: 0 },
      scraped: new Map(),
      primarySource: 'arctic-shift',
      fallbackTriggered: false,
      rateLimitCount: 0,
      consecutiveFailCount: 0,
      scraper: options.scraper || null,
      log: onLog || (() => {}),
    };

    ctx.log('info', `Scraping Reddit: ${subreddits.length} subreddits, target ${targetCount} posts`);
    ctx.log('info', `Source: Arctic Shift → PullPush → Reddit Direct${ctx.scraper ? ' → Browser' : ''}`);

    const allPosts = [];
    const postsPerSubreddit = Math.ceil(targetCount / subreddits.length);
    let allSourcesFailed = false;

    for (const sub of subreddits) {
      if (allPosts.length >= targetCount) break;

      for (const query of queries) {
        if (allPosts.length >= targetCount) break;

        if (allSourcesFailed) break;

        try {
          const posts = await this.scrapeSubreddit(sub.name, query, Math.min(postsPerSubreddit, 100), ctx);

          for (const post of posts) {
            if (!ctx.scraped.has(post.id) && allPosts.length < targetCount) {
              ctx.scraped.set(post.id, true);
              allPosts.push(post);
              ctx.stats.posts++;
            }
          }

          if (onProgress) {
            onProgress({
              posts: ctx.stats.posts,
              comments: ctx.stats.comments,
              target: targetCount,
              currentSub: sub.name,
            });
          }

          if (posts.length > 0) {
            ctx.log('success', `r/${sub.name}: ${posts.length} posts`);
          }

          limiter.reset();
        } catch (error) {
          ctx.stats.errors++;

          if (error.response && (error.response.status === 429 || error.response.status === 422)) {
            ctx.rateLimitCount = (ctx.rateLimitCount || 0) + 1;
            ctx.consecutiveFailCount = 0;

            if (ctx.rateLimitCount >= 2) {
              if (ctx.primarySource === 'arctic-shift' && !ctx.fallbackTriggered) {
                ctx.log('warn', `Arctic Shift failed (${error.response.status}), switching to PullPush...`);
                ctx.primarySource = 'pullpush';
                ctx.fallbackTriggered = true;
                ctx.rateLimitCount = 0;
                limiter.reset();
                continue;
              }
              if (ctx.primarySource === 'pullpush') {
                ctx.log('warn', `PullPush exhausted, switching to Reddit Direct...`);
                ctx.primarySource = 'reddit';
                ctx.rateLimitCount = 0;
                limiter.reset();
                continue;
              }
              if (ctx.primarySource === 'reddit' && ctx.scraper) {
                ctx.log('warn', `All API sources exhausted, trying browser fallback...`);
                ctx.primarySource = 'puppeteer';
                allSourcesFailed = true;
                break;
              }
              ctx.log('error', `All Reddit sources exhausted, stopping...`);
              this.stats = ctx.stats;
              return allPosts;
            }

            ctx.log('warn', `${error.response.status} on ${ctx.primarySource} (attempt ${ctx.rateLimitCount}/2)`);
            await limiter.backoff(ctx.log);
          } else {
            ctx.log('error', `r/${sub.name} failed: ${error.message}`);

            if (ctx.primarySource === 'reddit') {
              ctx.consecutiveFailCount = (ctx.consecutiveFailCount || 0) + 1;
              if (ctx.consecutiveFailCount >= 3) {
                if (ctx.scraper) {
                  ctx.log('warn', `Reddit Direct blocked (403), switching to browser fallback...`);
                  ctx.primarySource = 'puppeteer';
                  allSourcesFailed = true;
                  break;
                }
                ctx.log('error', `Reddit Direct blocked and no browser available, stopping...`);
                this.stats = ctx.stats;
                return allPosts;
              }
            }
          }
        }
      }

      if (allSourcesFailed) break;
    }

    if (allSourcesFailed && ctx.scraper && allPosts.length < targetCount) {
      ctx.log('info', 'Starting browser fallback for remaining posts...');
      try {
        const browser = await ctx.scraper.launch();
        for (const sub of subreddits) {
          if (allPosts.length >= targetCount) break;
          for (const query of queries) {
            if (allPosts.length >= targetCount) break;
            try {
              const posts = await this.scrapeSubredditPuppeteer(sub.name, query, Math.min(postsPerSubreddit, 25), browser);
              for (const post of posts) {
                if (!ctx.scraped.has(post.id) && allPosts.length < targetCount) {
                  ctx.scraped.set(post.id, true);
                  allPosts.push(post);
                  ctx.stats.posts++;
                }
              }
              if (posts.length > 0) {
                ctx.log('success', `r/${sub.name} (browser): ${posts.length} posts`);
              }
              if (onProgress) {
                onProgress({ posts: ctx.stats.posts, comments: ctx.stats.comments, target: targetCount, currentSub: `${sub.name} (browser)` });
              }
            } catch (e) {
              ctx.log('error', `r/${sub.name} browser scrape failed: ${e.message}`);
            }
          }
        }
      } catch (e) {
        ctx.log('error', `Browser fallback failed: ${e.message}`);
      }
    }

    ctx.log('success', `Reddit done: ${ctx.stats.posts} posts, ${ctx.stats.comments} comments via ${ctx.primarySource}`);
    this.stats = ctx.stats;
    return allPosts;
  }

  async scrapeSubreddit(subreddit, query, limit = 50, ctx = this) {
    if (ctx.primarySource === 'arctic-shift') {
      return this.scrapeSubredditArcticShift(subreddit, query, limit, ctx);
    }
    if (ctx.primarySource === 'pullpush') {
      return this.scrapeSubredditPullPush(subreddit, query, limit, ctx);
    }
    return this.scrapeSubredditReddit(subreddit, query, limit, ctx);
  }

  async scrapeSubredditArcticShift(subreddit, query, limit = 50, ctx = this) {
    await limiter.wait();

    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 24 * 60 * 60;

    const response = await limiter.retryRequest(() =>
      axios.get(`${ARCTIC_SHIFT_BASE}/api/posts/search`, {
        params: {
          subreddit,
          q: query,
          limit: Math.min(limit, 100),
          sort: 'desc',
          fields: 'id,title,selftext,score,num_comments,subreddit,author,created_utc,url',
          after: oneYearAgo,
        },
        headers: this.headers,
        timeout: 20000,
      })
    , 3, ctx.log);

    const posts = (response.data.data || [])
      .map(p => this.formatPostArcticShift(p, subreddit));

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await this.getPostCommentsArcticShift(post.id, 30);
        post.topComments = comments;
        ctx.stats.comments += comments.length;
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

  async scrapeSubredditPullPush(subreddit, query, limit = 50, ctx = this) {
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
    , 3, ctx.log);

    const posts = (response.data.data || [])
      .map(p => this.formatPostPullPush(p, subreddit));

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await this.getPostCommentsPullPush(post.id, 30);
        post.topComments = comments;
        ctx.stats.comments += comments.length;
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

  async scrapeSubredditReddit(subreddit, query, limit = 50, ctx = this) {
    const posts = await redditDirect.search(query, {
      maxResults: Math.min(limit, 25),
      subreddit,
      onLog: ctx.log,
    });

    const postsWithComments = [];

    for (const post of posts.slice(0, 5)) {
      try {
        const comments = await redditDirect.getPostComments(post.url, 30);
        post.topComments = comments;
        ctx.stats.comments += comments.length;
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
              id: href.match(/comments\/([a-z0-9]+)/)?.[1] || `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
