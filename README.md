# Research Toolkit

Free, ethical web research & analysis toolkit for startup research.

## Features

- **Web Search** - Search the web using DuckDuckGo (free, no API key)
- **News Search** - Search news articles via Google News RSS (free)
- **Reddit Search** - Search Reddit posts and comments (free)
- **Website Scraping** - Scrape static and dynamic websites
- **Video Analysis** - Extract video metadata from YouTube, TikTok, etc.
- **PDF Reports** - Generate HTML reports (print to PDF from browser)

## Installation

```bash
# Clone or download this toolkit
cd research-toolkit

# Install dependencies
npm install

# Optional: Install yt-dlp for video downloading
pip install yt-dlp

# Optional: Install whisper for video transcription
pip install openai-whisper

# Optional: Install chromium for dynamic site scraping
sudo apt install chromium-browser
```

## Usage

### Research a Topic
```bash
node src/cli.js "AI startups in 2024"
```

### Analyze a Video
```bash
node src/cli.js --video "https://youtube.com/watch?v=abc123"
```

### Download and Transcribe a Video
```bash
node src/cli.js --video "https://youtube.com/watch?v=abc123" --download --transcribe
```

### Scrape a Website
```bash
node src/cli.js --scrape "https://example.com"
```

### Custom Output
```bash
node src/cli.js "machine learning" --output ml-research.pdf
```

## Output

Reports are generated as HTML files. To convert to PDF:
1. Open the HTML file in your browser
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. Select "Save as PDF"

## Free Features

| Feature | API/Source | Free? |
|---------|-----------|-------|
| Web Search | DuckDuckGo | ✓ |
| News Search | Google News RSS | ✓ |
| Reddit | Reddit JSON API | ✓ |
| Video Metadata | YouTube oEmbed | ✓ |
| Website Scraping | Cheerio/Puppeteer | ✓ |
| PDF Generation | HTML templates | ✓ |

## Optional Dependencies

| Tool | Purpose | Install |
|------|---------|---------|
| yt-dlp | Video downloading | `pip install yt-dlp` |
| whisper | Video transcription | `pip install openai-whisper` |
| chromium | Dynamic site scraping | `sudo apt install chromium-browser` |

## Legal & Ethical Use

This toolkit is designed for ethical research purposes:
- Respect website terms of service
- Use rate limiting between requests
- Do not collect personal data without consent
- Follow applicable laws and regulations
- Use for legitimate business research only

## License

ISC
