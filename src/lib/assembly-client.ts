import { AssemblyAI } from 'assemblyai';
import { AudioTranscript, Word } from './types';

export class AssemblyClient {
  private client: AssemblyAI;

  constructor(apiKey: string) {
    this.client = new AssemblyAI({
      apiKey: apiKey
    });
  }

  async uploadAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const audioFile = await this.client.files.upload(audioBuffer);
      return audioFile;
    } catch (error) {
      console.error('Audio upload error:', error);
      throw new Error('Failed to upload audio to AssemblyAI');
    }
  }

  async transcribeAudio(audioUrl: string): Promise<AudioTranscript[]> {
    try {
      const transcript = await this.client.transcripts.transcribe({
        audio: audioUrl,
        word_boost: ['um', 'uh', 'like', 'you know', 'so', 'actually'],
        punctuate: true,
        format_text: true,
        speech_model: 'best'
      });

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Process words into our format with 0.1s intervals
      const words = transcript.words || [];
      const transcripts: AudioTranscript[] = [];
      
      if (words.length === 0) {
        return transcripts;
      }

      // Group words into 0.1 second intervals to match our framerate
      const INTERVAL = 0.1; // seconds
      let currentTime = 0;
      let currentWords: Word[] = [];

      words.forEach((word: Word) => {
        const wordStartTime = word.start / 1000; // Convert ms to seconds
        
        // If this word starts in the next interval, process current interval
        while (wordStartTime >= currentTime + INTERVAL) {
          if (currentWords.length > 0) {
            const text = currentWords.map(w => w.text).join(' ');
            const confidence = currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length;
            
            transcripts.push({
              timestamp: currentTime,
              text,
              confidence
            });
          }
          
          currentTime += INTERVAL;
          currentWords = [];
        }

        currentWords.push(word);
      });

      // Process any remaining words
      if (currentWords.length > 0) {
        const text = currentWords.map(w => w.text).join(' ');
        const confidence = currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length;
        
        transcripts.push({
          timestamp: currentTime,
          text,
          confidence
        });
      }

      return transcripts;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async transcribeAudioDirectly(audioBuffer: Buffer): Promise<AudioTranscript[]> {
    try {
      // Upload and transcribe in one go
      const transcript = await this.client.transcripts.transcribe({
        audio: audioBuffer,
        word_boost: ['um', 'uh', 'like', 'you know', 'so', 'actually'],
        punctuate: true,
        format_text: true,
        speech_model: 'best'
      });

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Process words into our format with 0.1s intervals
      const words = transcript.words || [];
      const transcripts: AudioTranscript[] = [];
      
      if (words.length === 0) {
        return transcripts;
      }

      // Group words into 0.1 second intervals to match our framerate
      const INTERVAL = 0.1; // seconds
      let currentTime = 0;
      let currentWords: Word[] = [];

      words.forEach((word: Word) => {
        const wordStartTime = word.start / 1000; // Convert ms to seconds
        
        // If this word starts in the next interval, process current interval
        while (wordStartTime >= currentTime + INTERVAL) {
          if (currentWords.length > 0) {
            const text = currentWords.map(w => w.text).join(' ');
            const confidence = currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length;
            
            transcripts.push({
              timestamp: currentTime,
              text,
              confidence
            });
          }
          
          currentTime += INTERVAL;
          currentWords = [];
        }

        currentWords.push(word);
      });

      // Process any remaining words
      if (currentWords.length > 0) {
        const text = currentWords.map(w => w.text).join(' ');
        const confidence = currentWords.reduce((sum, w) => sum + w.confidence, 0) / currentWords.length;
        
        transcripts.push({
          timestamp: currentTime,
          text,
          confidence
        });
      }

      return transcripts;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
}