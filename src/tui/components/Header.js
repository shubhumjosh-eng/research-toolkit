const React = require('react');
const { Box, Text } = require('ink');

function Header({ config }) {
  return React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
    React.createElement(Text, { bold: true, color: 'cyan' },
      '╭──────────────────────────────────────╮'
    ),
    React.createElement(Text, { bold: true, color: 'cyan' },
      '│  Research Toolkit v2.0               │'
    ),
    React.createElement(Text, { dimColor: true },
      '│  General-purpose deep research       │'
    ),
    React.createElement(Text, { dimColor: true },
      `│  Depth: ${String(config.depth || 500).padEnd(4)} | Report: ${(config.reportFormat || 'both').padEnd(14)}│`
    ),
    React.createElement(Text, { bold: true, color: 'cyan' },
      '╰──────────────────────────────────────╯'
    ),
  );
}

module.exports = Header;
