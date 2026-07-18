const React = require('react');
const { Box, Text } = require('ink');

const STEP_ORDER = ['discover', 'news', 'web', 'reddit', 'youtube', 'report'];
const STEP_LABELS = {
  discover: 'Discover subreddits',
  news: 'News articles',
  web: 'Web search',
  reddit: 'Reddit scraping',
  youtube: 'YouTube discovery',
  report: 'Report generation',
};

function ProgressView({ progress }) {
  const steps = STEP_ORDER.map(key => {
    const p = progress[key];
    const label = STEP_LABELS[key];
    let icon, color;

    if (!p) {
      icon = '○';
      color = 'gray';
    } else if (p.current >= p.target && p.target > 0) {
      icon = '✓';
      color = 'green';
    } else {
      icon = '●';
      color = 'yellow';
    }

    const detail = p ? (p.message || `${p.current}/${p.target}`) : 'pending';

    return React.createElement(Box, { key, paddingLeft: 2 },
      React.createElement(Text, { color }, icon + ' '),
      React.createElement(Text, { bold: true }, label.padEnd(22)),
      React.createElement(Text, { dimColor: true }, detail),
    );
  });

  const completed = STEP_ORDER.filter(k => {
    const p = progress[k];
    return p && p.current >= p.target && p.target > 0;
  }).length;
  const pct = Math.round((completed / STEP_ORDER.length) * 100);

  return React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
    React.createElement(Text, { bold: true },
      '  Researching...'
    ),
    React.createElement(Box, { paddingLeft: 2, marginBottom: 0 },
      React.createElement(Text, { color: 'cyan' },
        '[' + '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5)) + '] ' + pct + '%'
      ),
    ),
    ...steps,
  );
}

module.exports = ProgressView;
