<p align="center">
  <h1 align="center">Research Toolkit</h1>
  <p align="center">
    <strong>Deep research assistant for the terminal</strong><br>
    Search 8 platforms with smart query understanding, TF-IDF ranking, and automatic clustering.
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-BSL%201.1-blue.svg" alt="License"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/version-3.0.0-green.svg" alt="Version"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="#platforms"><img src="https://img.shields.io/badge/platforms-8-orange.svg" alt="Platforms"></a>
  <a href="#smart-features"><img src="https://img.shields.io/badge/AI-free-yes-brightgreen.svg" alt="AI-free"></a>
</p>

---

## Quick Start

```bash
git clone https://github.com/shubhumjosh-eng/research-toolkit.git
cd research-toolkit
npm install
node src/cli.js "your topic here"
```

No API keys. No accounts. No setup. Just type and research.

---

## What It Does

Research Toolkit searches Reddit, YouTube, News, Web, Hacker News, Bluesky, Discourse forums, and Stack Exchange simultaneously — then ranks, deduplicates, and clusters the results for you.

```
$ node src/cli.js "best mechanical keyboards for programming"

   Research: "best mechanical keyboards for programming" (depth: 500)
   Phrases: [best mechanical keyboards for, mechanical keyboards for programming]
   Intent: comparison | Expanded: 6 queries

   Discovering relevant subreddits...        ✓ Found 2 subreddits
   Searching news articles...                ✓ Found 50 news articles
   Searching the web...                      ✓ Found 50 web results
   Scraping Reddit...                        ✓ 6 posts, 50 comments
   Discovering YouTube videos...             ✓ 81 videos found
   Searching Hacker News...                  ✓ 4 stories
   Searching Bluesky...                      ⚠ Auth required for search
   Searching Discourse forums...             ✓ 10 posts
   Searching Stack Exchange...               ✓ 7 results

   ✓ Research complete: 201 total sources across 8 platforms
     Duration: 0m 59s | Report: research-best-mechanical-keyboards-....html
```

---

## Why Research Toolkit?

| Problem | Research Toolkit |
|---------|-----------------|
| API keys for every platform | **Zero API keys** — uses free public APIs |
| Copy-pasting between 8 browser tabs | **One command** searches everything |
| Duplicated results across sources | **TF-IDF deduplication** merges overlaps |
| Raw dump of 200+ links | **Smart clustering** groups by theme |
| No way to compare sources | **Cross-platform ranking** by relevance |
| Forget what you researched yesterday | **Session memory** remembers your history |

---

## Usage

### Direct Research (Recommended)

```bash
node src/cli.js "your topic here"
```

Type a topic, get a comprehensive report. That's it.

### Interactive TUI

```bash
node src/cli.js
```

Opens a full-screen terminal interface with real-time progress, slash commands, and follow-up questions.

### Batch Mode (For Scripting)

```bash
node src/cli.js --batch "your topic" --depth 1000
node src/cli.js "topic" --report terminal    # Terminal only, no HTML
node src/cli.js "topic" --output report.html # Custom output path
```

### Slash Commands (TUI Mode)

| Command | Description |
|---------|-------------|
| `Tab` | Open command palette |
| `/config` | Adjust depth, report format |
| `/sources` | Toggle platforms on/off |
| `/history` | View past research sessions |
| `/deep` | Switch to 5-10 minute deep search |
| `/clear` | Clear the screen |
| `/help` | Show all commands |

---

## Platforms

All 8 platforms work without API keys. Optional keys increase rate limits.

| | Platform | Source | API Key |
|---|----------|--------|---------|
| 🔴 | **Reddit** | Arctic Shift + PullPush APIs | No |
| 🟢 | **YouTube** | yt-dlp + invidious instances | No |
| 📰 | **News** | Google News RSS + GNews | Optional |
| 🌐 | **Web Search** | DuckDuckGo + Google scraping | No |
| 🟠 | **Hacker News** | Algolia HN Search API | No |
| 🦋 | **Bluesky** | AT Protocol (auth required) | Required |
| 💬 | **Discourse** | REST API (40+ forums) | No |
| 📚 | **Stack Exchange** | SE v2.3 API (180+ sites) | Optional |

### Platform Details

**Reddit** — Searches via Arctic Shift (primary), PullPush (fallback), or Reddit Direct (fallback). Fetches posts + top comments. Rate limit aware with automatic source switching.

**YouTube** — Uses yt-dlp CLI for fast, reliable search. Falls back to invidious API. Returns video metadata, channel info, view counts.

**News** — Google News RSS feed (free, no key). Optional GNews API key for higher limits.

**Web Search** — DuckDuckGo HTML scraping + Google search scraping. No API key needed.

**Hacker News** — Algolia HN Search API. Returns stories + top comments. No key needed.

**Bluesky** — AT Protocol search. **Requires authentication** — create an app password at [bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords).

**Discourse** — Searches 40+ public Discourse forums. Smart forum selection based on topic keywords.

**Stack Exchange** — Searches 180+ Stack Exchange sites (Stack Overflow, Super User, Server Fault, etc.). Optional API key increases daily quota from 300 to 10,000.

---

## Smart Features

### Phrase Detection

"machine learning" stays as one concept. "hula hoop" doesn't split into separate words. The query analyzer identifies known phrases before searching.

### Query Expansion

Every topic generates 6 targeted search angles automatically:

```
Topic: "best mechanical keyboards for programming"

Expanded queries:
  1. best mechanical keyboards for programming
  2. best mechanical keyboards for programming overview guide
  3. best mechanical keyboards for programming discussion reddit
  4. best mechanical keyboards for programming tips advice
  5. best mechanical keyboards for programming latest trends
  6. best mechanical keyboards for programming expert opinion
```

### TF-IDF Relevance Ranking

Results are scored 0-100 based on term frequency, inverse document frequency, and position. The most relevant results surface first, regardless of which platform they came from.

### Automatic Clustering

Results are grouped into thematic clusters:

- **Getting Started** — tutorials, guides, introductions
- **Comparisons & Reviews** — vs posts, alternatives, recommendations
- **Common Problems** — issues, errors, troubleshooting
- **Tips & Advice** — recommendations, suggestions, best practices
- **Expert Opinions** — research, studies, academic perspectives
- **Community Discussion** — personal experiences, stories, opinions

### Session Memory

Your research history persists across runs. Ask follow-up questions that build on previous results.

### Persistent Config

Settings saved at `~/.research-toolkit/config.json`:

```json
{
  "depth": 500,
  "reportFormat": "both"
}
```

---

## Installation

### Requirements

- Node.js 18+
- npm
- (Optional) [yt-dlp](https://github.com/yt-dlp/yt-dlp) — significantly improves YouTube search speed

### Install

```bash
git clone https://github.com/shubhumjosh-eng/research-toolkit.git
cd research-toolkit
npm install
```

### Global Install (Optional)

```bash
npm link
research "quantum computing advances"
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

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
| 100 | ~100 | ~30s | Quick overview |
| 500 | ~200 | ~1m | Standard research (default) |
| 1000 | ~400 | ~2m | Thorough analysis |
| 2000 | ~800 | ~4m | Deep dive |

---

## Output

Reports are generated as interactive HTML files with:

- Executive summary with sentiment analysis
- Cross-platform ranked results
- Topic clusters with grouped results
- Per-platform breakdown (Reddit, YouTube, News, etc.)
- Searchable and filterable interface

```bash
# Open report in browser
node src/cli.js "topic" && open research-*.html

# Terminal-only output (no HTML file)
node src/cli.js "topic" --report terminal
```

---

## Architecture

```
src/
├── cli.js                     # Entry point (auto-detects TUI vs batch)
├── config.js                  # Global configuration
├── tui/                       # Ink-based terminal interface
│   ├── App.js                 #   Main state machine
│   ├── sessionStore.js        #   Persistent session memory
│   ├── configStore.js         #   Config persistence
│   └── components/
│       ├── Header.js          #   Banner with version
│       ├── InputPrompt.js     #   Input with command palette
│       ├── ProgressView.js    #   8-platform progress display
│       ├── ResultsView.js     #   Ranked results + themes
│       ├── CommandPalette.js  #   Slash command menu
│       ├── LogPanel.js        #   Color-coded log
│       └── ConfigMenu.js      #   Settings editor
├── research/
│   ├── orchestrator.js        # Main research pipeline
│   ├── queryAnalyzer.js       # Phrase detection, TF-IDF, clustering
│   ├── topicAnalyzer.js       # Subreddit discovery + keyword map
│   ├── redditBulk.js          # Reddit bulk scraping (3 fallback sources)
│   └── youtubeSearch.js       # YouTube discovery (yt-dlp + invidious)
├── sources/
│   ├── reddit.js              # Reddit JSON API
│   ├── webSearch.js           # DuckDuckGo + Google
│   ├── newsApi.js             # Google News RSS + GNews
│   ├── hackerNews.js          # Algolia HN Search
│   ├── bluesky.js             # AT Protocol search
│   ├── discourse.js           # Discourse forum search
│   └── stackExchange.js       # SE v2.3 API
├── utils/
│   ├── rateLimiter.js         # Rate limiting with exponential backoff
│   ├── cache.js               # Result caching (avoids re-fetching)
│   ├── sentiment.js           # Basic sentiment analysis
│   └── helpers.js             # Shared utilities
└── report/
    └── reportGenerator.js     # Interactive HTML report generation
```

---

## Frequently Asked Questions

**Q: Do I need API keys?**
A: No. Reddit, YouTube, Web Search, News, Hacker News, and Discourse all work without any keys. Bluesky requires a free account + app password. Stack Exchange and GNews have optional free keys for higher limits.

**Q: How long does a search take?**
A: ~30-90 seconds depending on depth and platform rate limits. Cached results return in ~4 seconds.

**Q: Does it work on Windows/Mac/Linux?**
A: Yes. Anywhere Node.js runs. Tested on Linux (Termux, Ubuntu, Debian), macOS, and Windows (WSL).

**Q: What about rate limits?**
A: The tool respects all platform rate limits with exponential backoff. If one source is rate-limited, it automatically falls back to alternatives (e.g., Arctic Shift → PullPush → Reddit Direct).

**Q: Can I use it as a library?**
A: Yes. Import individual sources directly:

```javascript
const reddit = require('./src/sources/reddit');
const results = await reddit.search('machine learning', { maxResults: 10 });
```

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
