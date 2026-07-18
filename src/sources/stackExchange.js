const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

const limiter = new RateLimiter(2);
const SE_BASE = 'https://api.stackexchange.com/2.3';

const TOPIC_TO_SITES = {
  programming: ['stackoverflow', 'devops', 'softwareengineering', 'codereview'],
  javascript: ['stackoverflow'],
  python: ['stackoverflow', 'datascience'],
  data: ['datascience', 'crossvalidated', 'stackoverflow'],
  math: ['mathoverflow', 'math', 'stats'],
  science: ['physics', 'biology', 'chemistry', 'earthscience', 'astronomy'],
  cooking: ['cooking'],
  fitness: ['fitness', 'quantifiedself'],
  travel: ['travel'],
  gaming: ['gaming', 'rpg', 'boardgames'],
  photography: ['photo', 'avp'],
  music: ['music', 'musicfans'],
  diy: ['diy', 'homeimprovement'],
  gardening: ['gardening'],
  parenting: ['parenting'],
  relationships: ['interpersonal'],
  finance: ['money', 'personalfinance', 'economics'],
  law: ['law', 'legaladvice'],
  philosophy: ['philosophy'],
  history: ['history', 'history.stackexchange'],
  writing: ['writing'],
  linguistics: ['linguistics', 'english'],
  education: ['academia', 'ell'],
  psychology: ['cognitivepsychology'],
  computer: ['superuser', 'askubuntu', 'unix', 'serverfault'],
  security: ['security', 'information-security'],
  ai: ['ai', 'datascience', 'stackoverflow'],
  web: ['stackoverflow', 'webmasters', 'ux'],
  database: ['dba', 'stackoverflow'],
  mobile: ['stackoverflow'],
  ux: ['ux', 'graphicdesign'],
  ubuntu: ['askubuntu'],
  linux: ['unix', 'askubuntu'],
  network: ['networkengineering', 'serverfault'],
  database_admin: ['dba'],
};

const SITE_CACHE = new Map();

class StackExchangeSource {
  constructor() {
    this.name = 'stackexchange';
    this.apiKey = process.env.STACKEXCHANGE_API_KEY || '';
  }

  async findRelevantSites(topic) {
    const lower = topic.toLowerCase();
    const matched = new Set();

    for (const [keywords, sites] of Object.entries(TOPIC_TO_SITES)) {
      if (lower.includes(keywords)) {
        sites.forEach(s => matched.add(s));
      }
    }

    if (matched.size === 0) {
      matched.add('stackoverflow');
      matched.add('superuser');
    }

    return [...matched].slice(0, 5);
  }

  async searchSite(site, query, options = {}) {
    const { maxResults = 15, onLog } = options;

    await limiter.wait();

    const params = {
      q: query,
      site,
      sort: 'relevance',
      order: 'desc',
      pagesize: Math.min(maxResults, 30),
    };
    if (this.apiKey) params.key = this.apiKey;

    try {
      const response = await axios.get(`${SE_BASE}/search/advanced`, {
        params,
        timeout: 15000,
      });

      if (response.data.backoff) {
        await new Promise(r => setTimeout(r, response.data.backoff * 1000));
      }

      const items = response.data.items || [];
      return items.map(item => ({
        id: `${site}-${item.question_id}`,
        title: item.title || '',
        text: item.body ? item.body.replace(/<[^>]*>/g, '').substring(0, 500) : '',
        url: item.link || `https://${site}.stackexchange.com/q/${item.question_id}`,
        author: item.owner?.display_name || '',
        authorRep: item.owner?.reputation || 0,
        score: item.score || 0,
        viewCount: item.view_count || 0,
        answerCount: item.answer_count || 0,
        isAnswered: item.is_answered || false,
        tags: item.tags || [],
        created: item.creation_date ? new Date(item.creation_date * 1000).toISOString() : '',
        source: 'stackexchange',
        sourceSite: site,
        topComments: [],
      }));
    } catch (error) {
      const status = error.response?.status;
      if (status === 429) {
        const onLog = options.onLog || (() => {});
        onLog('warn', `SE ${site} rate limited (429)`);
      }
      return [];
    }
  }

  async search(topic, options = {}) {
    const { maxResults = 25, onLog } = options;
    const log = onLog || (() => {});

    const sites = await this.findRelevantSites(topic);
    log('info', `Stack Exchange: searching ${sites.length} sites...`);

    const allResults = [];
    const perSite = Math.ceil(maxResults / sites.length);

    for (const site of sites) {
      if (allResults.length >= maxResults) break;
      try {
        const results = await this.searchSite(site, topic, {
          maxResults: perSite,
          onLog,
        });
        allResults.push(...results);
        if (results.length > 0) {
          log('success', `${site}.se: ${results.length} results`);
        }
      } catch {
        // Already handled
      }
    }

    log('success', `Stack Exchange: ${allResults.length} total results`);
    return allResults.slice(0, maxResults);
  }
}

module.exports = new StackExchangeSource();
