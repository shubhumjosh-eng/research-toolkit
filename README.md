<p align="center">
  <h1 align="center">Research Toolkit</h1>
  <p align="center">
    <strong>Deep research assistant for the terminal</strong><br>
    Search 10 platforms simultaneously — no API keys, no subscriptions, no BS.
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL%201.1-blue.svg" alt="License"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/version-3.1.0-green.svg" alt="Version"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="#platforms"><img src="https://img.shields.io/badge/platforms-10-orange.svg" alt="Platforms"></a>
  <a href="#smart-features"><img src="https://img.shields.io/badge/AI-free-yes-brightgreen.svg" alt="AI-free"></a>
  <a href="#export-formats"><img src="https://img.shields.io/badge/export-html%20%7C%20md%20%7C%20json-blue.svg" alt="Export"></a>
</p>

---

Tired of searching Reddit, YouTube, Google, Hacker News, arXiv, and a dozen browser tabs for every research topic? Research Toolkit searches **10 platforms at once** and gives you a ranked, clustered, deduplicated report — in one command.

```bash
npx research-toolkit "quantum computing advances"
```

![Research Toolkit Demo](demo.gif)

---

## Features at a Glance

- **10 platforms, one command** — Reddit, YouTube, News, Web, HN, Bluesky, Discourse, Stack Exchange, Semantic Scholar, arXiv
- **Smart query understanding** — phrase detection, TF-IDF ranking, automatic query expansion
- **Parallel fetching** — all 10 sources searched simultaneously (~8s at depth 100)
- **Academic sources** — Semantic Scholar papers + arXiv preprints with citation counts
- **Export anywhere** — HTML (interactive), Markdown, JSON
- **Zero API keys** — everything works without accounts (optional keys for higher limits)
- **Persistent sessions** — pick up where you left off, ask follow-up questions

---

## Why Not Just Use...?

| | Research Toolkit | Perplexity AI | Google Scholar | Elicit | Manual Searching |
|---|---|---|---|---|---|
| **Cost** | Free forever | $20/mo Pro | Free | $10/mo+ | Free |
| **Platforms** | 10 (Reddit, YouTube, HN, arXiv, ...) | Web only | Papers only | Papers only | 1 tab = 1 platform |
| **Academic papers** | Semantic Scholar + arXiv | Sometimes | Yes | Yes | Manual |
| **Social discussion** | Reddit, HN, Bluesky, Discourse | No | No | No | Separate tabs |
| **Video sources** | YouTube (yt-dlp) | No | No | No | Separate tabs |
| **Export formats** | HTML, Markdown, JSON | Web only | BibTeX | CSV | Copy-paste |
| **Rate limits** | Respectful (with fallbacks) | N/A | Aggressive | N/A | N/A |
| **Offline capable** | Reports are local files | No | No | No | N/A |
| **No account needed** | Yes | No | No | No | Yes |

---

## Quick Start

```bash
git clone https://github.com/shubhumjosh-eng/research-toolkit.git
cd research-toolkit
npm install
node src/cli.js "your topic here"
```

Open the generated HTML report in your browser. Done.

### Global Install (Optional)

```bash
npm link
research "quantum computing advances"
```

---

## Usage

### Direct Research (Default)

```bash
node src/cli.js "best mechanical keyboards for programming"
```

### Interactive TUI

```bash
node src/cli.js
```

Opens a full-screen terminal interface with real-time progress, slash commands, and follow-up questions.

### Batch Mode (Scripting)

```bash
node src/cli.js --batch "climate policy" --depth 1000
```

### Export Formats

```bash
# HTML (default, interactive with dark mode, search, collapse)
node src/cli.js "topic"

# Markdown (for READMEs, notes, documentation)
node src/cli.js "topic" --format markdown

# JSON (for programmatic processing)
node src/cli.js "topic" --format json
```

### Date Filtering

```bash
# Last 30 days only
node src/cli.js "AI safety" --since 30d

# Specific date range
node src/cli.js "COVID vaccine" --since 2025-01-01 --until 2025-12-31
```

### Slash Commands (TUI Mode)

| Command | Description |
|---------|-------------|
| `Tab` | Open command palette |
| `/config` | Adjust depth, report format |
| `/sources` | Toggle platforms on/off |
| `/history` | View past research sessions |
| `/deep` | Switch to deep search mode |
| `/clear` | Clear the screen |
| `/help` | Show all commands |

---

## Example Output

```
$ node src/cli.js "attention is all you need"

   Research: "attention is all you need" (depth: 500)
   Phrases: [] | Keywords: [attention]
   Intent: general | Expanded: 6 queries

   Discovering relevant subreddits...        ✓ Found 2 subreddits
   Searching all platforms in parallel...
   ✓  Found 50 news articles
   ✓  Found 50 web results
   ✓  Stack Exchange done: 15 results
   ✓  HN done: 15 stories
   ✓  Discourse done: 12 posts
   ✓  arXiv done: 10 papers
   ✓  Semantic Scholar done: 10 papers
   ✓  Bluesky done: 0 posts

   ✓ Research complete: 127 total sources across 10 platforms
     Duration: 0m 8s | Report: research-attention-is-all-you-need.html
```

---

## Platforms

| Platform | Source | Key Required |
|----------|--------|:---:|
| Reddit | Arctic Shift + PullPush APIs | No |
| YouTube | yt-dlp + invidious instances | No |
| News | Google News RSS + GNews | Optional |
| Web Search | DuckDuckGo + Google scraping | No |
| Hacker News | Algolia HN Search API | No |
| Bluesky | AT Protocol (auth required) | Required |
| Discourse | REST API (40+ forums) | No |
| Stack Exchange | SE v2.3 API (180+ sites) | Optional |
| Semantic Scholar | S2 Graph API | No (rate limited) |
| arXiv | arXiv Atom API | No |

**Reddit** uses 3 fallback sources (Arctic Shift → PullPush → Reddit Direct) with automatic switching on rate limits. **YouTube** uses yt-dlp CLI for speed, falling back to invidious API. **Bluesky** requires a free app password from [bsky.app](https://bsky.app/settings/app-passwords).

---

## Smart Features

### Phrase Detection

"machine learning" stays as one concept. "hula hoop" doesn't split. The query analyzer identifies 500+ known phrases before searching.

### Query Expansion

Every topic generates 6 targeted search angles automatically:

```
Topic: "best mechanical keyboards for programming"

  1. best mechanical keyboards for programming
  2. best mechanical keyboards for programming overview guide
  3. best mechanical keyboards for programming discussion reddit
  4. best mechanical keyboards for programming tips advice
  5. best mechanical keyboards for programming latest trends
  6. best mechanical keyboards for programming expert opinion
```

### TF-IDF Relevance Ranking

Results scored 0–100 by term frequency, inverse document frequency, and position. Most relevant results surface first across all platforms.

### Automatic Clustering

Results grouped into thematic clusters:

- **Getting Started** — tutorials, guides, introductions
- **Comparisons & Reviews** — vs posts, alternatives, recommendations
- **Common Problems** — issues, errors, troubleshooting
- **Tips & Advice** — best practices, recommendations
- **Expert Opinions** — research, studies, academic perspectives
- **Community Discussion** — personal experiences, stories

---

## Configuration

### Environment Variables

```bash
# Optional: Higher news search limits (free at gnews.io)
GNEWS_API_KEY=

# Required for Bluesky search (create at bsky.app/settings/app-passwords)
BLUESKY_IDENTIFIER=your-handle.bsky.social
BLUESKY_PASSWORD=your-app-password

# Optional: Higher Stack Exchange limits (free at stackapps.com/apps/oauth/register)
STACKEXCHANGE_API_KEY=
```

### Search Depth

| Depth | Sources | Time | Use Case |
|-------|---------|------|----------|
| 100 | ~100 | ~8s | Quick overview |
| 500 | ~200 | ~30s | Standard research (default) |
| 1000 | ~400 | ~1m | Thorough analysis |
| 2000 | ~800 | ~2m | Deep dive |

### Config File

Settings persist at `~/.research-toolkit/config.json`:

```json
{
  "depth": 500,
  "reportFormat": "both",
  "theme": "dark"
}
```

---

## Architecture

```
src/
├── cli.js                       # Entry point (auto-detects TUI vs batch)
├── config.js                    # Global configuration
├── tui/                         # Ink-based terminal interface
│   ├── App.js                   #   Main state machine
│   ├── sessionStore.js          #   Persistent session memory
│   ├── configStore.js           #   Config persistence
│   └── components/
│       ├── Header.js            #   Banner with version
│       ├── InputPrompt.js       #   Input with command palette
│       ├── ProgressView.js      #   10-platform progress display
│       ├── ResultsView.js       #   Ranked results + themes
│       ├── CommandPalette.js    #   Slash command menu
│       ├── LogPanel.js          #   Color-coded log
│       └── ConfigMenu.js        #   Settings editor
├── research/
│   ├── orchestrator.js          # Main research pipeline (parallel)
│   ├── queryAnalyzer.js         # Phrase detection, TF-IDF, clustering
│   ├── topicAnalyzer.js         # Subreddit discovery + keyword map
│   ├── redditBulk.js            # Reddit bulk scraping (3 fallback sources)
│   └── youtubeSearch.js         # YouTube discovery (yt-dlp + invidious)
├── sources/
│   ├── reddit.js                # Reddit JSON API
│   ├── webSearch.js             # DuckDuckGo + Google
│   ├── newsApi.js               # Google News RSS + GNews
│   ├── hackerNews.js            # Algolia HN Search
│   ├── bluesky.js               # AT Protocol search
│   ├── discourse.js             # Discourse forum search
│   ├── stackExchange.js         # SE v2.3 API
│   ├── semanticScholar.js       # Semantic Scholar Graph API
│   └── arxiv.js                 # arXiv Atom API
├── utils/
│   ├── rateLimiter.js           # Rate limiting with exponential backoff
│   ├── cache.js                 # Result caching (avoids re-fetching)
│   ├── sentiment.js             # Basic sentiment analysis
│   └── helpers.js               # Shared utilities
└── report/
    ├── reportGenerator.js       # Interactive HTML report generation
    └── exportReport.js          # Markdown + JSON export
```

---

## Frequently Asked Questions

**Q: Do I need API keys?**
A: No. Reddit, YouTube, Web Search, News, Hacker News, Discourse, Semantic Scholar, and arXiv all work without any keys. Bluesky requires a free app password. Stack Exchange and GNews have optional free keys for higher limits.

**Q: How fast is it?**
A: Depth 100 takes ~8s. Depth 500 takes ~30s. All 10 platforms run in parallel via `Promise.allSettled`, so total time equals the slowest single platform, not the sum.

**Q: Does it work on Windows/Mac/Linux?**
A: Yes. Anywhere Node.js runs. Tested on Linux (Termux, Ubuntu, Debian), macOS, and Windows (WSL).

**Q: What about rate limits?**
A: The tool respects all platform rate limits with exponential backoff. Reddit has 3 fallback sources. Semantic Scholar retries on 429. If one source is down, others continue.

**Q: Can I use it as a library?**
A: Yes. Import individual sources directly:

```javascript
const reddit = require('./src/sources/reddit');
const results = await reddit.search('machine learning', { maxResults: 10 });

const arxiv = require('./src/sources/arxiv');
const papers = await arxiv.searchArxiv('transformer attention', { maxResults: 10 });
```

**Q: What export formats are supported?**
A: Three formats via `--format`:
- **HTML** (default) — Interactive report with dark mode, search, collapse/expand, sentiment badges
- **Markdown** — Clean `.md` file for documentation, notes, READMEs
- **JSON** — Full structured data for programmatic processing

**Q: How do I render the demo GIF?**
A: Install [VHS](https://github.com/charmbracelet/vhs) and ffmpeg, then run `vhs demo.tape`. Requires a real system (not PRoot/Termux).

**Q: Can I search only specific platforms?**
A: Use `--reddit-only`, `--youtube-only`, or toggle platforms in TUI mode with `/sources`.

---

## Legal & Ethical Use

- Respects rate limits across all platforms
- No personal data collection
- No authentication required (except Bluesky search)
- Use for legitimate research purposes
- Follow each platform's terms of service

---

## License

[Business Source License 1.1](LICENSE) — free for personal and educational use. Commercial use requires a license. Becomes Apache 2.0 after 4 years (July 2030).

---

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Built for researchers who want fast, free, comprehensive topic analysis without API keys or subscriptions.
</p>
