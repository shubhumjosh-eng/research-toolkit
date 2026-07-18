const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { ensureDir } = require('../utils/helpers');

class VideoDownloader {
  constructor() {
    this.tempDir = config.VIDEO.tempDir;
  }

  async init() {
    await ensureDir(this.tempDir);
  }

  async checkYtDlp() {
    return new Promise((resolve) => {
      exec('yt-dlp --version', (error) => {
        resolve(!error);
      });
    });
  }

  async getInfo(url) {
    return new Promise((resolve, reject) => {
      exec(`yt-dlp --dump-json --no-download "${url}"`, 
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
    
    return new Promise((resolve, reject) => {
      const cmd = `yt-dlp -f "best[height<=720]" -o "${outputTemplate}.%(ext)s" --no-playlist "${url}"`;
      
      exec(cmd, { timeout: 120000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Download failed: ${stderr || error.message}`));
          return;
        }
        
        // Find the downloaded file
        const files = await fs.readdir(this.tempDir);
        const downloadedFile = files
          .filter(f => !f.endsWith('.part') && !f.endsWith('.info.json'))
          .pop();
        
        if (downloadedFile) {
          resolve({
            filePath: path.join(this.tempDir, downloadedFile),
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
      exec(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`, 
        { timeout: 60000 },
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
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
    } catch (error) {
      console.error('Cleanup failed:', error.message);
    }
  }
}

module.exports = new VideoDownloader();
