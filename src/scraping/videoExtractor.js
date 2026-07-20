const axios = require('axios');
const cheerio = require('cheerio');

class VideoExtractor {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
  }

  async extractFromUrl(url) {
    try {
      // Handle YouTube URLs
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return await this.extractYouTube(url);
      }
      
      // Handle TikTok URLs
      if (url.includes('tiktok.com')) {
        return await this.extractTikTok(url);
      }
      
      // Handle Vimeo URLs
      if (url.includes('vimeo.com')) {
        return await this.extractVimeo(url);
      }
      
      // Generic extraction attempt
      return await this.extractGeneric(url);
    } catch (error) {
      return { url, error: error.message };
    }
  }

  async extractYouTube(url) {
    const videoId = this.extractYouTubeId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');
    
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    try {
      const response = await axios.get(oembedUrl, { headers: this.headers });
      const data = response.data;
      
      return {
        platform: 'YouTube',
        videoId,
        title: data.title,
        author: data.author_name,
        authorUrl: data.author_url,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embedUrl: data.embed_url,
        url,
      };
    } catch (error) {
      // Fallback to basic extraction
      return {
        platform: 'YouTube',
        videoId,
        title: 'YouTube Video',
        url,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  async extractTikTok(url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs supported');
      }
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 10000,
        maxRedirects: 5,
      });
      
      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || 'TikTok Video';
      
      return {
        platform: 'TikTok',
        title,
        url,
      };
    } catch (error) {
      return {
        platform: 'TikTok',
        title: 'TikTok Video',
        url,
        error: error.message,
      };
    }
  }

  async extractVimeo(url) {
    const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
      const response = await axios.get(oembedUrl, { headers: this.headers, timeout: 10000 });
      const data = response.data;
      
      return {
        platform: 'Vimeo',
        videoId: vimeoId,
        title: data.title,
        author: data.author_name,
        authorUrl: data.author_url,
        thumbnailUrl: data.thumbnail_url,
        url,
      };
    } catch (error) {
      return {
        platform: 'Vimeo',
        videoId: vimeoId,
        title: 'Vimeo Video',
        url,
      };
    }
  }

  async extractGeneric(url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs supported');
      }
      const response = await axios.get(url, { 
        headers: this.headers,
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      
      // Try to find video metadata
      const title = $('title').text().trim() || 
                   $('meta[property="og:title"]').attr('content') || 'Unknown Video';
      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || '';
      const thumbnail = $('meta[property="og:image"]').attr('content') || '';
      
      // Check if there's an embedded video
      const videoSrc = $('video source').attr('src') || 
                      $('video').attr('src') || '';
      
      return {
        platform: 'Web',
        title,
        description,
        thumbnailUrl: thumbnail,
        videoSrc,
        url,
      };
    } catch (error) {
      return {
        platform: 'Web',
        title: 'Video',
        url,
        error: error.message,
      };
    }
  }

  extractYouTubeId(url) {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/,
      /youtube\.com\/shorts\/([^?]+)/,
      /youtube\.com\/live\/([^?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async extractMultiple(urls) {
    const results = [];
    for (const url of urls) {
      const result = await this.extractFromUrl(url);
      results.push(result);
    }
    return results;
  }
}

module.exports = new VideoExtractor();
