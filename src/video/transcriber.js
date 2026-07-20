const { execFile } = require('child_process');
const fs = require('fs').promises;
const config = require('../config');

class VideoTranscriber {
  constructor() {
    this.model = config.VIDEO.whisperModel;
  }

  async checkWhisper() {
    return new Promise((resolve) => {
      execFile('whisper', ['--help'], (error) => {
        resolve(!error);
      });
    });
  }

  async transcribe(audioPath, language = null) {
    const hasWhisper = await this.checkWhisper();
    if (!hasWhisper) {
      throw new Error('Whisper not found. Install with: pip install openai-whisper');
    }
    
    const path = require('path');
    const outputDir = path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    
    const args = [audioPath, '--model', this.model, '--output_format', 'json', '--output_dir', outputDir];
    if (language) args.push('--language', language);
    
    return new Promise((resolve, reject) => {
      execFile('whisper', args, { timeout: 300000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Transcription failed: ${stderr || error.message}`));
          return;
        }
        
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        
        try {
          const data = await fs.readFile(jsonPath, 'utf8');
          const result = JSON.parse(data);
          
          resolve({
            text: result.text,
            segments: result.segments?.map(s => ({
              start: s.start,
              end: s.end,
              text: s.text,
            })) || [],
            language: result.language,
          });
        } catch (e) {
          resolve({
            text: stdout,
            segments: [],
            language: 'unknown',
          });
        }
      });
    });
  }

  async transcribeVideo(videoPath, language = null) {
    const downloader = require('./downloader');
    
    // Extract audio
    const audioPath = await downloader.extractAudio(videoPath);
    
    // Transcribe
    const result = await this.transcribe(audioPath, language);
    
    // Clean up audio file
    try {
      await fs.unlink(audioPath);
    } catch {}
    
    return result;
  }
}

module.exports = new VideoTranscriber();
