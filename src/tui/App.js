const React = require('react');
const { useState, useCallback, useEffect, useRef } = React;
const { Box, Text, useInput, useApp } = require('ink');
const Header = require('./components/Header');
const InputPrompt = require('./components/InputPrompt');
const ProgressView = require('./components/ProgressView');
const ResultsView = require('./components/ResultsView');
const LogPanel = require('./components/LogPanel');
const ConfigMenu = require('./components/ConfigMenu');
const orchestrator = require('../research/orchestrator');
const configStore = require('./configStore');

const STATES = { IDLE: 'idle', RESEARCHING: 'researching', RESULTS: 'results', CONFIG: 'config' };

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    if (this.state.error) {
      return React.createElement(Box, { flexDirection: 'column', padding: 1 },
        React.createElement(Text, { color: 'red', bold: true }, '✕ Error: ' + this.state.error.message),
        React.createElement(Text, { dimColor: true }, 'Returning to prompt...'),
      );
    }
    return this.props.children;
  }
}

function App({ initialTopic }) {
  const [state, setState] = useState(STATES.IDLE);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [config, setConfig] = useState(configStore.load());
  const { exit } = useApp();
  const runningRef = useRef(false);
  const initialDone = useRef(false);

  const addLog = useCallback((level, msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-99), { time, level, msg }]);
  }, []);

  const handleProgress = useCallback((p) => {
    setProgress(prev => ({ ...prev, [p.step]: p }));
  }, []);

  const handleResearch = useCallback(async (topic) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState(STATES.RESEARCHING);
    setLogs([]);
    setProgress({});
    setResults(null);
    setHistory(prev => [topic, ...prev.filter(t => t !== topic)].slice(0, config.historySize || 20));
    setHistoryIndex(-1);

    try {
      const result = await orchestrator.run(topic, {
        depth: config.depth || 500,
        onLog: addLog,
        onProgress: handleProgress,
      });
      setResults(result);
      setState(STATES.RESULTS);
    } catch (error) {
      addLog('error', `Research failed: ${error.message}`);
      setState(STATES.IDLE);
    } finally {
      runningRef.current = false;
    }
  }, [config, addLog, handleProgress]);

  const handleConfigSave = useCallback((key, value) => {
    configStore.set(key, value);
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCommand = useCallback((cmd) => {
    if (cmd === 'clear') {
      const cache = require('../utils/cache');
      cache.clear().then(() => addLog('success', 'Cache cleared'));
    }
  }, [addLog]);

  useInput((input, key) => {
    if (key.ctrlC || key.escape) {
      if (state === STATES.RESEARCHING) {
        addLog('warn', 'Research cancelled by user');
        runningRef.current = false;
        setState(STATES.IDLE);
      } else {
        exit();
      }
    }
  });

  useEffect(() => {
    if (initialTopic && !initialDone.current) {
      initialDone.current = true;
      handleResearch(initialTopic);
    }
  }, []);

  if (state === STATES.CONFIG) {
    return React.createElement(ErrorBoundary, { onError: () => setState(STATES.IDLE) },
      React.createElement(ConfigMenu, {
        config,
        onSave: handleConfigSave,
        onBack: () => setState(STATES.IDLE),
      })
    );
  }

  return React.createElement(ErrorBoundary, { onError: () => setState(STATES.IDLE) },
    React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Header, { config }),

      state === STATES.IDLE && React.createElement(InputPrompt, {
        onSubmit: handleResearch,
        onConfig: (cmd) => {
          if (cmd === 'clear') handleCommand('clear');
          else setState(STATES.CONFIG);
        },
        history,
        historyIndex,
        setHistoryIndex,
      }),

      state === STATES.RESEARCHING && React.createElement(Box, { flexDirection: 'column' },
        React.createElement(ProgressView, { progress }),
        React.createElement(LogPanel, { logs }),
      ),

      state === STATES.RESULTS && React.createElement(ResultsView, {
        results,
        logs,
        onNewTopic: () => setState(STATES.IDLE),
      }),
    )
  );
}

module.exports = App;
