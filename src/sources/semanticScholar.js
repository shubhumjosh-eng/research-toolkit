const https = require('https');
const http = require('http');

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';

function request(url, timeout = 10000, retries = 2) {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', async () => {
        if (res.statusCode === 429 && retries > 0) {
          const delay = Math.min(3000 * (3 - retries), 5000);
          await new Promise(r => setTimeout(r, delay));
          return request(url, timeout, retries - 1).then(resolve);
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ data: JSON.parse(body), status: res.statusCode, ms: Date.now() - start }); }
          catch { resolve({ data: null, status: res.statusCode, ms: Date.now() - start, error: 'Invalid JSON' }); }
        } else {
          resolve({ data: null, status: res.statusCode, ms: Date.now() - start, error: body.substring(0, 200) });
        }
      });
    });
    req.on('error', e => resolve({ data: null, status: 0, ms: Date.now() - start, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ data: null, status: 0, ms: Date.now() - start, error: 'timeout' }); });
  });
}

function buildQuery(query) {
  return encodeURIComponent(query.replace(/\s+/g, ' ').trim());
}

function formatResult(item) {
  return {
    title: item.title || '',
    authors: (item.authors || []).map(a => a.name).join(', '),
    year: item.year,
    citationCount: item.citationCount || 0,
    influenceCount: item.influentialCitationCount || 0,
    abstract: (item.abstract || '').substring(0, 500),
    url: item.url || '',
    paperId: item.paperId,
    source: 'semantic_scholar',
  };
}

async function searchSemanticScholar(query, options = {}) {
  const { maxResults = 20, yearRange } = options;
  const fields = 'title,authors,year,citationCount,influentialCitationCount,url,paperId,abstract';

  let url = `${BASE_URL}/paper/search?query=${buildQuery(query)}&limit=${maxResults}&fields=${fields}`;
  if (yearRange && yearRange.from && yearRange.to) {
    url += `&year=${yearRange.from}-${yearRange.to}`;
  } else if (yearRange && yearRange.from) {
    url += `&year=${yearRange.from}-`;
  } else if (yearRange && yearRange.to) {
    url += `&year=-${yearRange.to}`;
  }

  const res = await request(url);

  if (res.data && res.data.data) {
    const results = res.data.data.map(formatResult);
    return { results, total: res.data.total || results.length, ms: res.ms, source: 'semantic_scholar' };
  }

  if (res.status === 404) {
    return { results: [], total: 0, ms: res.ms, source: 'semantic_scholar', warning: 'No results found' };
  }

  return { results: [], total: 0, ms: res.ms, source: 'semantic_scholar', error: res.error || `HTTP ${res.status}` };
}

module.exports = { searchSemanticScholar, formatResult, request };
