const React = require('react');
const { Box, Text } = require('ink');
const pkg = require('../../../package.json');

function Header({ config, session }) {
  const reportFormat = config?.reportFormat || 'both';
  const depth = config?.depth || 500;
  const sessionInfo = session ? `Session: ${session.id}` : 'New session';

  return React.createElement(Box, { flexDirection: 'column', marginBottom: 1, borderStyle: 'round', borderColor: 'cyan', padding: 1 },
    React.createElement(Text, { bold: true, color: 'cyan' }, ` Research Toolkit v${pkg.version}`),
    React.createElement(Text, { dimColor: true }, ' Deep research across 10 platforms — no API keys needed'),
    React.createElement(Text, null,
      ` Depth: ${depth} | Report: ${reportFormat} | ${sessionInfo}`
    ),
  );
}

module.exports = Header;
