const fs = require('fs').promises;

function toMarkdown(data) {
  const { executiveSummary, clusters, redditAnalysis, youtubeAnalysis, newsAnalysis, webSearchAnalysis, hackernewsAnalysis, blueskyAnalysis, discourseAnalysis, stackexchangeAnalysis, semanticScholarAnalysis, arxivAnalysis, metadata } = data;
  let md = '';

  md += `# Research Report: ${metadata.topic}\n\n`;
  md += `*Generated: ${metadata.timestamp} | Duration: ${metadata.duration || 'N/A'} | Sources: ${metadata.totalSources || 0}*\n`;
  if (metadata.template) md += `*Template: ${metadata.template}*\n`;
  if (metadata.dateRange) md += `*Date Range: ${metadata.dateRange}*\n`;
  if (metadata.diff) md += `*Diff: ${metadata.diff}*\n`;
  md += `\n---\n\n`;

  md += `## Summary Statistics\n\n`;
  md += `| Platform | Count |\n|----------|-------|\n`;
  md += `| Reddit Posts | ${metadata.redditPosts || 0} |\n`;
  md += `| YouTube Videos | ${metadata.youtubeVideos || 0} |\n`;
  md += `| News Articles | ${metadata.newsArticles || 0} |\n`;
  md += `| Web Results | ${metadata.webSearchResults || 0} |\n`;
  md += `| Hacker News | ${metadata.hackernewsStories || 0} |\n`;
  md += `| Bluesky Posts | ${metadata.blueskyPosts || 0} |\n`;
  md += `| Discourse Topics | ${metadata.discourseTopics || 0} |\n`;
  md += `| Stack Exchange | ${metadata.stackexchangeAnswers || 0} |\n`;
  md += `| Semantic Scholar | ${metadata.semanticScholarPapers || 0} |\n`;
  md += `| arXiv Papers | ${metadata.arxivPapers || 0} |\n`;
  md += `\n`;

  if (executiveSummary && executiveSummary.topPosts && executiveSummary.topPosts.length > 0) {
    md += `## Executive Summary\n\n`;
    md += `### Top Posts\n\n`;
    for (const post of executiveSummary.topPosts.slice(0, 10)) {
      md += `- **${post.title}** (⬆ ${post.score}, ${post.numComments || 0} comments) [${post.platform}](${post.url})\n`;
    }
    md += `\n`;
  }

  if (executiveSummary && executiveSummary.topComments && executiveSummary.topComments.length > 0) {
    md += `### Top Insights\n\n`;
    for (const c of executiveSummary.topComments.slice(0, 5)) {
      md += `- "${c.text}" — u/${c.author} (${c.platform}, ⬆ ${c.score})\n`;
    }
    md += `\n`;
  }

  if (clusters && clusters.length > 0) {
    md += `## Topic Clusters\n\n`;
    for (const c of clusters) {
      md += `### ${c.name} (${c.count} posts)\n\n`;
      for (const item of c.items.slice(0, 5)) {
        md += `- ${item.title.substring(0, 100)} (⬆ ${item.score})\n`;
      }
      md += `\n`;
    }
  }

  if (redditAnalysis && redditAnalysis.length > 0) {
    md += `## Reddit Analysis\n\n`;
    const sorted = [...redditAnalysis].sort((a, b) => b.score - a.score);
    for (const post of sorted.slice(0, 20)) {
      md += `### ${post.title}\n`;
      md += `**⬆ ${post.score}** | r/${post.subreddit} | ${post.numComments} comments | by ${post.author}\n\n`;
      if (post.text) md += `${post.text.substring(0, 300)}...\n\n`;
      md += `[View on Reddit](${post.url})\n\n`;
    }
  }

  if (newsAnalysis && newsAnalysis.length > 0) {
    md += `## News Articles\n\n`;
    for (const a of newsAnalysis.slice(0, 15)) {
      md += `- **${a.title}** (${a.source}) ${a.publishedAt || ''}\n`;
      if (a.description) md += `  ${a.description.substring(0, 200)}...\n`;
      md += `  [Read](${a.url})\n\n`;
    }
  }

  if (hackernewsAnalysis && hackernewsAnalysis.length > 0) {
    md += `## Hacker News\n\n`;
    for (const s of hackernewsAnalysis.slice(0, 15)) {
      md += `- **${s.title}** (⬆ ${s.score || 0}, 💬 ${s.numComments || 0})\n`;
      md += `  [Article](${s.url || s.sourceUrl || '#'}) | [HN Discussion](${s.sourceUrl || s.url || '#'})\n\n`;
    }
  }

  if (blueskyAnalysis && blueskyAnalysis.length > 0) {
    md += `## Bluesky\n\n`;
    for (const p of blueskyAnalysis.slice(0, 15)) {
      md += `- **${(p.text || '').substring(0, 200)}** (❤ ${p.likeCount || 0})\n`;
      md += `  by ${p.author || 'unknown'} | [View](${p.url || '#'})\n\n`;
    }
  }

  if (youtubeAnalysis && youtubeAnalysis.length > 0) {
    md += `## YouTube Videos\n\n`;
    for (const v of youtubeAnalysis.slice(0, 15)) {
      md += `- **${v.title}** by ${v.channelName || 'Unknown'} (${v.viewCount ? v.viewCount.toLocaleString() + ' views' : 'N/A'})\n`;
      md += `  [Watch](${v.url})\n\n`;
    }
  }

  if (webSearchAnalysis && webSearchAnalysis.length > 0) {
    md += `## Web Results\n\n`;
    for (const w of webSearchAnalysis.slice(0, 15)) {
      md += `- **${w.title}**\n`;
      if (w.description) md += `  ${w.description.substring(0, 200)}\n`;
      md += `  [Visit](${w.url})\n\n`;
    }
  }

  if (discourseAnalysis && discourseAnalysis.length > 0) {
    md += `## Discourse\n\n`;
    for (const d of discourseAnalysis.slice(0, 15)) {
      md += `- **${d.title}** (${(d.replyCount || 0) - 1} replies)\n`;
      if (d.text) md += `  ${d.text.substring(0, 200)}\n`;
      md += `  [View](${d.url})\n\n`;
    }
  }

  if (stackexchangeAnalysis && stackexchangeAnalysis.length > 0) {
    md += `## Stack Exchange\n\n`;
    for (const q of stackexchangeAnalysis.slice(0, 15)) {
      md += `- **${q.title}** (⬆ ${q.score || 0}, ${q.answerCount || 0} answers${q.isAnswered ? ', ✅ accepted' : ''})\n`;
      if (q.text) md += `  ${q.text.substring(0, 200)}\n`;
      md += `  [View](${q.url})\n\n`;
    }
  }

  if (semanticScholarAnalysis && semanticScholarAnalysis.length > 0) {
    md += `## Semantic Scholar Papers\n\n`;
    for (const p of semanticScholarAnalysis.slice(0, 15)) {
      md += `- **${p.title}** (${p.year || 'n/a'}) — ${p.citationCount || 0} citations\n`;
      md += `  ${p.authors || 'Unknown'}\n`;
      if (p.abstract) md += `  ${p.abstract.substring(0, 250)}...\n`;
      md += `  [View Paper](${p.url || '#'})\n\n`;
    }
  }

  if (arxivAnalysis && arxivAnalysis.length > 0) {
    md += `## arXiv Papers\n\n`;
    for (const p of arxivAnalysis.slice(0, 15)) {
      md += `- **${p.title}** (${(p.authors || []).join(', ') || 'Unknown'})\n`;
      if (p.summary) md += `  ${p.summary.substring(0, 250)}...\n`;
      md += `  [Abstract](${p.url || '#'})${p.pdfUrl ? ` | [PDF](${p.pdfUrl})` : ''}\n\n`;
    }
  }

  md += `---\n*Generated by Research Toolkit v3.1*\n`;
  return md;
}

function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

async function exportReport(data, format, outputPath) {
  const base = outputPath || `research-${data.metadata.topic.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}`;

  switch (format) {
    case 'markdown':
    case 'md': {
      const md = toMarkdown(data);
      const path = `${base}.md`;
      await fs.writeFile(path, md, 'utf8');
      return path;
    }
    case 'json': {
      const json = toJSON(data);
      const path = `${base}.json`;
      await fs.writeFile(path, json, 'utf8');
      return path;
    }
    case 'html':
    default: {
      const pdfGenerator = require('./reportGenerator');
      const path = `${base}.html`;
      await pdfGenerator.generateResearchReport(data, path);
      return path;
    }
  }
}

module.exports = { exportReport, toMarkdown, toJSON };
