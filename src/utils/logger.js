const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.research-toolkit', 'logs');

let masterStream = null;

function ensureDirSync(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

function ensureMasterLog() {
  if (masterStream) return;
  ensureDirSync(LOG_DIR);
  const masterLog = path.join(LOG_DIR, 'latest.log');
  masterStream = fs.createWriteStream(masterLog, { flags: 'a' });
}

class Logger {
  constructor() {
    this.stream = null;
    this.sessionFile = null;
  }

  startSession(topic) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const safeTopic = (topic || 'unknown').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    this.sessionFile = path.join(LOG_DIR, `${ts}_${safeTopic}.log`);
    ensureDirSync(LOG_DIR);
    this.stream = fs.createWriteStream(this.sessionFile, { flags: 'a' });
    this.write('info', `=== Session started: ${topic} ===`);
    this.write('info', `Time: ${new Date().toISOString()}`);
    return this.sessionFile;
  }

  write(level, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${(level || 'info').toUpperCase().padEnd(7)}] ${msg || ''}\n`;
    if (this.stream) {
      this.stream.write(line);
    }
    ensureMasterLog();
    if (masterStream) {
      masterStream.write(line);
    }
  }

  endSession() {
    if (this.stream) {
      this.write('info', '=== Session ended ===');
      this.stream.end();
      this.stream = null;
    }
  }

  getLogFile() {
    return this.sessionFile;
  }
}

module.exports = new Logger();
