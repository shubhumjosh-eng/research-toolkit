# Research Toolkit

Deep research assistant for the terminal — searches 8 platforms with smart query understanding, TF-IDF ranking, and automatic clustering. No API keys required.

[![License: BSL-1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-green.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Platforms](https://img.shields.io/badge/platforms-8-orange.svg)](#platforms)

## Quick Start

```bash
git clone https://github.com/shubhumjosh-eng/research-toolkit.git
cd research-toolkit
npm install
node src/cli.js "your topic here"
```

That's it. No API keys, no accounts, no setup. Just type and research.

## What It Does

```
$ node src/cli.js "best mechanical keyboards for programming"

   Research: "best mechanical keyboards for programming" (depth: 500)
   Phrases: [best mechanical keyboards for, mechanical keyboards for programming]
   Intent: comparison | Expanded: 6 queries
   Discovering relevant subreddits...
✓  Found 2 subreddits, 1 queries
   Searching news articles...
✓  Found 50 news articles
   Searching the web...
✓  Found 50 web results
   Scraping Reddit...
✓  r/keyboards: 5 posts, 42 comments
   Discovering YouTube videos...
✓  YouTube: 59 videos found
   Searching Hacker News...
✓  HN: 4 stories
   Searching Bluesky...
✓  Bluesky: 0 posts
   Searching Discourse forums...
✓  Discourse: 2 posts
   Searching Stack Exchange...
✓  Stack Exchange: 7 results
   Analyzing results...
✓  Research complete: 177 total sources across 8 platforms
   Duration: 1m 10s | Report: research-best-mechanical-keyboards-for-....html
```

## Usage

### Interactive TUI (Default)

```bash
node src/cli.js
```

Opens a full-screen terminal interface where you type your topic and see results in real-time.

### Direct Research (Batch Mode)

```bash
node src/cli.js "your topic here"
node src/cli.js --batch "your topic here" --depth 1000
```

Runs non-interactively and generates an HTML report.

### Slash Commands (TUI Mode)

| Command | Description |
|---------|-------------|
| `Tab` | Open command palette |
| `/config` | Adjust settings (depth, report format) |
| `/sources` | Toggle platforms on/off |
| `/history` | View past research sessions |
| `/deep` | Switch to 5-10 minute deep search |
| `/clear` | Clear the screen |
| `/help` | Show all commands |

## Platforms

All 8 platforms work without API keys. Optional keys increase rate limits.

| Platform | Source | Free? | API Key? |
|----------|--------|-------|----------|
| Reddit | Arctic Shift + PullPush APIs | ✓ | No |
| YouTube | yt-dlp CLI + invidious | ✓ | No |
| News | Google News RSS + GNews | ✓ | Optional |
| Web Search | DuckDuckGo + Google scraping | ✓ | No |
| Hacker News | Algolia HN Search | ✓ | No |
| Bluesky | AT Protocol public API | ✓ | Optional |
| Discourse | REST API (40+ forums) | ✓ | No |
| Stack Exchange | SE v2.3 API (180+ sites) | ✓ | Optional |

## Smart Features

- **Phrase Detection**: "hula hoop" stays together, "machine learning" doesn't split into separate words
- **Query Expansion**: Each topic generates 6 targeted search angles automatically
- **TF-IDF Ranking**: Results scored by relevance across all sources
- **Deduplication**: Same content from different platforms merged automatically
- **Clustering**: Results grouped into themes (Getting Started, Comparisons, Tips, etc.)
- **Session Memory**: Follow up on previous research questions
- **Persistent Config**: Your settings survive across sessions (`~/.research-toolkit/config.json`)

## Installation

### Requirements

- Node.js 18+
- npm
- (Optional) [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube search

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

## Configuration

### Environment Variables

All optional. Create a `.env` file or set these:

```bash
# Higher news search limits (free at gnews.io)
GNEWS_API_KEY=

# Bluesky enhanced search (create at bsky.app/settings/app-passwords)
BLUESKY_IDENTIFIER=
BLUESKY_PASSWORD=

# Higher Stack Exchange limits (free at stackapps.com/apps/oauth/register)
STACKEXCHANGE_API_KEY=
```

### Config File

Located at `~/.research-toolkit/config.json`:

```json
{
  "depth": 500,
  "reportFormat": "both",
  "sessions": []
}
```

## Output

Reports are saved as HTML files. Open in any browser and print to PDF if needed.

```bash
# Custom output path
node src/cli.js "topic" --output my-report.html

# Terminal-only output (no HTML)
node src/cli.js "topic" --report terminal
```

## Architecture

```
src/
├── cli.js                  # CLI entry point (auto-detects TUI vs batch)
├── config.js               # Global configuration
├── server.js               # Web UI server (optional)
├── tui/                    # Ink-based terminal interface
│   ├── App.js              # Main app state machine
│   ├── configStore.js      # Persistent config
│   ├── sessionStore.js     # Session memory
│   └── components/
│       ├── Header.js       # Banner with version
│       ├── InputPrompt.js  # Command palette integration
│       ├── ProgressView.js # 8-platform progress display
│       ├── ResultsView.js  # Ranked results + themes
│       ├── CommandPalette.js # Slash command menu
│       ├── LogPanel.js     # Color-coded log
│       └── ConfigMenu.js   # Settings editor
├── research/
│   ├── orchestrator.js     # Main research pipeline
│   ├── queryAnalyzer.js    # Phrase detection, TF-IDF, clustering
│   ├── topicAnalyzer.js    # Subreddit discovery
│   ├── redditBulk.js       # Reddit bulk scraping
│   └── youtubeSearch.js    # YouTube discovery
├── sources/
│   ├── reddit.js           # Reddit JSON API
│   ├── webSearch.js        # DuckDuckGo + Google
│   ├── newsApi.js          # Google News RSS + GNews
│   ├── hackerNews.js       # Algolia HN Search
│   ├── bluesky.js          # AT Protocol search
│   ├── discourse.js        # Discourse forum search
│   └── stackExchange.js    # SE v2.3 API
├── utils/
│   ├── rateLimiter.js      # Rate limiting with backoff
│   ├── cache.js            # Result caching
│   ├── sentiment.js        # Basic sentiment analysis
│   └── helpers.js          # Utilities
└── report/
    └── reportGenerator.js  # HTML report generation
```

## Legal & Ethical Use

- Respects rate limits across all platforms
- No personal data collection
- No authentication required
- Use for legitimate research purposes
- Follow each platform's terms of service

## License

[Business Source License 1.1](LICENSE) — free for personal and educational use. Commercial use requires a license. Becomes Apache 2.0 after 4 years (July 2030).

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

---

Built for researchers who want fast, free, comprehensive topic analysis without API keys or subscriptions.
