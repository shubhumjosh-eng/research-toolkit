const React = require('react');
const { useState, useCallback, useEffect, useRef } = React;
const { Box, Text, useInput, useApp } = require('ink');
const Header = require('./components/Header');
const InputPrompt = require('./components/InputPrompt');
const ProgressView = require('./components/ProgressView');
const ResultsView = require('./components/ResultsView');
const LogPanel = require('./components/LogPanel');
const ConfigMenu = require('./components/ConfigMenu');
const CommandPalette = require('./components/CommandPalette');
const orchestrator = require('../research/orchestrator');
const configStore = require('./configStore');
const sessionStore = require('./sessionStore');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const STATES = { IDLE: 'idle', RESEARCHING: 'researching', RESULTS: 'results', CONFIG: 'config', COMMANDS: 'commands' };

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
        React.createElement(Text, { color: 'red', bold: true }, 'Error: ' + this.state.error.message),
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
  const [session, setSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [commandOutput, setCommandOutput] = useState([]);
  const { exit } = useApp();
  const runningRef = useRef(false);
  const initialDone = useRef(false);
  const abortRef = useRef(null);

  useEffect(() => {
    sessionStore.listRecent(10).then(recent => setSessionHistory(recent));
  }, []);

  const addLog = useCallback((level, msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-149), { time, level, msg }]);
    logger.write(level, msg);
  }, []);

  const handleProgress = useCallback((p) => {
    setProgress(prev => ({ ...prev, [p.step]: p }));
  }, []);

  const handleResearch = useCallback(async (topic) => {
    if (runningRef.current) {
      runningRef.current = false;
      if (abortRef.current) abortRef.current();
      await new Promise(r => setTimeout(r, 100));
    }
    runningRef.current = true;
    abortRef.current = () => { runningRef.current = false; };
    setState(STATES.RESEARCHING);
    setLogs([]);
    setProgress({});
    setResults(null);
    setCommandOutput([]);
    setHistory(prev => [topic, ...prev.filter(t => t !== topic)].slice(0, config.historySize || 20));
    setHistoryIndex(-1);

    const newSession = sessionStore.create(topic);
    setSession(newSession);

    try {
      const result = await orchestrator.run(topic, {
        depth: config.depth || 500,
        onLog: addLog,
        onProgress: handleProgress,
      });

      sessionStore.updateResults(newSession.id, result, result.reportPath);
      sessionStore.addQuery(newSession.id, { original: topic, resultCount: Object.values(result).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) });

      setResults(result);
      setState(STATES.RESULTS);

      const updated = await sessionStore.listRecent(10);
      setSessionHistory(updated);
    } catch (error) {
      addLog('error', `Research failed: ${error.message}`);
      setState(STATES.IDLE);
    } finally {
      runningRef.current = false;
    }
  }, [config, addLog, handleProgress]);

  const handleFollowUp = useCallback(async (question) => {
    if (!results || runningRef.current) return;
    const contextTopic = `${results.topic} ${question}`;
    await handleResearch(contextTopic);
  }, [results, handleResearch]);

  const handleCommand = useCallback((cmd) => {
    const output = [];
    const cmdLog = (level, msg) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      output.push({ time, level, msg });
    };

    setCommandOutput([]);

    switch (cmd) {
      case '/config':
        setState(STATES.CONFIG);
        return;
      case '/clear':
        cache.clear().then(() => sessionStore.clearAll().then(() => {
          sessionStore.listRecent(10).then(h => setSessionHistory(h));
          cmdLog('success', 'Cache and sessions cleared');
          setCommandOutput(output);
          setState(STATES.IDLE);
        }));
        return;
      case '/history':
        cmdLog('info', `Recent sessions (${sessionHistory.length}):`);
        sessionHistory.forEach(s => {
          cmdLog('info', `  ${s.topic} — ${s.queryCount} queries — ${s.startedAt?.split('T')[0] || '?'}`);
        });
        break;
      case '/help':
        cmdLog('info', 'Commands:');
        cmdLog('info', '  /config   — Settings');
        cmdLog('info', '  /history  — Past sessions');
        cmdLog('info', '  /clear    — Clear cache & sessions');
        cmdLog('info', '  /sources  — Show platform sources');
        cmdLog('info', '  /help     — This help');
        cmdLog('info', '');
        cmdLog('info', 'Type any topic to research.');
        cmdLog('info', 'After results, type a follow-up question.');
        break;
      case '/deep':
        cmdLog('info', 'Deep search mode: depth set to 1000');
        setConfig(prev => ({ ...prev, depth: 1000 }));
        break;
      case '/sources':
        cmdLog('info', 'Platforms:');
        cmdLog('info', '  [1] Reddit  [2] YouTube  [3] News  [4] Web Search');
        cmdLog('info', '  [5] HN      [6] Bluesky  [7] Discourse  [8] Stack Exchange');
        cmdLog('info', '  [S] Semantic Scholar  [A] arXiv');
        cmdLog('info', `  Active: ${Object.entries(config.sources || {}).filter(([,v]) => v !== false).map(([k]) => k).join(', ') || 'all'}`);
        break;
      default:
        cmdLog('warn', `Unknown command: ${cmd}`);
    }
    setCommandOutput(output);
    setState(STATES.IDLE);
  }, [addLog, sessionHistory, config]);

  const handleConfigSave = useCallback((key, value) => {
    configStore.set(key, value);
    setConfig(prev => ({ ...prev, [key]: value }));
    logger.write('info', `Setting saved: ${key} = ${value}`);
  }, []);

  useInput((input, key) => {
    if (key.ctrlC || key.escape) {
      if (state === STATES.RESEARCHING) {
        addLog('warn', 'Research cancelled by user');
        runningRef.current = false;
        setState(STATES.IDLE);
      } else if (state === STATES.CONFIG || state === STATES.COMMANDS) {
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

  if (state === STATES.COMMANDS) {
    return React.createElement(ErrorBoundary, { onError: () => setState(STATES.IDLE) },
      React.createElement(CommandPalette, {
        onSelect: (cmd) => {
          setState(STATES.IDLE);
          handleCommand(cmd);
        },
        onClose: () => setState(STATES.IDLE),
      })
    );
  }

  const resultCount = results ? Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;

  return React.createElement(ErrorBoundary, { onError: () => setState(STATES.IDLE) },
    React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Header, { config, session }),

      (state === STATES.IDLE || state === STATES.RESULTS) && React.createElement(InputPrompt, {
        onSubmit: results ? handleFollowUp : handleResearch,
        onCommand: handleCommand,
        onOpenCommands: () => setState(STATES.COMMANDS),
        history,
        historyIndex,
        setHistoryIndex,
        hasResults: !!results,
      }),

      state === STATES.RESEARCHING && React.createElement(Box, { flexDirection: 'column' },
        React.createElement(ProgressView, { progress }),
        React.createElement(LogPanel, { logs }),
      ),

      state === STATES.RESULTS && React.createElement(ResultsView, {
        results,
        logs,
        resultCount,
        onNewTopic: () => setState(STATES.IDLE),
      }),

      commandOutput.length > 0 && React.createElement(Box, { flexDirection: 'column', marginTop: 0, borderStyle: 'round', borderColor: 'gray', paddingX: 1 },
        ...commandOutput.map((log, i) =>
          React.createElement(Box, { key: i },
            React.createElement(Text, { dimColor: true }, `[${log.time}] `),
            React.createElement(Text, { color: log.level === 'warn' ? 'yellow' : log.level === 'error' ? 'red' : log.level === 'success' ? 'green' : undefined },
              (log.level === 'success' ? '✓ ' : log.level === 'warn' ? '⚠ ' : log.level === 'error' ? '✕ ' : '  ') + log.msg
            ),
          )
        ),
      ),
    )
  );
}

module.exports = App;
