const React = require('react');
const { useState, useEffect } = React;
const { Box, Text, useInput } = require('ink');

const QUICK_COMMANDS = [
  { name: '/config', desc: 'Settings' },
  { name: '/history', desc: 'Past sessions' },
  { name: '/clear', desc: 'Clear cache' },
  { name: '/sources', desc: 'Show sources' },
  { name: '/help', desc: 'Help' },
];

function InputPrompt({ onSubmit, onCommand, onOpenCommands, history, historyIndex, setHistoryIndex, hasResults }) {
  const [value, setValue] = useState('');
  const [showQuickCmds, setShowQuickCmds] = useState(false);
  const [selectedCmd, setSelectedCmd] = useState(0);

  useInput((input, key) => {
    if (key.return && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith('/')) {
        const cmd = QUICK_COMMANDS.find(c => c.name === trimmed);
        if (cmd) {
          onCommand(trimmed);
        } else if (onCommand) {
          onCommand(trimmed);
        }
      } else {
        onSubmit(trimmed);
      }
      setValue('');
      setShowQuickCmds(false);
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
      if (value.length <= 1) setShowQuickCmds(false);
    } else if (key.upArrow) {
      if (showQuickCmds) {
        setSelectedCmd(prev => Math.max(0, prev - 1));
      } else if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setValue(history[newIndex]);
      }
    } else if (key.downArrow) {
      if (showQuickCmds) {
        setSelectedCmd(prev => Math.min(QUICK_COMMANDS.length - 1, prev + 1));
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setValue(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setValue('');
      }
    } else if (key.tab) {
      if (showQuickCmds && QUICK_COMMANDS[selectedCmd]) {
        setValue(QUICK_COMMANDS[selectedCmd].name);
        setShowQuickCmds(false);
      } else if (value.startsWith('/')) {
        const match = QUICK_COMMANDS.find(c => c.name.startsWith(value));
        if (match) {
          setValue(match.name);
        }
      }
    } else if (key.ctrlC || key.escape) {
      // handled by parent
    } else if (input === '/' && value === '') {
      setValue('/');
      setShowQuickCmds(true);
      setSelectedCmd(0);
    } else if (input && !key.ctrl && !key.meta) {
      setValue(prev => prev + input);
      if (value.length === 0 && input === '/') {
        setShowQuickCmds(true);
      }
    }
  });

  const isCommand = value.startsWith('/');
  const filteredCmds = isCommand
    ? QUICK_COMMANDS.filter(c => c.name.includes(value.toLowerCase()))
    : QUICK_COMMANDS;

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Box,
      React.createElement(Text, { bold: true, color: 'green' }, '> '),
      React.createElement(Text, { color: isCommand ? 'yellow' : 'white' }, value),
      React.createElement(Text, { backgroundColor: 'white', color: 'black' }, ' '),
    ),

    showQuickCmds && filteredCmds.length > 0 && React.createElement(Box, { flexDirection: 'column', marginTop: 0, borderStyle: 'round', borderColor: 'cyan', padding: 0 },
      ...filteredCmds.map((cmd, i) =>
        React.createElement(Text, {
          key: cmd.name,
          color: i === selectedCmd ? 'cyan' : 'white',
          inverse: i === selectedCmd,
        }, ` ${i === selectedCmd ? '▸' : ' '} ${cmd.name}  ${cmd.desc}`)
      ),
    ),

    React.createElement(Box, { marginTop: 0 },
      React.createElement(Text, { dimColor: true },
        history.length > 0 ? '↑↓ history | ' : ''
      ),
      React.createElement(Text, { dimColor: true },
        hasResults
          ? 'ask follow-up, / commands, Ctrl+C exit'
          : 'type topic, / commands, Ctrl+C exit'
      ),
    ),
  );
}

module.exports = InputPrompt;
