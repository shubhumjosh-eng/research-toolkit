const React = require('react');
const { useState, useMemo } = React;
const { Box, Text, useInput } = require('ink');

const COMMANDS = [
  { name: '/config', description: 'Open settings', icon: '⚙' },
  { name: '/history', description: 'View past research sessions', icon: '📋' },
  { name: '/clear', description: 'Clear cache and sessions', icon: '🗑' },
  { name: '/help', description: 'Show all commands', icon: '❓' },
  { name: '/deep', description: 'Deep search mode (5-10 min)', icon: '🔬' },
  { name: '/sources', description: 'Show active data sources', icon: '📡' },
];

function CommandPalette({ onSelect, onClose }) {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!filter) return COMMANDS;
    const lower = filter.toLowerCase();
    return COMMANDS.filter(c =>
      c.name.includes(lower) || c.description.toLowerCase().includes(lower)
    );
  }, [filter]);

  useInput((input, key) => {
    if (key.escape || key.ctrlC) {
      onClose();
    } else if (key.return) {
      if (filtered.length > 0 && selectedIndex < filtered.length) {
        onSelect(filtered[selectedIndex].name);
      }
    } else if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filtered.length - 1, prev + 1));
    } else if (key.backspace || key.delete) {
      setFilter(prev => prev.slice(0, -1));
      setSelectedIndex(0);
    } else if (input && !key.ctrl && !key.meta) {
      setFilter(prev => prev + input);
      setSelectedIndex(0);
    }
  });

  if (filtered.length === 0) {
    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'yellow' }, `No commands matching "/${filter}"`),
      React.createElement(Text, { dimColor: true }, 'Press Escape to close'),
    );
  }

  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    React.createElement(Text, { bold: true, color: 'cyan' }, ' Commands'),
    React.createElement(Text, { dimColor: true }, ` Type to filter... ${filtered.length} shown`),
    React.createElement(Box, { marginTop: 1 },
      ...filtered.map((cmd, i) =>
        React.createElement(Box, { key: cmd.name, flexDirection: 'row' },
          React.createElement(Text, {
            inverse: i === selectedIndex,
            color: i === selectedIndex ? 'cyan' : 'white',
            bold: i === selectedIndex,
          }, ` ${i === selectedIndex ? '▸' : ' '} ${cmd.icon} ${cmd.name}`),
          React.createElement(Text, {
            dimColor: i !== selectedIndex,
            color: i === selectedIndex ? 'cyan' : undefined,
          }, `  ${cmd.description}`),
        )
      ),
    ),
    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { dimColor: true }, ' ↑↓ navigate  Enter select  Esc close'),
    ),
  );
}

module.exports = CommandPalette;
module.exports.COMMANDS = COMMANDS;
