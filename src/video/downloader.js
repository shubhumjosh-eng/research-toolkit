const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { ensureDir } = require('../utils/helpers');

class VideoDownloader {
  constructor() {
    this.tempDir = config.VIDEO.tempDir;
    this.currentFile = null;
  }

  async init() {
    await ensureDir(this.tempDir);
  }

  async checkYtDlp() {
    return new Promise((resolve) => {
      execFile('yt-dlp', ['--version'], (error) => {
        resolve(!error);
      });
    });
  }

  async getInfo(url) {
    return new Promise((resolve, reject) => {
      execFile('yt-dlp', ['--dump-json', '--no-download', url],
        { timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Failed to get video info: ${stderr || error.message}`));
            return;
          }
          try {
            const info = JSON.parse(stdout);
            resolve({
              id: info.id,
              title: info.title,
              description: info.description,
              duration: info.duration,
              viewCount: info.view_count,
              likeCount: info.like_count,
              uploadDate: info.upload_date,
              uploader: info.uploader,
              platform: info.extractor_key || info.extractor,
              thumbnailUrl: info.thumbnail,
              url,
            });
          } catch (e) {
            reject(new Error('Failed to parse video info'));
          }
        }
      );
    });
  }

  async download(url, filename = null) {
    await this.init();
    
    const hasYtDlp = await this.checkYtDlp();
    if (!hasYtDlp) {
      throw new Error('yt-dlp not found. Install with: pip install yt-dlp');
    }
    
    const outputTemplate = filename 
      ? path.join(this.tempDir, filename)
      : path.join(this.tempDir, '%(title)s.%(ext)s');
    
    const beforeFiles = new Set(await fs.readdir(this.tempDir));
    
    return new Promise((resolve, reject) => {
      execFile('yt-dlp', [
        '-f', 'best[height<=720]',
        '-o', outputTemplate,
        '--no-playlist',
        url,
      ], { timeout: 120000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Download failed: ${stderr || error.message}`));
          return;
        }
        
        const allFiles = await fs.readdir(this.tempDir);
        const newFiles = allFiles.filter(f => !beforeFiles.has(f) && !f.endsWith('.part') && !f.endsWith('.info.json'));
        
        if (newFiles.length > 0) {
          const downloadedFile = newFiles.sort().pop();
          this.currentFile = path.join(this.tempDir, downloadedFile);
          resolve({
            filePath: this.currentFile,
            fileName: downloadedFile,
          });
        } else {
          reject(new Error('Download completed but file not found'));
        }
      });
    });
  }

  async extractAudio(videoPath) {
    const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');
    
    return new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', videoPath,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        audioPath, '-y',
      ], { timeout: 60000 },
        (error) => {
          if (error) {
            reject(new Error(`Audio extraction failed: ${error.message}`));
            return;
          }
          resolve(audioPath);
        }
      );
    });
  }

  async cleanup() {
    try {
      if (this.currentFile) {
        await fs.unlink(this.currentFile).catch(() => {});
        this.currentFile = null;
      }
    } catch {}
  }
}

module.exports = new VideoDownloader();
