const React = require('react');
const { Box, Text } = require('ink');

const STEP_ORDER = ['discover', 'news', 'web', 'reddit', 'youtube', 'hackernews', 'bluesky', 'discourse', 'stackexchange', 'semanticScholar', 'arxiv', 'report'];
const STEP_ICONS = {
  discover: '🔍', news: '📰', web: '🌐', reddit: '🔴', youtube: '▶',
  hackernews: '🟠', bluesky: '🦋', discourse: '💬', stackexchange: '📚',
  semanticScholar: '🎓', arxiv: '📄', report: '📄',
};
const STEP_LABELS = {
  discover: 'Discovering',
  news: 'News',
  web: 'Web Search',
  reddit: 'Reddit',
  youtube: 'YouTube',
  hackernews: 'Hacker News',
  bluesky: 'Bluesky',
  discourse: 'Discourse',
  stackexchange: 'Stack Exchange',
  semanticScholar: 'Semantic Scholar',
  arxiv: 'arXiv',
  report: 'Report',
};

function ProgressView({ progress }) {
  const p = progress || {};
  const completed = STEP_ORDER.filter(k => p[k] && p[k].current >= p[k].target && p[k].target > 0).length;
  const pct = Math.round((completed / STEP_ORDER.length) * 100);
  const barWidth = 20;
  const filled = Math.round((pct / 100) * barWidth);

  return React.createElement(Box, { flexDirection: 'column' },
    React.createElement(Text, { bold: true, color: 'cyan' }, '━━━━━━ Progress ━━━━━━'),

    React.createElement(Box, { marginTop: 0, marginBottom: 1 },
      React.createElement(Text, null,
        ' ' + '█'.repeat(filled) + '░'.repeat(barWidth - filled) + ` ${pct}%`
      ),
    ),

    ...STEP_ORDER.map(step => {
      const data = p[step];
      const icon = STEP_ICONS[step] || '○';
      const label = STEP_LABELS[step] || step;

      let statusIcon, statusColor;
      if (!data) {
        statusIcon = '○';
        statusColor = 'gray';
      } else if (data.current >= data.target && data.target > 0) {
        statusIcon = '✓';
        statusColor = 'green';
      } else {
        statusIcon = '●';
        statusColor = 'yellow';
      }

      const detail = data ? (data.message || (data.current !== undefined ? `${data.current}/${data.target}` : '')) : '';

      return React.createElement(Box, { key: step, flexDirection: 'row' },
        React.createElement(Text, { color: statusColor, bold: true }, ` ${statusIcon} `),
        React.createElement(Text, null, `${icon} ${label}`),
        React.createElement(Text, { dimColor: true }, detail ? `  ${detail}` : ''),
      );
    }),
  );
}

module.exports = ProgressView;
