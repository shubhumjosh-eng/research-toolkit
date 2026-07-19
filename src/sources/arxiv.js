const https = require('https');

const BASE_URL = 'https://export.arxiv.org/api/query';

function request(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, { timeout }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        resolve({ body, status: res.statusCode, ms: Date.now() - start });
      });
    });
    req.on('error', e => resolve({ body: '', status: 0, ms: Date.now() - start, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ body: '', status: 0, ms: Date.now() - start, error: 'timeout' }); });
  });
}

function buildQuery(query) {
  return query.replace(/\s+/g, ' ').trim();
}

function parseXmlEntries(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const get = (tag) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].trim() : '';
    };
    const getAttr = (tag, attr) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`));
      return m ? m[1] : '';
    };

    const authors = [];
    const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    const categories = [];
    const catRegex = /<category[^>]*term="([^"]*)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    const published = get('published');
    const updated = get('updated');
    const summary = get('summary').replace(/\s+/g, ' ').trim();

    entries.push({
      title: get('title').replace(/\s+/g, ' ').trim(),
      authors,
      summary: summary.substring(0, 500),
      published: published || undefined,
      updated: updated || undefined,
      arxivId: getAttr('id', 'term') || get('id'),
      url: get('id'),
      categories,
      pdfUrl: get('link[title="pdf"]') || '',
      source: 'arxiv',
    });
  }
  return entries;
}

async function searchArxiv(query, options = {}) {
  const { maxResults = 20, start = 0 } = options;
  const q = buildQuery(query);
  const url = `${BASE_URL}?search_query=all:${encodeURIComponent(q)}&start=${start}&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

  const res = await request(url);

  if (res.status !== 200) {
    return { results: [], total: 0, ms: res.ms, source: 'arxiv', error: res.error || `HTTP ${res.status}` };
  }

  const totalMatch = res.body.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
  const total = totalMatch ? parseInt(totalMatch[1]) : 0;

  const results = parseXmlEntries(res.body);

  return { results, total, ms: res.ms, source: 'arxiv' };
}

module.exports = { searchArxiv, parseXmlEntries, request };
