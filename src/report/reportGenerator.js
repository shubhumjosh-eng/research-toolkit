const fs = require('fs').promises;
const path = require('path');
const { ensureDir, formatDate } = require('../utils/helpers');
const { getSentiment, SENTIMENT_WORDS_JS } = require('../utils/sentiment');

class PdfGenerator {
  async generateResearchReport(data, outputPath) {
    await ensureDir(path.dirname(outputPath));

    const { executiveSummary, clusters, sentiment, authorProfiles, redditAnalysis, youtubeAnalysis, newsAnalysis, webSearchAnalysis, hackernewsAnalysis, blueskyAnalysis, discourseAnalysis, stackexchangeAnalysis, semanticScholarAnalysis, arxivAnalysis, metadata } = data;

    const sentimentData = sentiment || { positive: 0, negative: 0, neutral: 0, positivePct: 0, negativePct: 0, neutralPct: 0 };
    const clusterData = clusters || [];
    const authorData = authorProfiles || [];

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research Report: ${this.esc(metadata.topic)}</title>
    <style>
        :root {
            --bg: #ffffff; --bg2: #f8f9fa; --bg3: #f0f0f0;
            --text: #333333; --text2: #666666; --text3: #888888;
            --accent: #1a73e8; --accent2: #e3f2fd;
            --border: #e0e0e0; --border2: #d0d0d0;
            --red: #c62828; --red-bg: #fce4ec;
            --green: #2e7d32; --green-bg: #e8f5e9;
            --blue: #1565c0; --blue-bg: #e3f2fd;
            --purple: #7b1fa2; --purple-bg: #f3e5f5;
            --yellow: #f57f17; --yellow-bg: #fff8e1;
            --shadow: rgba(0,0,0,0.06);
        }
        .dark {
            --bg: #1a1a2e; --bg2: #16213e; --bg3: #0f3460;
            --text: #e0e0e0; --text2: #b0b0b0; --text3: #808080;
            --accent: #4fc3f7; --accent2: #1a237e;
            --border: #2a2a4a; --border2: #3a3a5a;
            --red: #ef9a9a; --red-bg: #3e2723;
            --green: #a5d6a7; --green-bg: #1b5e20;
            --blue: #90caf9; --blue-bg: #0d47a1;
            --purple: #ce93d8; --purple-bg: #4a148c;
            --yellow: #fff176; --yellow-bg: #f57f17;
            --shadow: rgba(0,0,0,0.3);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; color: var(--text); background: var(--bg);
            max-width: 1000px; margin: 0 auto; padding: 40px 20px;
        }
        .dark body, body.dark { background: var(--bg); color: var(--text); }
        h1 { color: var(--text); border-bottom: 3px solid var(--accent); padding-bottom: 12px; margin-bottom: 10px; font-size: 2.2em; }
        h2 { color: var(--accent); margin-top: 40px; margin-bottom: 15px; font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        h3 { color: var(--text); margin-top: 20px; margin-bottom: 10px; font-size: 1.2em; }
        .subtitle { color: var(--text2); font-size: 1.1em; margin-bottom: 25px; }
        .toolbar { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; align-items: center; }
        .toolbar button {
            padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px;
            background: var(--bg2); color: var(--text); cursor: pointer; font-size: 0.85em;
        }
        .toolbar button:hover { background: var(--accent2); border-color: var(--accent); }
        .toolbar button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        #searchBox {
            padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px;
            background: var(--bg2); color: var(--text); font-size: 0.9em; width: 220px;
        }
        .toc {
            background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
            padding: 15px 20px; margin: 20px 0;
        }
        .toc h3 { margin-top: 0; color: var(--accent); font-size: 1em; text-transform: uppercase; letter-spacing: 1px; }
        .toc ul { list-style: none; padding: 0; }
        .toc li { margin: 6px 0; }
        .toc a { color: var(--text); text-decoration: none; font-size: 0.95em; }
        .toc a:hover { color: var(--accent); text-decoration: underline; }
        .toc a::before { content: '→ '; color: var(--accent); }
        .stats-bar { display: flex; gap: 15px; flex-wrap: wrap; margin: 20px 0; }
        .stat-box {
            background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
            padding: 15px 20px; min-width: 130px; text-align: center; flex: 1;
        }
        .stat-box .number { font-size: 1.8em; font-weight: bold; color: var(--accent); }
        .stat-box .label { font-size: 0.82em; color: var(--text2); margin-top: 2px; }
        .charts-row { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .chart-box {
            background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
            padding: 15px 20px; flex: 1; min-width: 280px;
        }
        .chart-box h4 { font-size: 0.9em; color: var(--text2); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .bar-chart { display: flex; flex-direction: column; gap: 8px; }
        .bar-row { display: flex; align-items: center; gap: 10px; }
        .bar-label { width: 110px; font-size: 0.85em; color: var(--text2); text-align: right; }
        .bar-track { flex: 1; height: 20px; background: var(--bg3); border-radius: 10px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 10px; transition: width 0.3s; }
        .bar-fill.positive { background: var(--green); }
        .bar-fill.negative { background: var(--red); }
        .bar-fill.neutral { background: var(--yellow); }
        .bar-fill.reddit { background: var(--red); }
        .bar-fill.news { background: var(--green); }
        .bar-fill.web { background: var(--blue); }
        .bar-fill.youtube { background: var(--purple); }
        .bar-value { width: 40px; font-size: 0.85em; color: var(--text2); }
        .sentiment-badge {
            display: inline-block; padding: 2px 8px; border-radius: 4px;
            font-size: 0.75em; font-weight: bold; margin-left: 5px;
        }
        .sentiment-positive { background: var(--green-bg); color: var(--green); }
        .sentiment-negative { background: var(--red-bg); color: var(--red); }
        .sentiment-neutral { background: var(--yellow-bg); color: var(--yellow); }
        .section { margin-bottom: 40px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .section-header h2 { margin: 0; border: none; padding: 0; }
        .collapse-btn {
            padding: 4px 10px; border: 1px solid var(--border); border-radius: 4px;
            background: var(--bg2); color: var(--text2); cursor: pointer; font-size: 0.75em;
        }
        .collapse-btn:hover { background: var(--accent2); }
        .post-card {
            border: 1px solid var(--border); border-radius: 8px; padding: 15px 20px;
            margin-bottom: 12px; background: var(--bg2); transition: all 0.2s;
        }
        .post-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px var(--shadow); }
        .post-card.highlight { border-left: 4px solid var(--accent); background: var(--accent2); }
        .post-card h4 { color: var(--text); margin-bottom: 5px; font-size: 1.05em; }
        .post-card .text { color: var(--text2); font-size: 0.93em; margin: 8px 0; }
        .post-card .meta { color: var(--text3); font-size: 0.85em; }
        .post-card a { color: var(--accent); text-decoration: none; }
        .post-card a:hover { text-decoration: underline; }
        .comment-card {
            margin: 8px 0 8px 20px; padding: 10px 15px; background: var(--bg);
            border-left: 3px solid var(--border); border-radius: 0 6px 6px 0;
        }
        .comment-card .author { color: var(--text3); font-size: 0.85em; }
        .comment-card .text { color: var(--text); font-size: 0.93em; margin: 5px 0; }
        .comment-card .score { color: var(--accent); font-size: 0.85em; font-weight: bold; }
        .video-card {
            border: 1px solid var(--border); border-radius: 8px; padding: 15px 20px;
            margin-bottom: 12px; background: var(--bg2); display: flex; gap: 15px;
        }
        .video-card .thumb { width: 160px; min-width: 120px; }
        .video-card .thumb img { width: 100%; border-radius: 6px; }
        .video-card .info { flex: 1; }
        .video-card h4 { color: var(--text); margin-bottom: 5px; }
        .video-card .channel { color: var(--text2); font-size: 0.9em; }
        .video-card .meta { color: var(--text3); font-size: 0.85em; margin-top: 5px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; margin-right: 5px; }
        .badge-reddit { background: var(--red-bg); color: var(--red); }
        .badge-youtube { background: var(--purple-bg); color: var(--purple); }
        .badge-news { background: var(--green-bg); color: var(--green); }
        .badge-web { background: var(--blue-bg); color: var(--blue); }
        .badge-score { background: var(--blue-bg); color: var(--blue); }
        .badge-hn { background: #FF660015; color: #FF6600; }
        .badge-bluesky { background: #0085FF15; color: #0085FF; }
        .badge-discourse { background: #0A0A0A15; color: #666; }
        .badge-se { background: #F4802415; color: #F48024; }
        .badge-ss { background: #1857B615; color: #1857B6; }
        .badge-arxiv { background: #B31B1B15; color: #B31B1B; }
        .cluster-card {
            border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px;
            margin-bottom: 10px; background: var(--bg2);
        }
        .cluster-card h4 { color: var(--accent); font-size: 1em; margin-bottom: 4px; }
        .cluster-card .count { color: var(--text3); font-size: 0.85em; }
        .cluster-card .post-list { margin-top: 8px; font-size: 0.9em; color: var(--text2); }
        .cluster-card .post-list li { margin: 3px 0; }
        .author-card {
            border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px;
            margin-bottom: 10px; background: var(--bg2); display: flex; justify-content: space-between; align-items: center;
        }
        .author-card .name { font-weight: bold; color: var(--accent); }
        .author-card .stats { color: var(--text3); font-size: 0.85em; }
        .collapsible-content { overflow: hidden; transition: max-height 0.3s ease; }
        .collapsible-content.collapsed { max-height: 0; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--text3); font-size: 0.85em; text-align: center; }
        @media print {
            .toolbar, .toc, .collapse-btn { display: none !important; }
            .collapsible-content { max-height: none !important; }
            body { padding: 0; background: #fff; color: #333; }
            .post-card, .video-card, .comment-card { page-break-inside: avoid; }
        }
        @media (max-width: 600px) {
            .stats-bar { flex-direction: column; }
            .charts-row { flex-direction: column; }
            .video-card { flex-direction: column; }
            .video-card .thumb { width: 100%; }
        }
    </style>
</head>
<body>
    <h1>Research Report</h1>
    <p class="subtitle">"${this.esc(metadata.topic)}" &mdash; ${formatDate(new Date())}${metadata.template ? ' &mdash; Template: ' + this.esc(metadata.template) : ''}${metadata.dateRange ? ' &mdash; Since: ' + this.esc(metadata.dateRange) : ''}${metadata.diff ? ' &mdash; Diff: ' + this.esc(metadata.diff) : ''}</p>

    <div class="toolbar">
        <button onclick="toggleDark()" id="darkBtn">Dark Mode</button>
        <button onclick="expandAll()">Expand All</button>
        <button onclick="collapseAll()">Collapse All</button>
        <button onclick="window.print()">Export PDF</button>
        <input type="text" id="searchBox" placeholder="Search report..." oninput="filterCards(this.value)">
    </div>

    <nav class="toc">
        <h3>Contents</h3>
        <ul>
            <li><a href="#executive-summary">Executive Summary</a></li>
            ${clusterData.length > 0 ? '<li><a href="#topic-clusters">Topic Clusters</a></li>' : ''}
            <li><a href="#news-section">News Articles (${metadata.newsArticles || 0})</a></li>
            <li><a href="#web-section">Web Results (${metadata.webSearchResults || 0})</a></li>
            <li><a href="#reddit-section">Reddit Analysis (${metadata.redditPosts || 0} posts)</a></li>
            ${authorData.length > 0 ? '<li><a href="#author-section">Top Authors</a></li>' : ''}
            <li><a href="#youtube-section">YouTube Videos (${metadata.youtubeVideos || 0})</a></li>
            <li><a href="#hn-section">Hacker News (${metadata.hackernewsStories || 0})</a></li>
            <li><a href="#bluesky-section">Bluesky (${metadata.blueskyPosts || 0})</a></li>
            <li><a href="#discourse-section">Discourse (${metadata.discourseTopics || 0})</a></li>
            <li><a href="#se-section">Stack Exchange (${metadata.stackexchangeAnswers || 0})</a></li>
            ${metadata.semanticScholarPapers ? '<li><a href="#ss-section">Semantic Scholar (' + metadata.semanticScholarPapers + ')</a></li>' : ''}
            ${metadata.arxivPapers ? '<li><a href="#arxiv-section">arXiv (' + metadata.arxivPapers + ')</a></li>' : ''}
        </ul>
    </nav>

    <div class="stats-bar">
        <div class="stat-box"><div class="number">${metadata.redditPosts || 0}</div><div class="label">Reddit Posts</div></div>
        <div class="stat-box"><div class="number">${metadata.totalComments || 0}</div><div class="label">Comments</div></div>
        <div class="stat-box"><div class="number">${metadata.newsArticles || 0}</div><div class="label">News</div></div>
        <div class="stat-box"><div class="number">${metadata.webSearchResults || 0}</div><div class="label">Web</div></div>
        <div class="stat-box"><div class="number">${metadata.youtubeVideos || 0}</div><div class="label">Videos</div></div>
        <div class="stat-box"><div class="number">${metadata.hackernewsStories || 0}</div><div class="label">HN</div></div>
        <div class="stat-box"><div class="number">${metadata.blueskyPosts || 0}</div><div class="label">Bluesky</div></div>
        <div class="stat-box"><div class="number">${metadata.discourseTopics || 0}</div><div class="label">Discourse</div></div>
        <div class="stat-box"><div class="number">${metadata.stackexchangeAnswers || 0}</div><div class="label">SE</div></div>
        <div class="stat-box"><div class="number">${metadata.duration}</div><div class="label">Time</div></div>
    </div>

    <div class="charts-row">
        <div class="chart-box">
            <h4>Source Breakdown</h4>
            <div class="bar-chart">
                ${this.sourceBar('Reddit', metadata.redditPosts, 'reddit')}
                ${this.sourceBar('News', metadata.newsArticles, 'news')}
                ${this.sourceBar('Web', metadata.webSearchResults || 0, 'web')}
                ${this.sourceBar('YouTube', metadata.youtubeVideos, 'youtube')}
                ${this.sourceBar('HN', metadata.hackernewsStories || 0, 'news')}
                ${this.sourceBar('Bluesky', metadata.blueskyPosts || 0, 'web')}
                ${this.sourceBar('Discourse', metadata.discourseTopics || 0, 'reddit')}
                ${this.sourceBar('SE', metadata.stackexchangeAnswers || 0, 'youtube')}
            </div>
        </div>
        <div class="chart-box">
            <h4>Reddit Sentiment</h4>
            <div class="bar-chart">
                <div class="bar-row">
                    <div class="bar-label">Positive</div>
                    <div class="bar-track"><div class="bar-fill positive" style="width:${sentimentData.positivePct}%"></div></div>
                    <div class="bar-value">${sentimentData.positivePct}%</div>
                </div>
                <div class="bar-row">
                    <div class="bar-label">Neutral</div>
                    <div class="bar-track"><div class="bar-fill neutral" style="width:${sentimentData.neutralPct}%"></div></div>
                    <div class="bar-value">${sentimentData.neutralPct}%</div>
                </div>
                <div class="bar-row">
                    <div class="bar-label">Negative</div>
                    <div class="bar-track"><div class="bar-fill negative" style="width:${sentimentData.negativePct}%"></div></div>
                    <div class="bar-value">${sentimentData.negativePct}%</div>
                </div>
            </div>
        </div>
    </div>
`;

    // ── Executive Summary ──
    html += `<div class="section" id="executive-summary"><div class="section-header"><h2>Executive Summary</h2></div>`;

    if (executiveSummary && executiveSummary.topPosts && executiveSummary.topPosts.length > 0) {
      html += `<h3>Top Reddit Discussions</h3>`;
      for (const post of executiveSummary.topPosts.slice(0, 10)) {
        const sentBadge = post.sentiment ? `<span class="sentiment-badge sentiment-${post.sentiment}">${post.sentiment}</span>` : '';
        html += `
        <div class="post-card highlight" data-searchable="${this.esc(post.title)}">
          <h4>${this.esc(post.title)} ${sentBadge}</h4>
          <div class="meta"><span class="badge badge-score">⬆ ${post.score}</span> <span class="badge badge-reddit">r/${this.esc(post.subreddit)}</span> 💬 ${post.numComments || 0} comments · <a href="${this.esc(post.url)}" target="_blank">View →</a></div>
        </div>`;
      }
    }

    if (executiveSummary && executiveSummary.topComments && executiveSummary.topComments.length > 0) {
      html += `<h3 style="margin-top:20px;">Top Insights</h3>`;
      for (const insight of executiveSummary.topComments.slice(0, 10)) {
        const sentBadge = insight.sentiment ? `<span class="sentiment-badge sentiment-${insight.sentiment}">${insight.sentiment}</span>` : '';
        html += `
        <div class="comment-card" data-searchable="${this.esc(insight.text)}">
          <div class="text">"${this.esc(insight.text)}" ${sentBadge}</div>
          <div class="meta"><span class="score">⬆ ${insight.score}</span> — by ${this.esc(insight.author)} in: ${this.esc(insight.postTitle)}</div>
        </div>`;
      }
    }

    if (executiveSummary && executiveSummary.topNews && executiveSummary.topNews.length > 0) {
      html += `<h3 style="margin-top:20px;">Top News Coverage</h3>`;
      for (const news of executiveSummary.topNews.slice(0, 8)) {
        html += `
        <div class="post-card" data-searchable="${this.esc(news.title)}">
          <h4>${this.esc(news.title)}</h4>
          <div class="meta"><span class="badge badge-news">NEWS</span> ${this.esc(news.source)} ${news.publishedAt ? `· ${formatDate(news.publishedAt)}` : ''}</div>
          ${news.description ? `<div class="text">${this.esc(news.description.substring(0, 300))}${news.description.length > 300 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(news.url)}" target="_blank">Read article →</a></div>
        </div>`;
      }
    }

    if (executiveSummary.topWeb && executiveSummary.topWeb.length > 0) {
      html += `<h3 style="margin-top:20px;">Top Web Findings</h3>`;
      for (const web of executiveSummary.topWeb.slice(0, 8)) {
        html += `
        <div class="post-card" data-searchable="${this.esc(web.title)}">
          <h4>${this.esc(web.title)}</h4>
          <div class="meta"><span class="badge badge-web">WEB</span> ${this.esc(this.extractHostname(web.url))}</div>
          ${web.description ? `<div class="text">${this.esc(web.description.substring(0, 300))}${web.description.length > 300 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(web.url)}" target="_blank">Visit page →</a></div>
        </div>`;
      }
    }
    html += `</div>`;

    // ── Topic Clusters ──
    if (clusterData.length > 0) {
      html += `<div class="section" id="topic-clusters"><div class="section-header"><h2>Topic Clusters</h2></div>`;
      for (const cluster of clusterData) {
        html += `
        <div class="cluster-card" data-searchable="${this.esc(cluster.name)}">
          <h4>${this.esc(cluster.name)} <span class="count">(${cluster.count} posts)</span></h4>
          <ul class="post-list">`;
        for (const post of cluster.items) {
          html += `<li>${this.esc(post.title.substring(0, 80))}${post.title.length > 80 ? '...' : ''} <span class="badge badge-score">⬆ ${post.score}</span></li>`;
        }
        html += `</ul></div>`;
      }
      html += `</div>`;
    }

    // ── News Section ──
    if (newsAnalysis && newsAnalysis.length > 0) {
      html += `<div class="section" id="news-section"><div class="section-header"><h2>News Articles (${newsAnalysis.length})</h2>
        <button class="collapse-btn" onclick="toggleSection('news-cards')">Toggle</button></div>
        <div class="collapsible-content" id="news-cards">`;
      for (const article of newsAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(article.title || '')} ${this.esc(article.description || '')}">
          <h4>${this.esc(article.title || 'Untitled')}</h4>
          <div class="meta"><span class="badge badge-news">NEWS</span> ${this.esc(article.source || 'Unknown')} ${article.publishedAt ? `· ${formatDate(article.publishedAt)}` : ''}</div>
          ${article.description ? `<div class="text">${this.esc(article.description.substring(0, 400))}${article.description.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(article.url)}" target="_blank">Read article →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Web Search Section ──
    if (webSearchAnalysis && webSearchAnalysis.length > 0) {
      html += `<div class="section" id="web-section"><div class="section-header"><h2>Web Results (${webSearchAnalysis.length})</h2>
        <button class="collapse-btn" onclick="toggleSection('web-cards')">Toggle</button></div>
        <div class="collapsible-content" id="web-cards">`;
      for (const result of webSearchAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(result.title || '')} ${this.esc(result.description || '')}">
          <h4>${this.esc(result.title || 'Untitled')}</h4>
          <div class="meta"><span class="badge badge-web">WEB</span> ${this.esc(this.extractHostname(result.url))}</div>
          ${result.description ? `<div class="text">${this.esc(result.description.substring(0, 400))}${result.description.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(result.url)}" target="_blank">Visit page →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Reddit Section ──
    if (redditAnalysis && redditAnalysis.length > 0) {
      html += `<div class="section" id="reddit-section"><div class="section-header"><h2>Reddit Analysis (${redditAnalysis.length} posts)</h2>
        <button class="collapse-btn" onclick="toggleSection('reddit-cards')">Toggle</button></div>
        <div class="collapsible-content" id="reddit-cards">`;
      const sorted = [...redditAnalysis].sort((a, b) => b.score - a.score);
      for (const post of sorted) {
        const sent = getSentiment(post.title + ' ' + (post.text || ''));
        const sentBadge = `<span class="sentiment-badge sentiment-${sent}">${sent}</span>`;
        html += `
        <div class="post-card${post.score > 50 ? ' highlight' : ''}" data-searchable="${this.esc(post.title)} ${this.esc(post.text || '')} ${this.esc(post.author)}">
          <h4>${this.esc(post.title)}</h4>
          <div class="meta">
            <span class="badge badge-reddit">r/${this.esc(post.subreddit)}</span>
            <span class="badge badge-score">⬆ ${post.score}</span>
            ${sentBadge}
            💬 ${post.numComments} comments · ${this.esc(post.author)} · ${formatDate(post.created)}
          </div>
          ${post.text ? `<div class="text">${this.esc(post.text.substring(0, 500))}${post.text.length > 500 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(post.url)}" target="_blank">View on Reddit →</a></div>`;

        if (post.topComments && post.topComments.length > 0) {
          html += `<div style="margin-top:10px;"><strong>Top Comments:</strong></div>`;
          for (const comment of post.topComments.slice(0, 3)) {
            html += `
            <div class="comment-card">
              <div class="author">${this.esc(comment.author)} <span class="score">⬆ ${comment.score}</span></div>
              <div class="text">${this.esc(comment.text.substring(0, 350))}${comment.text.length > 350 ? '...' : ''}</div>
            </div>`;
          }
        }
        html += `</div>`;
      }
      html += `</div></div>`;
    }

    // ── Author Profiles ──
    if (authorData.length > 0) {
      html += `<div class="section" id="author-section"><div class="section-header"><h2>Top Authors</h2></div>`;
      for (const author of authorData) {
        html += `
        <div class="author-card" data-searchable="${this.esc(author.author)}">
          <div>
            <div class="name">u/${this.esc(author.author)}</div>
            <div class="stats">${author.posts} posts · ⬆ ${author.totalScore} total · avg ⬆ ${author.avgScore}</div>
            <div class="stats">Active in: ${author.subreddits.map(s => 'r/' + this.esc(s)).join(', ')}</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    // ── YouTube Section ──
    if (youtubeAnalysis && youtubeAnalysis.length > 0) {
      html += `<div class="section" id="youtube-section"><div class="section-header"><h2>YouTube Analysis (${youtubeAnalysis.length} videos)</h2>
        <button class="collapse-btn" onclick="toggleSection('youtube-cards')">Toggle</button></div>
        <div class="collapsible-content" id="youtube-cards">`;
      const sorted = [...youtubeAnalysis].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      for (const video of sorted) {
        const thumb = video.thumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
        html += `
        <div class="video-card" data-searchable="${this.esc(video.title)} ${this.esc(video.channelName || '')}">
          <div class="thumb"><img src="${thumb}" alt="${this.esc(video.title)}" loading="lazy"></div>
          <div class="info">
            <h4>${this.esc(video.title)}</h4>
            <div class="channel">${this.esc(video.channelName || 'Unknown')}</div>
            <div class="meta">
              ${video.viewCount ? `👁 ${(video.viewCount || 0).toLocaleString()} views` : ''}
              ${video.duration ? ` · ⏱ ${video.duration}` : ''}
              ${video.publishedAt ? ` · ${video.publishedAt}` : ''}
            </div>
            <div class="meta"><a href="${this.esc(video.url)}" target="_blank">Watch on YouTube →</a></div>
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Hacker News Section ──
    if (hackernewsAnalysis && hackernewsAnalysis.length > 0) {
      html += `<div class="section" id="hn-section"><div class="section-header"><h2>Hacker News (${hackernewsAnalysis.length} stories)</h2>
        <button class="collapse-btn" onclick="toggleSection('hn-cards')">Toggle</button></div>
        <div class="collapsible-content" id="hn-cards">`;
      for (const story of hackernewsAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(story.title || '')}">
          <h4>${this.esc(story.title || 'Untitled')}</h4>
          <div class="meta">
            <span class="badge badge-hn">HN</span>
            ${story.score ? `<span class="badge badge-score">⬆ ${story.score}</span>` : ''}
            ${story.numComments ? `💬 ${story.numComments} comments` : ''}
            ${story.author ? `· ${this.esc(story.author)}` : ''}
            ${story.created ? `· ${formatDate(story.created)}` : ''}
          </div>
          <div class="meta">
            <a href="${this.esc(story.url || story.sourceUrl || '#')}" target="_blank">${story.url ? 'Read article →' : 'View on HN →'}</a>
            ${story.sourceUrl && story.url ? ` · <a href="${this.esc(story.sourceUrl)}" target="_blank">HN Discussion →</a>` : ''}
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Bluesky Section ──
    if (blueskyAnalysis && blueskyAnalysis.length > 0) {
      html += `<div class="section" id="bluesky-section"><div class="section-header"><h2>Bluesky (${blueskyAnalysis.length} posts)</h2>
        <button class="collapse-btn" onclick="toggleSection('bluesky-cards')">Toggle</button></div>
        <div class="collapsible-content" id="bluesky-cards">`;
      for (const post of blueskyAnalysis) {
        const sent = getSentiment(post.text || post.title || '');
        const sentBadge = `<span class="sentiment-badge sentiment-${sent}">${sent}</span>`;
        html += `
        <div class="post-card" data-searchable="${this.esc(post.text || post.title || '')} ${this.esc(post.author || '')}">
          <h4>${this.esc((post.text || post.title || 'No text').substring(0, 200))}${(post.text || post.title || '').length > 200 ? '...' : ''}</h4>
          <div class="meta">
            <span class="badge badge-bluesky">BLUESKY</span>
            ${post.likeCount ? `❤ ${post.likeCount}` : ''}
            ${post.repostCount ? ` · 🔁 ${post.repostCount}` : ''}
            ${post.replyCount ? ` · 💬 ${post.replyCount}` : ''}
            ${sentBadge}
            · ${this.esc(post.author || 'unknown')}
            ${post.created ? ` · ${formatDate(post.created)}` : ''}
          </div>
          ${post.text && post.text.length > 200 ? `<div class="text">${this.esc(post.text.substring(0, 400))}...</div>` : ''}
          <div class="meta"><a href="${this.esc(post.url || '#')}" target="_blank">View on Bluesky →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Discourse Section ──
    if (discourseAnalysis && discourseAnalysis.length > 0) {
      html += `<div class="section" id="discourse-section"><div class="section-header"><h2>Discourse (${discourseAnalysis.length} topics)</h2>
        <button class="collapse-btn" onclick="toggleSection('discourse-cards')">Toggle</button></div>
        <div class="collapsible-content" id="discourse-cards">`;
      for (const topic of discourseAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(topic.title || '')}">
          <h4>${this.esc(topic.title || 'Untitled')}</h4>
          <div class="meta">
            <span class="badge badge-discourse">DISCOURSE</span>
            <span class="badge badge-score">⬆ ${topic.score || 0}</span>
            💬 ${(topic.replyCount || 0) - 1} replies
            ${topic.views ? ` · 👁 ${topic.views} views` : ''}
            ${topic.author ? ` · ${this.esc(topic.author)}` : ''}
            ${topic.created ? ` · ${formatDate(topic.created)}` : ''}
          </div>
          ${topic.text ? `<div class="text">${this.esc(topic.text.substring(0, 400))}${topic.text.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(topic.url || '#')}" target="_blank">View topic →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Stack Exchange Section ──
    if (stackexchangeAnalysis && stackexchangeAnalysis.length > 0) {
      html += `<div class="section" id="se-section"><div class="section-header"><h2>Stack Exchange (${stackexchangeAnalysis.length} questions)</h2>
        <button class="collapse-btn" onclick="toggleSection('se-cards')">Toggle</button></div>
        <div class="collapsible-content" id="se-cards">`;
      for (const q of stackexchangeAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(q.title || '')}">
          <h4>${this.esc(q.title || 'Untitled')}</h4>
          <div class="meta">
            <span class="badge badge-se">STACK EXCHANGE</span>
            <span class="badge badge-score">⬆ ${q.score || 0}</span>
            💬 ${q.answerCount || 0} answers
            ${q.viewCount ? ` · 👁 ${q.viewCount.toLocaleString()} views` : ''}
            ${q.isAnswered ? ' · ✅ Accepted' : ''}
            ${q.author ? ` · ${this.esc(q.author)}` : ''}
          </div>
          ${q.tags && q.tags.length > 0 ? `<div class="meta" style="margin-top:5px;">${q.tags.map(t => '<span class="badge badge-web" style="margin-right:3px;">' + this.esc(t) + '</span>').join('')}</div>` : ''}
          ${q.text ? `<div class="text">${this.esc(q.text.substring(0, 400))}${q.text.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(q.url || '#')}" target="_blank">View on SE →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Semantic Scholar Section ──
    if (semanticScholarAnalysis && semanticScholarAnalysis.length > 0) {
      html += `<div class="section" id="ss-section"><div class="section-header"><h2>Semantic Scholar (${semanticScholarAnalysis.length} papers)</h2>
        <button class="collapse-btn" onclick="toggleSection('ss-cards')">Toggle</button></div>
        <div class="collapsible-content" id="ss-cards">`;
      for (const paper of semanticScholarAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(paper.title || '')} ${this.esc(paper.authors || '')}">
          <h4>${this.esc(paper.title || 'Untitled')}</h4>
          <div class="meta">
            <span class="badge badge-ss">SEMANTIC SCHOLAR</span>
            ${paper.citationCount ? `📚 ${paper.citationCount} citations` : ''}
            ${paper.year ? ` · ${paper.year}` : ''}
            ${paper.influenceCount ? ` · ⭐ ${paper.influenceCount} influential` : ''}
          </div>
          <div class="meta">${this.esc(paper.authors || 'Unknown authors')}</div>
          ${paper.abstract ? `<div class="text">${this.esc(paper.abstract.substring(0, 400))}${paper.abstract.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta"><a href="${this.esc(paper.url || '#')}" target="_blank">View paper →</a></div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── arXiv Section ──
    if (arxivAnalysis && arxivAnalysis.length > 0) {
      html += `<div class="section" id="arxiv-section"><div class="section-header"><h2>arXiv (${arxivAnalysis.length} papers)</h2>
        <button class="collapse-btn" onclick="toggleSection('arxiv-cards')">Toggle</button></div>
        <div class="collapsible-content" id="arxiv-cards">`;
      for (const paper of arxivAnalysis) {
        html += `
        <div class="post-card" data-searchable="${this.esc(paper.title || '')} ${this.esc((paper.authors || []).join(', '))}">
          <h4>${this.esc(paper.title || 'Untitled')}</h4>
          <div class="meta">
            <span class="badge badge-arxiv">ARXIV</span>
            ${paper.published ? `· ${paper.published.split('T')[0]}` : ''}
          </div>
          <div class="meta">${this.esc((paper.authors || []).join(', ') || 'Unknown authors')}</div>
          ${paper.categories && paper.categories.length > 0 ? `<div class="meta" style="margin-top:5px;">${paper.categories.slice(0, 5).map(c => '<span class="badge badge-arxiv" style="margin-right:3px;">' + this.esc(c) + '</span>').join('')}</div>` : ''}
          ${paper.summary ? `<div class="text">${this.esc(paper.summary.substring(0, 400))}${paper.summary.length > 400 ? '...' : ''}</div>` : ''}
          <div class="meta">
            <a href="${this.esc(paper.url || '#')}" target="_blank">View abstract →</a>
            ${paper.pdfUrl ? ` · <a href="${this.esc(paper.pdfUrl)}" target="_blank">PDF →</a>` : ''}
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // ── Footer ──
    html += `
    <div class="footer">
        <p>Generated by Research Toolkit · ${metadata.timestamp}</p>
        <p>Free &amp; Open Source · Zero API Keys Required</p>
    </div>

    <script>
    function toggleDark() {
        document.documentElement.classList.toggle('dark');
        document.body.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);
        document.getElementById('darkBtn').textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
    (function() {
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
            document.getElementById('darkBtn').textContent = 'Light Mode';
        }
    })();

    function toggleSection(id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('collapsed');
    }

    function expandAll() {
        document.querySelectorAll('.collapsible-content').forEach(el => el.classList.remove('collapsed'));
    }

    function collapseAll() {
        document.querySelectorAll('.collapsible-content').forEach(el => el.classList.add('collapsed'));
    }

    function filterCards(query) {
        const q = query.toLowerCase().trim();
        document.querySelectorAll('.post-card, .comment-card, .video-card, .cluster-card, .author-card').forEach(card => {
            if (!q) { card.style.display = ''; return; }
            const text = (card.getAttribute('data-searchable') || card.textContent).toLowerCase();
            card.style.display = text.includes(q) ? '' : 'none';
        });
    }

    ${SENTIMENT_WORDS_JS}
    function getSentimentText(text) {
        const lower = text.toLowerCase();
        let p=0,n=0,ne=0;
        for(const w of POSITIVE){if(lower.includes(w))p++;}
        for(const w of NEGATIVE){if(lower.includes(w))n++;}
        for(const w of NEUTRAL){if(lower.includes(w))ne++;}
        if(p>n&&p>ne)return'positive';if(n>p&&n>ne)return'negative';return'neutral';
    }
    </script>
</body>
</html>`;

    await fs.writeFile(outputPath, html, 'utf8');
    return outputPath;
  }

  sourceBar(label, count, cls) {
    const max = Math.max(50, count || 0);
    const pct = Math.min(Math.round((count / max) * 100), 100);
    return `<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div><div class="bar-value">${count}</div></div>`;
  }

  extractHostname(url) {
    if (!url) return '';
    try {
      return new URL(url).hostname;
    } catch {
      return url.split('/')[2] || url.substring(0, 40);
    }
  }

  esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = new PdfGenerator();
