const React = require('react');
const { Box, Text } = require('ink');

function ResultsView({ results, logs, onNewTopic }) {
  if (!results) {
    return React.createElement(Text, { color: 'red' }, 'No results to display');
  }

  const meta = results.metadata || {};
  const analysis = results.analysis;

  const platformStatus = (name, count, icon) => {
    if (count === 0) return React.createElement(Text, { color: 'red' }, `  ✕ ${icon} ${name}: 0`);
    return React.createElement(Text, { color: 'green' }, `  ✓ ${icon} ${name}: ${count}`);
  };

  return React.createElement(Box, { flexDirection: 'column' },
    // Query analysis
    analysis && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Analysis ━━━━━━'),
      analysis.phrases.length > 0 && React.createElement(Text, null,
        ` Phrases: ${analysis.phrases.map(p => `"${p}"`).join(', ')}`
      ),
      React.createElement(Text, null,
        ` Keywords: ${analysis.keywords.slice(0, 6).join(', ')}${analysis.keywords.length > 6 ? '...' : ''}`
      ),
      React.createElement(Text, null,
        ` Intent: ${analysis.intent}`
      ),
    ),

    // Platform results
    React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Sources ━━━━━━'),
    React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      platformStatus('Reddit', meta.redditPosts || 0, '🔴'),
      platformStatus('YouTube', meta.youtubeVideos || 0, '▶'),
      platformStatus('News', meta.newsArticles || 0, '📰'),
      platformStatus('Web Search', meta.webSearchResults || 0, '🌐'),
      platformStatus('Hacker News', meta.hackernewsStories || 0, '🟠'),
      platformStatus('Bluesky', meta.blueskyPosts || 0, '🦋'),
      platformStatus('Discourse', meta.discoursePosts || 0, '💬'),
      platformStatus('Stack Exchange', meta.stackexchangeResults || 0, '📚'),
      React.createElement(Text, { dimColor: true },
        ` Total: ${meta.totalSources || 0} sources (${meta.uniqueSources || 0} unique)`
      ),
    ),

    // Top ranked results (cross-platform)
    results.ranked && results.ranked.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Top Findings ━━━━━━'),
      ...results.ranked.slice(0, 8).map((r, i) =>
        React.createElement(Box, { key: i, flexDirection: 'column' },
          React.createElement(Text, null,
            ` ${i + 1}. ${React.createElement(Text, { bold: true }, (r.title || '').substring(0, 55))}`
          ),
          React.createElement(Text, { dimColor: true },
            `    ${r.platform || '?'} · Score: ${r.relevanceScore || 0}${r.score ? ` · Upvotes: ${r.score}` : ''}${r.viewCount ? ` · Views: ${r.viewCount}` : ''}`
          ),
          r.snippet && React.createElement(Text, { dimColor: true },
            `    "${r.snippet.substring(0, 80)}${r.snippet.length > 80 ? '...' : ''}"`
          ),
        )
      ),
    ),

    // Clusters
    results.clusters && results.clusters.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Themes ━━━━━━'),
      ...results.clusters.slice(0, 5).map((c, i) =>
        React.createElement(Text, { key: i },
          ` ${i + 1}. ${c.name} (${c.count} results)`
        )
      ),
    ),

    // Report path
    results.reportPath && React.createElement(Box, { marginTop: 0, marginBottom: 1 },
      React.createElement(Text, { color: 'green' }, ` 📄 Report: ${results.reportPath}`),
    ),

    React.createElement(Text, { dimColor: true }, ' ──────────────────'),
    React.createElement(Text, null,
      React.createElement(Text, { bold: true, color: 'cyan' }, ' > '),
      React.createElement(Text, { dimColor: true }, 'Type a new topic, / for commands, or ask a follow-up'),
    ),
  );
}

module.exports = ResultsView;
