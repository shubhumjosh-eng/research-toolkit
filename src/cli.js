#!/usr/bin/env node

const path = require('path');
const { ensureDir } = require('./utils/helpers');

class ResearchCLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.command = this.args[0];
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      depth: 500,
      transcripts: false,
      redditOnly: false,
      youtubeOnly: false,
      output: null,
      video: null,
      scrape: null,
      noCache: false,
      batch: false,
      report: null,
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      switch (arg) {
        case '--depth':
          options.depth = parseInt(this.args[++i], 10) || 500;
          break;
        case '--transcripts':
          options.transcripts = true;
          break;
        case '--reddit-only':
          options.redditOnly = true;
          break;
        case '--youtube-only':
          options.youtubeOnly = true;
          break;
        case '--output':
        case '-o':
          options.output = this.args[++i];
          break;
        case '--no-cache':
          options.noCache = true;
          break;
        case '--video':
        case '-v':
          options.video = this.args[++i];
          break;
        case '--scrape':
        case '-s':
          options.scrape = this.args[++i];
          break;
        case '--batch':
          options.batch = true;
          break;
        case '--report':
          options.report = this.args[++i];
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  getTopic() {
    const nonFlagArgs = this.args.filter(a => !a.startsWith('-') && a !== 'research');
    return nonFlagArgs.find(a => a !== this.command) || nonFlagArgs[0] || null;
  }

  showHelp() {
    console.log(`
${'='.repeat(60)}
  RESEARCH TOOLKIT v3.0
  Deep Research Across 8 Platforms — No API Keys Needed
${'='.repeat(60)}

USAGE:
  node src/cli.js                          Interactive TUI (default)
  node src/cli.js "topic here"             Research topic directly (batch mode)
  node src/cli.js --batch "topic here"     Same as above (explicit batch mode)

OPTIONS:
  --depth <number>     Scrape depth: 100, 200, 500, 1000, 2000 (default: 500)
  --batch              Non-interactive batch mode (for scripting)
  --report <format>    Report format: terminal, html, both (default: both)
  --transcripts        Also extract YouTube video transcripts
  --output, -o <file>  Output filename
  --no-cache           Skip cache, fetch fresh data

PLATFORMS (all free, no API keys):
  🔴 Reddit           Posts & comments via JSON API
  🟢 YouTube          Video search via invidious instances
  📰 News             Google News RSS + GNews API
  🌐 Web Search       DuckDuckGo + Google via scraping
  🟠 Hacker News      Algolia HN Search API
  🦋 Bluesky          AT Protocol public search
  💬 Discourse        40+ public forum search
  📚 Stack Exchange   SE v2.3 API (180+ sites)

INTERACTIVE COMMANDS (TUI mode):
  Tab                  Open slash command palette
  /config              Open settings (depth, report format)
  /sources             Toggle platforms on/off
  /history             View past research sessions
  /deep                Switch to deep search mode
  /clear               Clear the screen
  /help                Show command help

SMART FEATURES:
  ✓ Phrase detection ("hula hoop" stays together)
  ✓ TF-IDF relevance ranking across all sources
  ✓ Query expansion (6 angles per topic)
  ✓ Automatic deduplication & clustering
  ✓ Session memory (follow-up questions)
  ✓ Persistent config (~/.research-toolkit/config.json)

EXAMPLES:
  # Interactive mode (recommended)
  node src/cli.js

  # Quick research
  node src/cli.js "quantum computing advances"

  # Batch mode for scripting
  node src/cli.js --batch "climate policy" --depth 1000

  # Terminal-only output
  node src/cli.js "machine learning trends" --report terminal

ZERO COST:
  ✓ No API keys required (all platforms have free tiers)
  ✓ Optional: GNews, Bluesky auth, StackExchange key for higher limits
`);
  }

  async run() {
    if (this.command === 'help' || this.command === '--help' || this.command === '-h') {
      this.showHelp();
      return;
    }

    if (this.options.video) {
      await this.runVideoAnalysis();
      return;
    }

    if (this.options.scrape) {
      await this.runScrape();
      return;
    }

    const topic = this.getTopic();
    if (topic) {
      await this.runBatch();
      return;
    }

    await this.runInteractive();
  }

  async runInteractive() {
    const React = require('react');
    const { render } = require('ink');
    const App = require('./tui/App');

    const topic = this.getTopic();
    render(React.createElement(App, { initialTopic: topic }));
  }

  async runBatch() {
    const orchestrator = require('./research/orchestrator');
    const topic = this.getTopic() || this.args.find(a => !a.startsWith('-') && a !== 'research');

    if (!topic) {
      console.error('\n❌ Error: Please provide a topic to research.');
      console.error('   Usage: node src/cli.js --batch research "your topic here"\n');
      process.exit(1);
    }

    await ensureDir('./reports');

    const result = await orchestrator.run(topic, {
      depth: this.options.depth,
      transcripts: this.options.transcripts,
      redditOnly: this.options.redditOnly,
      youtubeOnly: this.options.youtubeOnly,
      output: this.options.output,
      noCache: this.options.noCache,
    });
  }

  async runVideoAnalysis() {
    const videoAnalyzer = require('./video/analyzer');
    console.log('\n🔍 Research Toolkit - Analyzing video...\n');

    try {
      const info = await videoAnalyzer.analyze(this.options.video, {
        download: false,
        transcribe: false,
      });

      console.log('\n✅ Video Analysis Complete!\n');
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  }

  async runScrape() {
    const staticScraper = require('./scraping/scraper');
    const DynamicScraper = require('./scraping/browserScraper');
    const pdfGenerator = require('./report/reportGenerator');
    console.log('\n🔍 Research Toolkit - Scraping website...\n');

    try {
      let result;
      try {
        result = await staticScraper.scrape(this.options.scrape);
      } catch {
        console.log('Static scrape failed, trying dynamic scraper...');
        const dynamicScraper = new DynamicScraper();
        try {
          result = await dynamicScraper.scrape(this.options.scrape);
        } finally {
          await dynamicScraper.close();
        }
      }

      const outputPath = this.options.output || 'scrape-result.html';
      const html = await pdfGenerator.generate({ scraped: [result] }, outputPath, {
        title: `Scrape: ${this.options.scrape}`,
      });

      console.log('\n✅ Scrape complete!');
      console.log(`📁 Report saved to: ${html}`);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  }
}

const cli = new ResearchCLI();
cli.run();
