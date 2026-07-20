const topicAnalyzer = require('./topicAnalyzer');
const queryAnalyzer = require('./queryAnalyzer');
const redditBulk = require('./redditBulk');
const youtubeDiscovery = require('./youtubeSearch');
const newsApi = require('../sources/newsApi');
const logger = require('../utils/logger');
const webSearch = require('../sources/webSearch');
const hackerNews = require('../sources/hackerNews');
const bluesky = require('../sources/bluesky');
const discourse = require('../sources/discourse');
const stackExchange = require('../sources/stackExchange');
const semanticScholar = require('../sources/semanticScholar');
const arxiv = require('../sources/arxiv');
const pdfGenerator = require('../report/reportGenerator');
const { sleep } = require('../utils/helpers');
const { getSentiment, analyzeBatch } = require('../utils/sentiment');
const cache = require('../utils/cache');
const config = require('../config');

class ResearchOrchestrator {
  async run(topic, options = {}) {
    const {
      depth = 500,
      transcripts = false,
      redditOnly = false,
      youtubeOnly = false,
      output = null,
      noCache = false,
      onProgress = null,
      onLog = null,
      since = null,
      until = null,
      template = null,
      diff = false,
    } = options;

    if (noCache) cache.disable();

    // Parse date range
    const dateRange = this.parseDateRange(since, until);

    // Apply template overrides
    const templateConfig = template ? this.getTemplate(template) : null;

    const startTime = Date.now();
    const logFile = logger.startSession(topic);
    const log = onLog || ((level, msg) => {
      const prefix = { info: '  ', success: '✓ ', warn: '⚠ ', error: '✕ ' }[level] || '  ';
      console.log(`${prefix} ${msg}`);
      logger.write(level, msg);
    });

    const analysis = queryAnalyzer.analyze(topic);
    log('info', `Research: "${topic}" (depth: ${depth})`);
    if (dateRange) log('info', `Date range: ${dateRange.from ? dateRange.from.toISOString().split('T')[0] : 'any'} to ${dateRange.to ? dateRange.to.toISOString().split('T')[0] : 'any'}`);
    if (templateConfig) log('info', `Template: ${templateConfig.name} — ${templateConfig.description}`);
    log('info', `Phrases: [${analysis.phrases.join(', ')}] | Keywords: [${analysis.keywords.slice(0, 5).join(', ')}]`);
    log('info', `Intent: ${analysis.intent} | Expanded: ${analysis.expanded.length} queries`);

    const results = {
      topic,
      timestamp: new Date().toISOString(),
      reddit: [],
      youtube: [],
      news: [],
      webSearch: [],
      hackernews: [],
      bluesky: [],
      discourse: [],
      stackexchange: [],
      semanticScholar: [],
      arxiv: [],
      analysis,
    };

    const report = (step, message, current, target) => {
      if (onProgress) onProgress({ step, message, current, target });
    };

    // Step 1: Discover sources
    report('discover', 'Discovering relevant subreddits...', 0, 1);
    log('info', 'Discovering relevant subreddits...');
    const allSubreddits = await topicAnalyzer.discoverSubreddits(topic);
    const subreddits = allSubreddits.slice(0, 2);
    const allQueries = topicAnalyzer.buildSearchQueries(topic);
    const queries = allQueries.slice(0, 1);
    log('success', `Found ${subreddits.length} subreddits, ${queries.length} queries`);
    report('discover', `Found ${subreddits.length} subreddits`, 1, 1);

    // Step 2: Search all independent sources in parallel
    report('search', 'Searching all platforms in parallel...', 0, 10);
    log('info', 'Searching all platforms in parallel...');

    const fetchReddit = async () => {
      const cached = await cache.get(topic, 'reddit');
      if (cached) { log('success', `Found ${cached.length} Reddit posts (cached)`); return cached; }
      try {
        const r = await redditBulk.scrapeAll(subreddits, queries, depth, null, onLog);
        if (r.length > 0) await cache.set(topic, 'reddit', r);
        log('success', `Found ${r.length} Reddit posts`);
        return r;
      } catch (e) { log('error', `Reddit search failed: ${e.message}`); return []; }
    };

    const fetchYouTube = async () => {
      const cached = await cache.get(topic, 'youtube');
      if (cached) { log('success', `Found ${cached.length} YouTube videos (cached)`); return cached; }
      try {
        const r = await youtubeDiscovery.discover(topic, Math.min(25, Math.ceil(depth * 0.15)), null, onLog);
        if (r.length > 0) await cache.set(topic, 'youtube', r);
        log('success', `Found ${r.length} YouTube videos`);
        return r;
      } catch (e) { log('error', `YouTube search failed: ${e.message}`); return []; }
    };

    const fetchNews = async () => {
      if (youtubeOnly) return [];
      const cached = await cache.get(topic, 'news');
      if (cached) { log('success', `Found ${cached.length} news articles (cached)`); return cached; }
      try {
        const r = await newsApi.search(topic, { maxResults: Math.min(depth, config.RESEARCH.newsMaxResults), onLog, dateRange });
        if (r.length > 0) await cache.set(topic, 'news', r);
        log('success', `Found ${r.length} news articles`);
        return r;
      } catch (e) { log('error', `News search failed: ${e.message}`); return []; }
    };

    const fetchWeb = async () => {
      if (youtubeOnly) return [];
      const cached = await cache.get(topic, 'web');
      if (cached) { log('success', `Found ${cached.length} web results (cached)`); return cached; }
      try {
        const webTarget = Math.min(Math.ceil(depth * config.RESEARCH.webSearchRatio), config.RESEARCH.webSearchMax);
        const r = await webSearch.search(topic, { maxResults: webTarget, onLog, dateRange });
        if (r.length > 0) await cache.set(topic, 'web', r);
        log('success', `Found ${r.length} web results`);
        return r;
      } catch (e) { log('error', `Web search failed: ${e.message}`); return []; }
    };

    const fetchHN = async () => {
      if (youtubeOnly || redditOnly) return [];
      const cached = await cache.get(topic, 'hackernews');
      if (cached) { log('success', `Found ${cached.length} HN stories (cached)`); return cached; }
      try {
        const r = await hackerNews.searchWithComments(topic, { maxResults: Math.min(25, Math.ceil(depth * 0.15)), maxCommentsPerPost: 5, onLog, dateRange });
        if (r.length > 0) await cache.set(topic, 'hackernews', r);
        log('success', `HN done: ${r.length} stories`);
        return r;
      } catch (e) { log('error', `HN search failed: ${e.message}`); return []; }
    };

    const fetchBluesky = async () => {
      if (youtubeOnly || redditOnly) return [];
      const cached = await cache.get(topic, 'bluesky');
      if (cached) { log('success', `Found ${cached.length} Bluesky posts (cached)`); return cached; }
      try {
        const r = await bluesky.search(topic, { maxResults: Math.min(25, Math.ceil(depth * 0.15)), onLog, dateRange });
        if (r.length > 0) await cache.set(topic, 'bluesky', r);
        log('success', `Bluesky done: ${r.length} posts`);
        return r;
      } catch (e) { log('error', `Bluesky search failed: ${e.message}`); return []; }
    };

    const fetchDiscourse = async () => {
      if (youtubeOnly || redditOnly) return [];
      const cached = await cache.get(topic, 'discourse');
      if (cached) { log('success', `Found ${cached.length} Discourse posts (cached)`); return cached; }
      try {
        const r = await discourse.search(topic, { maxResults: Math.min(25, Math.ceil(depth * 0.15)), onLog, keywords: analysis.keywords, dateRange });
        if (r.length > 0) await cache.set(topic, 'discourse', r);
        log('success', `Discourse done: ${r.length} posts`);
        return r;
      } catch (e) { log('error', `Discourse search failed: ${e.message}`); return []; }
    };

    const fetchSE = async () => {
      if (youtubeOnly || redditOnly) return [];
      const cached = await cache.get(topic, 'stackexchange');
      if (cached) { log('success', `Found ${cached.length} SE results (cached)`); return cached; }
      try {
        const r = await stackExchange.search(topic, { maxResults: Math.min(25, Math.ceil(depth * 0.15)), onLog, dateRange });
        if (r.length > 0) await cache.set(topic, 'stackexchange', r);
        log('success', `Stack Exchange done: ${r.length} results`);
        return r;
      } catch (e) { log('error', `SE search failed: ${e.message}`); return []; }
    };

    const fetchSS = async () => {
      const cached = await cache.get(topic, 'semanticScholar');
      if (cached) { log('success', `Found ${cached.length} Semantic Scholar papers (cached)`); return cached; }
      try {
        const yearRange = dateRange ? { from: dateRange.from ? dateRange.from.getFullYear() : undefined, to: dateRange.to ? dateRange.to.getFullYear() : undefined } : undefined;
        const r = await semanticScholar.searchSemanticScholar(topic, { maxResults: Math.min(20, Math.ceil(depth * 0.1)), yearRange });
        if (r.results && r.results.length > 0) { await cache.set(topic, 'semanticScholar', r.results); log('success', `Semantic Scholar done: ${r.results.length} papers`); return r.results; }
        log('info', 'No Semantic Scholar results');
        return [];
      } catch (e) { log('error', `Semantic Scholar failed: ${e.message}`); return []; }
    };

    const fetchArxiv = async () => {
      const cached = await cache.get(topic, 'arxiv');
      if (cached) { log('success', `Found ${cached.length} arXiv papers (cached)`); return cached; }
      try {
        const r = await arxiv.searchArxiv(topic, { maxResults: Math.min(20, Math.ceil(depth * 0.1)) });
        if (r.results && r.results.length > 0) { await cache.set(topic, 'arxiv', r.results); log('success', `arXiv done: ${r.results.length} papers`); return r.results; }
        log('info', 'No arXiv results');
        return [];
      } catch (e) { log('error', `arXiv search failed: ${e.message}`); return []; }
    };

    const [redditRes, ytRes, newsRes, webRes, hnRes, bskyRes, discRes, seRes, ssRes, arxivRes] = await Promise.allSettled([
      fetchReddit(), fetchYouTube(), fetchNews(), fetchWeb(), fetchHN(), fetchBluesky(), fetchDiscourse(), fetchSE(), fetchSS(), fetchArxiv()
    ]);

    results.reddit = redditRes.status === 'fulfilled' ? redditRes.value : [];
    results.youtube = ytRes.status === 'fulfilled' ? ytRes.value : [];
    results.news = newsRes.status === 'fulfilled' ? newsRes.value : [];
    results.webSearch = webRes.status === 'fulfilled' ? webRes.value : [];
    results.hackernews = hnRes.status === 'fulfilled' ? hnRes.value : [];
    results.bluesky = bskyRes.status === 'fulfilled' ? bskyRes.value : [];
    results.discourse = discRes.status === 'fulfilled' ? discRes.value : [];
    results.stackexchange = seRes.status === 'fulfilled' ? seRes.value : [];
    results.semanticScholar = ssRes.status === 'fulfilled' ? ssRes.value : [];
    results.arxiv = arxivRes.status === 'fulfilled' ? arxivRes.value : [];

    report('search', `Found ${results.reddit.length} reddit, ${results.youtube.length} youtube, ${results.news.length} news, ${results.webSearch.length} web, ${results.hackernews.length} HN, ${results.bluesky.length} bsky, ${results.discourse.length} discourse, ${results.stackexchange.length} SE, ${results.semanticScholar.length} SS, ${results.arxiv.length} arXiv`, 10, 10);

    // Step 10: Rank, cluster, and generate report
    report('report', 'Analyzing and generating report...', 0, 1);
    log('info', 'Analyzing results...');

    const allResults = [
      ...results.reddit.map(r => ({ ...r, platform: 'Reddit' })),
      ...results.youtube.map(r => ({ ...r, platform: 'YouTube' })),
      ...results.news.map(r => ({ ...r, platform: 'News' })),
      ...results.webSearch.map(r => ({ ...r, platform: 'Web' })),
      ...results.hackernews.map(r => ({ ...r, platform: 'HN' })),
      ...results.bluesky.map(r => ({ ...r, platform: 'Bluesky' })),
      ...results.discourse.map(r => ({ ...r, platform: 'Discourse' })),
      ...results.stackexchange.map(r => ({ ...r, platform: 'StackExchange' })),
      ...results.semanticScholar.map(r => ({ ...r, platform: 'SemanticScholar' })),
      ...results.arxiv.map(r => ({ ...r, platform: 'arXiv' })),
    ];

    const ranked = queryAnalyzer.rankAndDeduplicate(allResults, analysis);
    const clusters = queryAnalyzer.clusterResults(ranked);
    const sentiment = analyzeBatch(results.reddit);
    const authorProfiles = this.buildAuthorProfiles(results.reddit);

    // Compute diff if requested
    let diffResult = null;
    if (diff) {
      diffResult = await this.computeDiff(topic, results);
      if (diffResult) {
        log('info', `Diff: +${diffResult.added} new, -${diffResult.removed} removed, ${diffResult.kept} unchanged since ${diffResult.previousTimestamp}`);
      } else {
        log('info', 'No previous session found for diff comparison');
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const reportData = {
      executiveSummary: this.generateSummary(results, analysis, ranked),
      clusters,
      sentiment,
      authorProfiles,
      diff: diffResult,
      template: templateConfig ? templateConfig.name : null,
      redditAnalysis: results.reddit,
      youtubeAnalysis: results.youtube,
      newsAnalysis: results.news,
      webSearchAnalysis: results.webSearch,
      hackernewsAnalysis: results.hackernews,
      blueskyAnalysis: results.bluesky,
      discourseAnalysis: results.discourse,
      stackexchangeAnalysis: results.stackexchange,
      semanticScholarAnalysis: results.semanticScholar,
      arxivAnalysis: results.arxiv,
      rankedResults: ranked.slice(0, 30),
      queryAnalysis: analysis,
      metadata: {
        topic,
        timestamp: results.timestamp,
        depth,
        duration: `${minutes}m ${seconds}s`,
        dateRange: dateRange ? `${since || 'any'} → ${until || 'any'}` : null,
        template: templateConfig ? templateConfig.name : null,
        diff: diffResult ? `${diffResult.added} new, ${diffResult.removed} removed` : null,
        redditPosts: results.reddit.length,
        youtubeVideos: results.youtube.length,
        newsArticles: results.news.length,
        webSearchResults: results.webSearch.length,
        hackernewsStories: results.hackernews.length,
        blueskyPosts: results.bluesky.length,
        discourseTopics: results.discourse.length,
        stackexchangeAnswers: results.stackexchange.length,
        semanticScholarPapers: results.semanticScholar.length,
        arxivPapers: results.arxiv.length,
        totalComments: results.reddit.reduce((sum, p) => sum + (p.topComments?.length || 0), 0)
          + results.hackernews.reduce((sum, p) => sum + (p.topComments?.length || 0), 0),
        totalSources: allResults.length,
        uniqueSources: ranked.length,
      },
    };

    const reportPath = output || `research-${topic.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${Date.now()}.html`;
    const finalPath = reportPath.endsWith('.html') ? reportPath : `${reportPath}.html`;

    await pdfGenerator.generateResearchReport(reportData, finalPath);

    const totalSources = Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    log('success', `Research complete: ${totalSources} total sources across 10 platforms`);
    log('info', `Duration: ${minutes}m ${seconds}s | Report: ${finalPath}`);
    report('report', `Report saved: ${finalPath}`, 1, 1);

    return { ...results, reportPath: finalPath, metadata: reportData.metadata, ranked, clusters, analysis };
  }

  generateSummary(results, analysis, ranked) {
    const topPosts = [];
    const topComments = [];
    const topNews = [];
    const topWeb = [];

    for (const post of results.reddit) {
      if (post.score > 5) {
        topPosts.push({
          title: post.title,
          score: post.score,
          subreddit: post.subreddit,
          url: post.url,
          numComments: post.numComments,
          sentiment: getSentiment(post.title + ' ' + (post.text || '')),
          platform: 'Reddit',
        });
      }
      if (post.topComments) {
        for (const comment of post.topComments) {
          if (comment.score > 3 && comment.text.length > 30) {
            topComments.push({
              text: comment.text.substring(0, 300),
              score: comment.score,
              postTitle: post.title,
              author: comment.author,
              sentiment: getSentiment(comment.text),
              platform: 'Reddit',
            });
          }
        }
      }
    }

    for (const story of results.hackernews) {
      if (story.score > 10) {
        topPosts.push({
          title: story.title,
          score: story.score,
          url: story.url,
          numComments: story.numComments,
          platform: 'HN',
        });
      }
      if (story.topComments) {
        for (const comment of story.topComments) {
          if (comment.text.length > 30) {
            topComments.push({
              text: comment.text.substring(0, 300),
              score: comment.score,
              postTitle: story.title,
              author: comment.author,
              platform: 'HN',
            });
          }
        }
      }
    }

    for (const post of results.bluesky) {
      if (post.likeCount > 5) {
        topPosts.push({
          title: post.title,
          score: post.likeCount,
          url: post.url,
          author: post.author,
          platform: 'Bluesky',
        });
      }
    }

    for (const article of results.news) {
      if (article.title) {
        topNews.push({
          title: article.title,
          source: article.source || 'News',
          url: article.url,
          publishedAt: article.publishedAt,
          description: article.description,
        });
      }
    }

    for (const result of results.webSearch) {
      if (result.title) {
        topWeb.push({
          title: result.title,
          url: result.url,
          description: result.description,
        });
      }
    }

    topPosts.sort((a, b) => b.score - a.score);
    topComments.sort((a, b) => b.score - a.score);

    return {
      topPosts: topPosts.slice(0, 20),
      topComments: topComments.slice(0, 20),
      topNews: topNews.slice(0, 15),
      topWeb: topWeb.slice(0, 10),
      ranked: ranked?.slice(0, 15) || [],
    };
  }

  buildAuthorProfiles(redditPosts) {
    const authorMap = {};

    for (const post of redditPosts) {
      if (!post.author || post.author === '[deleted]') continue;
      if (!authorMap[post.author]) {
        authorMap[post.author] = { author: post.author, posts: 0, totalScore: 0, subreddits: new Set() };
      }
      authorMap[post.author].posts++;
      authorMap[post.author].totalScore += post.score || 0;
      authorMap[post.author].subreddits.add(post.subreddit);
    }

    return Object.values(authorMap)
      .map(a => ({ ...a, avgScore: Math.round(a.totalScore / a.posts), subreddits: [...a.subreddits] }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);
  }

  parseDateRange(since, until) {
    if (!since && !until) return null;
    const parse = (val) => {
      if (!val) return null;
      if (/^\d+d$/.test(val)) {
        const days = parseInt(val);
        return new Date(Date.now() - days * 86400000);
      }
      if (/^\d+w$/.test(val)) {
        const weeks = parseInt(val);
        return new Date(Date.now() - weeks * 7 * 86400000);
      }
      if (/^\d+m$/.test(val)) {
        const months = parseInt(val);
        return new Date(Date.now() - months * 30 * 86400000);
      }
      return new Date(val);
    };
    return { from: parse(since), to: parse(until) };
  }

  getTemplate(template) {
    const templates = {
      'literature-review': {
        name: 'Literature Review',
        description: 'Focus on academic papers, citation counts, and research trends',
        prioritize: ['semanticScholar', 'arxiv'],
        querySuffix: 'research paper survey',
        minCitations: 5,
      },
      'comparison': {
        name: 'Comparison',
        description: 'Side-by-side comparison of options, alternatives, vs posts',
        prioritize: ['reddit', 'hackernews'],
        querySuffix: 'vs comparison review',
        clusters: ['Comparisons & Reviews', 'Tips & Advice'],
      },
      'trend-analysis': {
        name: 'Trend Analysis',
        description: 'Focus on recent news, latest developments, and emerging trends',
        prioritize: ['news', 'hackernews', 'bluesky'],
        querySuffix: 'latest news trends 2025',
        since: '30d',
      },
    };
    return templates[template] || null;
  }

  async computeDiff(topic, currentResults) {
    const sessionStore = require('../tui/sessionStore');
    const sessions = sessionStore.getAll ? sessionStore.getAll() : [];
    const previous = sessions.find(s => s.topic === topic);
    if (!previous || !previous.results) return null;

    const prevUrls = new Set();
    const currUrls = new Set();
    for (const arr of Object.values(previous.results)) {
      if (Array.isArray(arr)) arr.forEach(r => { if (r.url) prevUrls.add(r.url); });
    }
    for (const arr of Object.values(currentResults)) {
      if (Array.isArray(arr)) arr.forEach(r => { if (r.url) currUrls.add(r.url); });
    }

    const added = [...currUrls].filter(u => !prevUrls.has(u));
    const removed = [...prevUrls].filter(u => !currUrls.has(u));
    const kept = [...currUrls].filter(u => prevUrls.has(u));

    return {
      previousTimestamp: previous.timestamp,
      added: added.length,
      removed: removed.length,
      kept: kept.length,
      addedUrls: added.slice(0, 10),
      removedUrls: removed.slice(0, 10),
    };
  }
}

module.exports = new ResearchOrchestrator();
