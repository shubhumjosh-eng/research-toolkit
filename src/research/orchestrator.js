const topicAnalyzer = require('./topicAnalyzer');
const redditBulk = require('./redditBulk');
const youtubeDiscovery = require('./youtubeSearch');
const newsApi = require('../sources/newsApi');
const webSearch = require('../sources/webSearch');
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

    log('info', `Research started: "${topic}" (depth: ${depth})`);

    const results = {
      topic,
      timestamp: new Date().toISOString(),
      reddit: [],
      youtube: [],
      news: [],
      webSearch: [],
    };

    const report = (step, message, current, target) => {
      if (onProgress) onProgress({ step, message, current, target });
    };

    // Step 1: Discover sources
    report('discover', 'Discovering relevant subreddits...', 0, 1);
    log('info', 'Discovering relevant subreddits...');
    const subreddits = await topicAnalyzer.discoverSubreddits(topic);
    const queries = topicAnalyzer.buildSearchQueries(topic);
    log('success', `Found ${subreddits.length} subreddits: ${subreddits.slice(0, 5).map(s => 'r/' + s.name).join(', ')}...`);
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
          await cache.set(topic, 'news', results.news);
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
          await cache.set(topic, 'web', results.webSearch);
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
          await cache.set(topic, 'reddit', results.reddit);
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
          await cache.set(topic, 'youtube', results.youtube);
          log('success', `YouTube done: ${results.youtube.length} videos`);
        } catch (error) {
          log('error', `YouTube discovery failed: ${error.message}`);
        }
      }
      report('youtube', `Found ${results.youtube.length} YouTube videos`, 1, 1);
    }

    // Step 6: Generate report
    report('report', 'Generating report...', 0, 1);
    log('info', 'Generating report...');

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const clusters = this.clusterTopics(results.reddit, topic);
    const sentiment = analyzeBatch(results.reddit);
    const authorProfiles = this.buildAuthorProfiles(results.reddit);

    const reportData = {
      executiveSummary: this.generateSummary(results),
      clusters,
      sentiment,
      authorProfiles,
      redditAnalysis: results.reddit,
      youtubeAnalysis: results.youtube,
      newsAnalysis: results.news,
      webSearchAnalysis: results.webSearch,
      metadata: {
        topic,
        timestamp: results.timestamp,
        depth,
        duration: `${minutes}m ${seconds}s`,
        redditPosts: results.reddit.length,
        youtubeVideos: results.youtube.length,
        newsArticles: results.news.length,
        webSearchResults: results.webSearch.length,
        totalComments: results.reddit.reduce((sum, p) => sum + (p.topComments?.length || 0), 0),
      },
    };

    const reportPath = output || `research-${topic.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${Date.now()}.html`;
    const finalPath = reportPath.endsWith('.html') ? reportPath : `${reportPath}.html`;

    await pdfGenerator.generateResearchReport(reportData, finalPath);

    log('success', `Research complete: ${results.reddit.length} posts, ${results.youtube.length} videos, ${results.news.length} news, ${results.webSearch.length} web`);
    log('info', `Duration: ${minutes}m ${seconds}s | Report: ${finalPath}`);
    report('report', `Report saved: ${finalPath}`, 1, 1);

    return { ...results, reportPath: finalPath, metadata: reportData.metadata };
  }

  generateSummary(results) {
    const topPosts = [];
    const topComments = [];
    const topNews = [];
    const topWeb = [];

    for (const post of results.reddit) {
      if (post.score > 10) {
        topPosts.push({
          title: post.title,
          score: post.score,
          subreddit: post.subreddit,
          url: post.url,
          numComments: post.numComments,
          sentiment: getSentiment(post.title + ' ' + (post.text || '')),
        });
      }

      if (post.topComments) {
        for (const comment of post.topComments) {
          if (comment.score > 5 && comment.text.length > 50) {
            topComments.push({
              text: comment.text.substring(0, 300),
              score: comment.score,
              postTitle: post.title,
              author: comment.author,
              sentiment: getSentiment(comment.text),
            });
          }
        }
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
    };
  }

  clusterPostsByKeyword(posts, keywords) {
    return posts.filter(post => {
      const text = (post.title + ' ' + (post.text || '')).toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
  }

  clusterTopics(redditPosts, topic) {
    const clusterDefinitions = [
      { name: 'Key Findings & Data', keywords: ['study', 'research', 'data', 'statistic', 'survey', 'finding', 'result', 'evidence', 'report', 'analysis'] },
      { name: 'Expert Opinions', keywords: ['expert', 'professor', 'researcher', 'scientist', 'authority', 'specialist', 'academic', 'doctor'] },
      { name: 'Methodology & Approaches', keywords: ['method', 'approach', 'technique', 'strategy', 'framework', 'process', 'system', 'procedure'] },
      { name: 'Tools & Resources', keywords: ['tool', 'resource', 'software', 'app', 'book', 'course', 'guide', 'tutorial', 'template', 'library'] },
      { name: 'Comparisons & Reviews', keywords: ['vs', 'versus', 'compare', 'review', 'alternative', 'better', 'worse', 'opinion', 'recommend'] },
      { name: 'Common Misconceptions', keywords: ['myth', 'misconception', 'wrong', 'actually', 'truth', 'fact', 'debunk', 'real', 'believe'] },
      { name: 'Challenges & Limitations', keywords: ['challenge', 'problem', 'difficult', 'limitation', 'barrier', 'obstacle', 'issue', 'concern', 'struggle'] },
      { name: 'Future Trends', keywords: ['future', 'trend', 'prediction', 'upcoming', 'next', 'emerging', 'innovation', 'forecast', 'ahead'] },
      { name: 'Case Studies & Examples', keywords: ['example', 'case', 'story', 'experience', 'personal', 'journey', 'real', 'actual', 'instance'] },
      { name: 'Getting Started', keywords: ['start', 'begin', 'intro', 'basic', 'beginner', 'first', 'learn', 'how to', 'step', 'guide'] },
    ];

    const clusters = [];
    const usedPostIds = new Set();

    for (const cluster of clusterDefinitions) {
      const matchingPosts = this.clusterPostsByKeyword(redditPosts, cluster.keywords);
      if (matchingPosts.length >= 2) {
        clusters.push({
          name: cluster.name,
          count: matchingPosts.length,
          posts: matchingPosts.slice(0, 5),
        });
        matchingPosts.forEach(p => usedPostIds.add(p.id));
      }
    }

    const unmatched = redditPosts.filter(p => !usedPostIds.has(p.id));
    if (unmatched.length >= 2) {
      clusters.push({
        name: 'General Discussion',
        count: unmatched.length,
        posts: unmatched.slice(0, 5),
      });
    }

    clusters.sort((a, b) => b.count - a.count);
    return clusters.slice(0, 8);
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
