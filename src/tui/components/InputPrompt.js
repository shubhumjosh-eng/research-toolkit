const React = require('react');
const { useState } = React;
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
  const mountedRef = React.useRef(true);
  const valueRef = React.useRef('');
  const showQuickCmdsRef = React.useRef(false);
  const selectedCmdRef = React.useRef(0);
  const historyIndexRef = React.useRef(historyIndex);

  React.useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const updateState = (setter, val, ref) => {
    if (ref) ref.current = val;
    if (mountedRef.current) setter(val);
  };

  useInput((input, key) => {
    const curValue = valueRef.current;
    const curShow = showQuickCmdsRef.current;
    const curSelected = selectedCmdRef.current;

    if (key.return && curValue.trim()) {
      const trimmed = curValue.trim();
      if (trimmed.startsWith('/')) {
        if (onCommand) onCommand(trimmed);
      } else {
        onSubmit(trimmed);
      }
      if (mountedRef.current) {
        setValue('');
        valueRef.current = '';
        setShowQuickCmds(false);
        showQuickCmdsRef.current = false;
      }
    } else if (key.backspace || key.delete) {
      const next = curValue.slice(0, -1);
      updateState(setValue, next, valueRef);
      if (next.length === 0) updateState(setShowQuickCmds, false, showQuickCmdsRef);
    } else if (key.upArrow) {
      if (curShow) {
        const next = Math.max(0, curSelected - 1);
        updateState(setSelectedCmd, next, selectedCmdRef);
      } else if (history.length > 0) {
        const next = Math.min(historyIndexRef.current + 1, history.length - 1);
        historyIndexRef.current = next;
        setHistoryIndex(next);
        updateState(setValue, history[next], valueRef);
      }
    } else if (key.downArrow) {
      if (curShow) {
        const next = Math.min(QUICK_COMMANDS.length - 1, curSelected + 1);
        updateState(setSelectedCmd, next, selectedCmdRef);
      } else if (historyIndexRef.current > 0) {
        const next = historyIndexRef.current - 1;
        historyIndexRef.current = next;
        setHistoryIndex(next);
        updateState(setValue, history[next], valueRef);
      } else {
        historyIndexRef.current = -1;
        setHistoryIndex(-1);
        updateState(setValue, '', valueRef);
      }
    } else if (key.tab) {
      if (curShow && QUICK_COMMANDS[curSelected]) {
        updateState(setValue, QUICK_COMMANDS[curSelected].name, valueRef);
        updateState(setShowQuickCmds, false, showQuickCmdsRef);
      } else if (curValue.startsWith('/')) {
        const match = QUICK_COMMANDS.find(c => c.name.startsWith(curValue));
        if (match) updateState(setValue, match.name, valueRef);
      }
    } else if (key.ctrlC || key.escape) {
      // handled by parent
    } else if (input && !key.ctrl && !key.meta) {
      const next = curValue + input;
      updateState(setValue, next, valueRef);
      if (curValue.length === 0 && input === '/') {
        updateState(setShowQuickCmds, true, showQuickCmdsRef);
        updateState(setSelectedCmd, 0, selectedCmdRef);
      }
    }
  });

  const isCommand = value.startsWith('/');
  const filteredCmds = isCommand
    ? QUICK_COMMANDS.filter(c => c.name.includes(value.toLowerCase()))
    : QUICK_COMMANDS;

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Box, {},
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
