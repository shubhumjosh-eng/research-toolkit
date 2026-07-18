const { exec } = require('child_process');
const fs = require('fs').promises;
const config = require('../config');

class VideoTranscriber {
  constructor() {
    this.model = config.VIDEO.whisperModel;
  }

  async checkWhisper() {
    return new Promise((resolve) => {
      exec('whisper --help', (error) => {
        resolve(!error);
      });
    });
  }

  async transcribe(audioPath, language = null) {
    const hasWhisper = await this.checkWhisper();
    if (!hasWhisper) {
      throw new Error('Whisper not found. Install with: pip install openai-whisper');
    }
    
    const langFlag = language ? `--language ${language}` : '';
    const outputDir = require('path').dirname(audioPath);
    
    return new Promise((resolve, reject) => {
      const cmd = `whisper "${audioPath}" --model ${this.model} --output_format json --output_dir "${outputDir}" ${langFlag}`;
      
      exec(cmd, { timeout: 300000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Transcription failed: ${stderr || error.message}`));
          return;
        }
        
        // Find the output JSON file
        const baseName = require('path').basename(audioPath, require('path').extname(audioPath));
        const jsonPath = require('path').join(outputDir, `${baseName}.json`);
        
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
          // Fallback to stdout
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
