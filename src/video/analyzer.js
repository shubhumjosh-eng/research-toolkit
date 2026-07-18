const downloader = require('./downloader');
const transcriber = require('./transcriber');
const videoExtractor = require('../scraping/videoExtractor');

class VideoAnalyzer {
  async analyze(url, options = {}) {
    const { transcribe = true, download = false } = options;
    
    console.log('Extracting video information...');
    const info = await videoExtractor.extractFromUrl(url);
    
    let downloadedFile = null;
    let transcription = null;
    
    if (download) {
      console.log('Downloading video...');
      downloadedFile = await downloader.download(url);
      
      if (transcribe) {
        console.log('Transcribing video...');
        try {
          transcription = await transcriber.transcribeVideo(downloadedFile.filePath);
        } catch (error) {
          console.error('Transcription failed:', error.message);
        }
      }
    }
    
    return {
      ...info,
      transcription,
      analyzedAt: new Date().toISOString(),
    };
  }

  async analyzeMultiple(urls, options = {}) {
    const results = [];
    for (const url of urls) {
      try {
        const result = await this.analyze(url, options);
        results.push(result);
      } catch (error) {
        results.push({ url, error: error.message });
      }
    }
    return results;
  }
}

module.exports = new VideoAnalyzer();
