const React = require('react');
const { Box, Text } = require('ink');

const LOG_COLORS = {
  info: undefined,
  success: 'green',
  warn: 'yellow',
  error: 'red',
  debug: 'gray',
};

const LOG_ICONS = {
  info: '  ',
  success: '✓',
  warn: '⚠',
  error: '✕',
  debug: '·',
};

const MAX_VISIBLE = 12;

function LogPanel({ logs }) {
  const visible = logs.slice(-MAX_VISIBLE);
  const overflow = logs.length - MAX_VISIBLE;

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1, borderStyle: 'round', borderColor: 'gray', paddingX: 1 },
    React.createElement(Text, { bold: true, color: 'gray' }, 'Live Log' + (logs.length > MAX_VISIBLE ? ` (${logs.length} entries)` : '')),
    overflow > 0 && React.createElement(Text, { dimColor: true }, `  ... ${overflow} earlier entries`),
    ...visible.map((log, i) =>
      React.createElement(Box, { key: i },
        React.createElement(Text, { dimColor: true }, `[${log.time}] `),
        React.createElement(Text, { color: LOG_COLORS[log.level] }, (LOG_ICONS[log.level] || '  ') + ' '),
        React.createElement(Text, { color: LOG_COLORS[log.level] }, log.msg),
      )
    ),
  );
}

module.exports = LogPanel;
