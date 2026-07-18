const React = require('react');
const { Box, Text } = require('ink');

function ResultsView({ results, logs, onNewTopic }) {
  if (!results) {
    return React.createElement(Text, { color: 'red' }, 'No results to display');
  }

  const meta = results.metadata || {};
  const reportFormat = require('../configStore').get('reportFormat');

  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Results ━━━━━━'),
    React.createElement(Box, { marginTop: 0, marginBottom: 1 },
      React.createElement(Text, null,
        ` 📊 ${(meta.redditPosts || 0)} posts · ${(meta.totalComments || 0)} comments · ${(meta.youtubeVideos || 0)} videos · ${(meta.newsArticles || 0)} news · ${(meta.webSearchResults || 0)} web`
      ),
    ),

    // Top Reddit posts
    results.reddit && results.reddit.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, ' 📌 Top Posts'),
      ...results.reddit
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map((post, i) =>
          React.createElement(Text, { key: i },
            ` ${i + 1}. "${(post.title || '').substring(0, 60)}" — r/${post.subreddit} (${post.score || 0} pts)`
          )
        ),
    ),

    // Top news
    results.news && results.news.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'blue' }, ' 📰 Top News'),
      ...results.news.slice(0, 3).map((article, i) =>
        React.createElement(Text, { key: i },
          ` ${i + 1}. ${(article.title || '').substring(0, 70)}`
        )
      ),
    ),

    // YouTube videos
    results.youtube && results.youtube.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'red' }, ' 📺 YouTube'),
      React.createElement(Text, null,
        ` ${results.youtube.length} videos found`
      ),
      ...results.youtube.slice(0, 3).map((video, i) =>
        React.createElement(Text, { key: i, dimColor: true },
          ` ${i + 1}. ${(video.title || '').substring(0, 65)}`
        )
      ),
    ),

    // Web results
    results.webSearch && results.webSearch.length > 0 && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'magenta' }, ' 🌐 Web Results'),
      ...results.webSearch.slice(0, 3).map((r, i) =>
        React.createElement(Text, { key: i },
          ` ${i + 1}. ${(r.title || '').substring(0, 60)}`
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
      React.createElement(Text, { dimColor: true }, 'Type a new topic or /config for settings'),
    ),
  );
}

module.exports = ResultsView;
