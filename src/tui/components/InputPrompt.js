const React = require('react');
const { useState, useEffect } = React;
const { Box, Text, useInput } = require('ink');

function InputPrompt({ onSubmit, onConfig, history, historyIndex, setHistoryIndex }) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return && value.trim()) {
      if (value.trim() === '/config') {
        onConfig();
      } else if (value.trim() === '/clear') {
        onConfig && onConfig('clear');
      } else {
        onSubmit(value.trim());
      }
      setValue('');
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (key.upArrow) {
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setValue(history[newIndex]);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setValue(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setValue('');
      }
    } else if (key.ctrlC || key.escape) {
      // handled by parent
    } else if (input && !key.ctrl && !key.meta) {
      setValue(prev => prev + input);
    }
  });

  const isCommand = value.startsWith('/');

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Box,
      React.createElement(Text, { bold: true, color: 'green' }, '> '),
      React.createElement(Text, { color: isCommand ? 'yellow' : 'white' }, value),
      React.createElement(Text, { backgroundColor: 'white', color: 'black' }, ' '),
    ),
    React.createElement(Box, { marginTop: 0 },
      React.createElement(Text, { dimColor: true },
        history.length > 0 ? '↑↓ history | ' : ''
      ),
      React.createElement(Text, { dimColor: true },
        'type topic, /config settings, /clear cache, Ctrl+C exit'
      ),
    ),
  );
}

module.exports = InputPrompt;
