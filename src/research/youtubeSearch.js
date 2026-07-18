const axios = require('axios');
const { execFile } = require('child_process');
const RateLimiter = require('../utils/rateLimiter');
const DynamicScraper = require('../scraping/browserScraper');
const { sleep } = require('../utils/helpers');

const limiter = new RateLimiter(0.33);

class YouTubeDiscovery {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    this.scrapedIds = new Set();
    this.ytDlpAvailable = null;
    this.scraper = null;
  }

  async checkYtDlp() {
    if (this.ytDlpAvailable !== null) return this.ytDlpAvailable;
    return new Promise((resolve) => {
      execFile('yt-dlp', ['--version'], (error) => {
        this.ytDlpAvailable = !error;
        resolve(this.ytDlpAvailable);
      });
    });
  }

  async discover(topic, maxVideos = 50, onProgress = null, onLog = null, options = {}) {
    this.scrapedIds.clear();
    this.scraper = options.scraper || null;
    const allVideos = [];
    const log = onLog || (() => {});
    const useYtDlp = await this.checkYtDlp();

    log('info', useYtDlp ? 'yt-dlp available — using CLI' : 'yt-dlp not found — using HTML parsing');

    const queries = [
      topic,
      `${topic} review`,
    ];

    for (const query of queries) {
      if (allVideos.length >= maxVideos) break;

      try {
        log('info', `Searching: "${query}"`);
        const videos = await this.searchYouTube(query, Math.ceil(maxVideos / queries.length), useYtDlp, log);

        for (const video of videos) {
          if (!this.scrapedIds.has(video.videoId) && allVideos.length < maxVideos) {
            this.scrapedIds.add(video.videoId);
            allVideos.push(video);

            if (onProgress) {
              onProgress({
                videos: allVideos.length,
                target: maxVideos,
                currentQuery: query,
              });
            }
          }
        }

        log('success', `"${query}": ${videos.length} videos found`);
        limiter.reset();
        await sleep(2000);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          log('warn', `YouTube 429 rate limit, backing off...`);
          await limiter.backoff();
        } else {
          log('error', `"${query}" failed: ${error.message}`);
        }
      }
    }

    // Puppeteer fallback if we got very few results
    if (allVideos.length < 10 && this.scraper) {
      log('warn', `Only ${allVideos.length} videos found, trying browser fallback...`);
      try {
        const browser = await this.scraper.launch();
        for (const query of queries) {
          if (allVideos.length >= maxVideos) break;
          try {
            const videos = await this.searchViaPuppeteer(query, Math.ceil(maxVideos / queries.length), browser);
            for (const video of videos) {
              if (!this.scrapedIds.has(video.videoId) && allVideos.length < maxVideos) {
                this.scrapedIds.add(video.videoId);
                allVideos.push(video);
                if (onProgress) {
                  onProgress({ videos: allVideos.length, target: maxVideos, currentQuery: `${query} (browser)` });
                }
              }
            }
            log('success', `"${query}" (browser): ${videos.length} videos`);
          } catch (e) {
            log('error', `"${query}" browser scrape failed: ${e.message}`);
          }
        }
      } catch (e) {
        log('error', `Browser fallback failed: ${e.message}`);
      }
    }

    log('success', `YouTube done: ${allVideos.length} videos total`);
    return allVideos;
  }

  async searchYouTube(query, maxResults = 25, useYtDlp = false, log) {
    if (useYtDlp) {
      return this.searchViaYtDlp(query, maxResults);
    }
    return this.searchViaHtml(query, maxResults, log);
  }

  async searchViaYtDlp(query, maxResults) {
    const searchQuery = `ytsearch${maxResults}:${query}`;

    return new Promise((resolve, reject) => {
      execFile('yt-dlp', [
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
        '--ignore-errors',
        searchQuery,
      ], { timeout: 30000 }, (error, stdout) => {
        if (error && !stdout) {
          reject(error);
          return;
        }

        const videos = stdout
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              const data = JSON.parse(line);
              return {
                videoId: data.id || '',
                title: data.title || '',
                channelName: data.channel || data.uploader || '',
                channelUrl: data.channel_url || data.uploader_url || '',
                viewCount: data.view_count || 0,
                duration: data.duration ? this.formatDuration(data.duration) : '',
                thumbnailUrl: data.thumbnails?.[data.thumbnails.length - 1]?.url
                  || `https://img.youtube.com/vi/${data.id}/mqdefault.jpg`,
                url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        resolve(videos);
      });
    });
  }

  async searchViaHtml(query, maxResults, log) {
    await limiter.wait();

    const searchUrl = `https://www.youtube.com/results`;
    const response = await limiter.retryRequest(() =>
      axios.get(searchUrl, {
        params: { search_query: query },
        headers: this.headers,
        timeout: 15000,
      })
    , 3, log);

    const videoIds = [];
    const regex = /"videoId":"([^"]+)"/g;
    let match;
    while ((match = regex.exec(response.data)) !== null) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
      }
    }

    const titleRegex = /"title":\{"runs":\[\{"text":"([^"]+)"\}\]/g;
    const titles = [];
    while ((match = titleRegex.exec(response.data)) !== null) {
      titles.push(match[1]);
    }

    const channelRegex = /"ownerText":\{"runs":\[\{"text":"([^"]+)"\}\]/g;
    const channels = [];
    while ((match = channelRegex.exec(response.data)) !== null) {
      channels.push(match[1]);
    }

    const viewRegex = /"viewCountText":\{"simpleText":"([^"]+)"\}/g;
    const views = [];
    while ((match = viewRegex.exec(response.data)) !== null) {
      views.push(match[1]);
    }

    const videos = [];
    for (let i = 0; i < videoIds.length && i < maxResults; i++) {
      videos.push({
        videoId: videoIds[i],
        title: titles[i] || `Video ${videoIds[i]}`,
        channelName: channels[i] || '',
        viewCount: this.parseViewCount(views[i] || ''),
        url: `https://www.youtube.com/watch?v=${videoIds[i]}`,
      });
    }

    return videos;
  }

  async searchViaPuppeteer(query, maxResults, browser) {
    const page = await browser.newPage();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      const videos = await page.evaluate(() => {
        const items = [];
        const renderers = document.querySelectorAll('ytd-video-renderer, ytd-channel-renderer');
        renderers.forEach((el) => {
          const titleEl = el.querySelector('#video-title');
          const channelEl = el.querySelector('#channel-name a, .ytd-channel-name a');
          const viewEl = el.querySelector('#metadata-line span:first-child');
          const href = titleEl?.getAttribute('href') || '';
          const videoId = href.match(/[?&]v=([^&]+)/)?.[1];

          if (videoId && titleEl) {
            items.push({
              videoId,
              title: titleEl.textContent.trim(),
              channelName: channelEl?.textContent?.trim() || '',
              viewCount: parseInt((viewEl?.textContent || '').replace(/[^\d]/g, '') || '0', 10),
              url: `https://www.youtube.com/watch?v=${videoId}`,
            });
          }
        });
        return items;
      });

      return videos.slice(0, maxResults);
    } finally {
      await page.close();
    }
  }

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  parseViewCount(text) {
    const match = text.match(/([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return 0;
  }
}

module.exports = new YouTubeDiscovery();
