const topicAnalyzer = require('./topicAnalyzer');
const queryAnalyzer = require('./queryAnalyzer');
const redditBulk = require('./redditBulk');
const youtubeDiscovery = require('./youtubeSearch');
const newsApi = require('../sources/newsApi');
const webSearch = require('../sources/webSearch');
const hackerNews = require('../sources/hackerNews');
const bluesky = require('../sources/bluesky');
const discourse = require('../sources/discourse');
const stackExchange = require('../sources/stackExchange');
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
    } = options;

    if (noCache) cache.disable();

    const startTime = Date.now();
    const log = onLog || ((level, msg) => {
      const prefix = { info: '  ', success: '✓ ', warn: '⚠ ', error: '✕ ' }[level] || '  ';
      console.log(`${prefix} ${msg}`);
    });

    const analysis = queryAnalyzer.analyze(topic);
    log('info', `Research: "${topic}" (depth: ${depth})`);
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
      analysis,
    };

    const report = (step, message, current, target) => {
      if (onProgress) onProgress({ step, message, current, target });
    };

    // Step 1: Discover sources
    report('discover', 'Discovering relevant subreddits...', 0, 1);
    log('info', 'Discovering relevant subreddits...');
    const subreddits = await topicAnalyzer.discoverSubreddits(topic);
    const queries = topicAnalyzer.buildSearchQueries(topic);
    log('success', `Found ${subreddits.length} subreddits`);
    report('discover', `Found ${subreddits.length} subreddits`, 1, 1);

    // Step 2: News search
    if (!youtubeOnly) {
      report('news', 'Searching news articles...', 0, 1);
      log('info', 'Searching news articles...');
      const cachedNews = await cache.get(topic, 'news');
      if (cachedNews) {
        results.news = cachedNews;
        log('success', `Found ${results.news.length} news articles (cached)`);
      } else {
        try {
          results.news = await newsApi.search(topic, { maxResults: Math.min(depth, config.RESEARCH.newsMaxResults), onLog });
          if (results.news.length > 0) await cache.set(topic, 'news', results.news);
          log('success', `Found ${results.news.length} news articles`);
        } catch (error) {
          log('error', `News search failed: ${error.message}`);
        }
      }
      report('news', `Found ${results.news.length} news articles`, 1, 1);
    }

    // Step 3: Web search
    if (!youtubeOnly) {
      report('web', 'Searching the web...', 0, 1);
      log('info', 'Searching the web...');
      const cachedWeb = await cache.get(topic, 'web');
      if (cachedWeb) {
        results.webSearch = cachedWeb;
        log('success', `Found ${results.webSearch.length} web results (cached)`);
      } else {
        const webTarget = Math.min(Math.ceil(depth * config.RESEARCH.webSearchRatio), config.RESEARCH.webSearchMax);
        try {
          results.webSearch = await webSearch.search(topic, { maxResults: webTarget, onLog });
          if (results.webSearch.length > 0) await cache.set(topic, 'web', results.webSearch);
          log('success', `Found ${results.webSearch.length} web results`);
        } catch (error) {
          log('error', `Web search failed: ${error.message}`);
        }
      }
      report('web', `Found ${results.webSearch.length} web results`, 1, 1);
    }

    // Step 4: Reddit scraping
    if (!youtubeOnly) {
      report('reddit', 'Scraping Reddit...', 0, 1);
      log('info', 'Scraping Reddit...');
      const cachedReddit = await cache.get(topic, 'reddit');
      if (cachedReddit) {
        results.reddit = cachedReddit;
        log('success', `Found ${results.reddit.length} Reddit posts (cached)`);
      } else {
        const redditTarget = Math.ceil(depth * config.RESEARCH.redditRatio);
        const redditProgress = (p) => {
          report('reddit', `r/${p.currentSub}: ${p.posts}/${p.target} posts`, p.posts, p.target);
        };

        try {
          results.reddit = await redditBulk.scrapeAll(subreddits, queries, redditTarget, redditProgress, log);
          if (results.reddit.length > 0) await cache.set(topic, 'reddit', results.reddit);
          log('success', `Reddit done: ${results.reddit.length} posts`);
        } catch (error) {
          log('error', `Reddit scraping failed: ${error.message}`);
        }
      }
      report('reddit', `Found ${results.reddit.length} Reddit posts`, 1, 1);
    }

    // Step 5: YouTube discovery
    if (!redditOnly) {
      report('youtube', 'Discovering YouTube videos...', 0, 1);
      log('info', 'Discovering YouTube videos...');
      const cachedYouTube = await cache.get(topic, 'youtube');
      if (cachedYouTube) {
        results.youtube = cachedYouTube;
        log('success', `Found ${results.youtube.length} YouTube videos (cached)`);
      } else {
        const youtubeTarget = Math.min(Math.ceil(depth * config.RESEARCH.youtubeRatio), config.RESEARCH.youtubeMax);
        const youtubeProgress = (p) => {
          report('youtube', `${p.videos}/${p.target} videos`, p.videos, p.target);
        };

        try {
          results.youtube = await youtubeDiscovery.discover(topic, youtubeTarget, youtubeProgress, log);
          if (results.youtube.length > 0) await cache.set(topic, 'youtube', results.youtube);
          log('success', `YouTube done: ${results.youtube.length} videos`);
        } catch (error) {
          log('error', `YouTube discovery failed: ${error.message}`);
        }
      }
      report('youtube', `Found ${results.youtube.length} YouTube videos`, 1, 1);
    }

    // Step 6: Hacker News
    if (!youtubeOnly && !redditOnly) {
      report('hackernews', 'Searching Hacker News...', 0, 1);
      log('info', 'Searching Hacker News...');
      const cachedHN = await cache.get(topic, 'hackernews');
      if (cachedHN) {
        results.hackernews = cachedHN;
        log('success', `Found ${results.hackernews.length} HN stories (cached)`);
      } else {
        try {
          results.hackernews = await hackerNews.searchWithComments(topic, {
            maxResults: Math.min(25, Math.ceil(depth * 0.15)),
            maxCommentsPerPost: 5,
            onLog,
          });
          if (results.hackernews.length > 0) await cache.set(topic, 'hackernews', results.hackernews);
          log('success', `HN done: ${results.hackernews.length} stories`);
        } catch (error) {
          log('error', `HN search failed: ${error.message}`);
        }
      }
      report('hackernews', `Found ${results.hackernews.length} HN stories`, 1, 1);
    }

    // Step 7: Bluesky
    if (!youtubeOnly && !redditOnly) {
      report('bluesky', 'Searching Bluesky...', 0, 1);
      log('info', 'Searching Bluesky...');
      const cachedBSky = await cache.get(topic, 'bluesky');
      if (cachedBSky) {
        results.bluesky = cachedBSky;
        log('success', `Found ${results.bluesky.length} Bluesky posts (cached)`);
      } else {
        try {
          results.bluesky = await bluesky.search(topic, {
            maxResults: Math.min(25, Math.ceil(depth * 0.15)),
            onLog,
          });
          if (results.bluesky.length > 0) await cache.set(topic, 'bluesky', results.bluesky);
          log('success', `Bluesky done: ${results.bluesky.length} posts`);
        } catch (error) {
          log('error', `Bluesky search failed: ${error.message}`);
        }
      }
      report('bluesky', `Found ${results.bluesky.length} Bluesky posts`, 1, 1);
    }

    // Step 8: Discourse forums
    if (!youtubeOnly && !redditOnly) {
      report('discourse', 'Searching Discourse forums...', 0, 1);
      log('info', 'Searching Discourse forums...');
      const cachedDisc = await cache.get(topic, 'discourse');
      if (cachedDisc) {
        results.discourse = cachedDisc;
        log('success', `Found ${results.discourse.length} Discourse posts (cached)`);
      } else {
        try {
          results.discourse = await discourse.search(topic, {
            maxResults: Math.min(25, Math.ceil(depth * 0.15)),
            onLog,
          });
          if (results.discourse.length > 0) await cache.set(topic, 'discourse', results.discourse);
          log('success', `Discourse done: ${results.discourse.length} posts`);
        } catch (error) {
          log('error', `Discourse search failed: ${error.message}`);
        }
      }
      report('discourse', `Found ${results.discourse.length} Discourse posts`, 1, 1);
    }

    // Step 9: Stack Exchange
    if (!youtubeOnly && !redditOnly) {
      report('stackexchange', 'Searching Stack Exchange...', 0, 1);
      log('info', 'Searching Stack Exchange...');
      const cachedSE = await cache.get(topic, 'stackexchange');
      if (cachedSE) {
        results.stackexchange = cachedSE;
        log('success', `Found ${results.stackexchange.length} SE results (cached)`);
      } else {
        try {
          results.stackexchange = await stackExchange.search(topic, {
            maxResults: Math.min(25, Math.ceil(depth * 0.15)),
            onLog,
          });
          if (results.stackexchange.length > 0) await cache.set(topic, 'stackexchange', results.stackexchange);
          log('success', `Stack Exchange done: ${results.stackexchange.length} results`);
        } catch (error) {
          log('error', `Stack Exchange search failed: ${error.message}`);
        }
      }
      report('stackexchange', `Found ${results.stackexchange.length} SE results`, 1, 1);
    }

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
    ];

    const ranked = queryAnalyzer.rankAndDeduplicate(allResults, analysis);
    const clusters = queryAnalyzer.clusterResults(ranked);
    const sentiment = analyzeBatch(results.reddit);
    const authorProfiles = this.buildAuthorProfiles(results.reddit);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const reportData = {
      executiveSummary: this.generateSummary(results, analysis, ranked),
      clusters,
      sentiment,
      authorProfiles,
      redditAnalysis: results.reddit,
      youtubeAnalysis: results.youtube,
      newsAnalysis: results.news,
      webSearchAnalysis: results.webSearch,
      hackernewsAnalysis: results.hackernews,
      blueskyAnalysis: results.bluesky,
      discourseAnalysis: results.discourse,
      stackexchangeAnalysis: results.stackexchange,
      rankedResults: ranked.slice(0, 30),
      queryAnalysis: analysis,
      metadata: {
        topic,
        timestamp: results.timestamp,
        depth,
        duration: `${minutes}m ${seconds}s`,
        redditPosts: results.reddit.length,
        youtubeVideos: results.youtube.length,
        newsArticles: results.news.length,
        webSearchResults: results.webSearch.length,
        hackernewsStories: results.hackernews.length,
        blueskyPosts: results.bluesky.length,
        discoursePosts: results.discourse.length,
        stackexchangeResults: results.stackexchange.length,
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
    log('success', `Research complete: ${totalSources} total sources across 8 platforms`);
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
}

module.exports = new ResearchOrchestrator();
