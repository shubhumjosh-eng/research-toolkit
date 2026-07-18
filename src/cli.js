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

    for (let i = 1; i < this.args.length; i++) {
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
    const nonFlagArgs = this.args.filter((a, i) => i > 0 && !a.startsWith('-'));
    return nonFlagArgs.find(a => a !== this.command && a !== 'research') || null;
  }

  showHelp() {
    console.log(`
${'='.repeat(60)}
  RESEARCH TOOLKIT v2.0
  General-Purpose Deep Research for the Terminal
${'='.repeat(60)}

USAGE:
  node src/cli.js                          Interactive TUI (default)
  node src/cli.js "topic here"             Research topic in TUI
  node src/cli.js --batch research "topic" Batch mode (pipe-friendly)

OPTIONS:
  --depth <number>     Scrape depth: 100, 200, 500, 1000, 2000 (default: 500)
  --batch              Non-interactive batch mode (for scripting)
  --report <format>    Report format: terminal, html, both (default: both)
  --transcripts        Also extract YouTube video transcripts
  --reddit-only        Only scrape Reddit
  --youtube-only       Only scrape YouTube
  --output, -o <file>  Output filename
  --no-cache           Skip cache, fetch fresh data

OTHER COMMANDS:
  --video, -v <url>    Analyze a single video
  --scrape, -s <url>   Scrape a single website

INTERACTIVE COMMANDS:
  /config              Open settings (report format, depth, theme)
  Ctrl+C               Cancel current research or exit

EXAMPLES:
  # Interactive mode (recommended)
  node src/cli.js

  # Quick research
  node src/cli.js "quantum computing advances"

  # Batch mode for scripting
  node src/cli.js --batch research "climate policy" --depth 1000

  # Terminal-only output
  node src/cli.js "machine learning trends" --report terminal

FREE FEATURES:
  ✓ Auto-discover relevant subreddits from any topic
  ✓ Reddit + YouTube + News + Web search
  ✓ Comments & discussions extraction
  ✓ Rich HTML report + terminal summary
  ✓ Rate limiting & safeguards
  ✓ Zero API keys required
  ✓ Persistent settings (~/.research-toolkit/config.json)
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

    if (this.options.batch) {
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
