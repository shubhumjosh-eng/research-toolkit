const { sleep } = require('./helpers');

function isTransient(err) {
  if (!err) return false;
  if (err.code && ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(err.code)) return true;
  if (err.response && [500, 502, 503, 504].includes(err.response.status)) return true;
  return false;
}

class RateLimiter {
  constructor(requestsPerSecond = 2) {
    this.minDelay = 1000 / requestsPerSecond;
    this.lastRequest = 0;
    this.consecutive429s = 0;
    this.maxBackoffMs = 60000;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await sleep(this.minDelay - timeSinceLastRequest);
    }
    this.lastRequest = Date.now();
  }

  async backoff() {
    const base = this.minDelay * Math.pow(2, this.consecutive429s);
    const jitter = Math.random() * this.minDelay;
    const delay = Math.min(base + jitter, this.maxBackoffMs);
    this.consecutive429s++;
    console.log(`   Backing off ${Math.round(delay / 1000)}s (attempt ${this.consecutive429s})`);
    await sleep(delay);
  }

  reset() {
    this.consecutive429s = 0;
  }

  async retryRequest(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxRetries || (!isTransient(err) && !(err.response && err.response.status === 429))) {
          throw err;
        }
        if (err.response && err.response.status === 429) {
          await this.backoff();
        } else {
          const delay = 1000 * attempt + Math.random() * 1000;
          console.log(`   Transient error, retry ${attempt}/${maxRetries} in ${Math.round(delay / 1000)}s`);
          await sleep(delay);
        }
      }
    }
  }
}

module.exports = RateLimiter;
