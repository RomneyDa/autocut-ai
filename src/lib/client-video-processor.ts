import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export class ClientVideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    this.ffmpeg = new FFmpeg();
    
    // Load FFmpeg wasm files from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.initialized = true;
  }

  async compressVideo(
    file: File, 
    options: {
      quality?: 'low' | 'medium' | 'high';
      maxSizeMB?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<File> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const { quality = 'medium', maxSizeMB = 50, onProgress } = options;

    // Quality presets
    const qualitySettings = {
      low: { crf: 28, scale: '720:-1', bitrate: '500k' },
      medium: { crf: 23, scale: '1080:-1', bitrate: '1000k' },
      high: { crf: 18, scale: '1920:-1', bitrate: '2000k' }
    };

    const settings = qualitySettings[quality];
    // Use original extension for input to preserve format compatibility
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const inputName = `input.${fileExtension}`;
    const outputName = 'output.mp4';

    try {
      // Convert file to Uint8Array for FFmpeg
      const fileData = new Uint8Array(await file.arrayBuffer());
      await this.ffmpeg.writeFile(inputName, fileData);

      // Set up progress monitoring
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }

      // Compression command
      await this.ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-crf', settings.crf.toString(),
        '-vf', `scale=${settings.scale}`,
        '-b:v', settings.bitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-preset', 'fast',
        '-movflags', '+faststart',
        outputName
      ]);

      // Read output file
      const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
      const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });

      // Check if we need further compression
      const compressedSizeMB = compressedBlob.size / (1024 * 1024);
      
      if (compressedSizeMB > maxSizeMB && quality !== 'low') {
        console.log(`File still ${compressedSizeMB.toFixed(1)}MB, trying lower quality...`);
        return this.compressVideo(new File([compressedBlob], file.name), { 
          ...options, 
          quality: quality === 'high' ? 'medium' : 'low' 
        });
      }

      // Cleanup
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.mp4'), {
        type: 'video/mp4',
        lastModified: file.lastModified
      });

    } catch (error) {
      console.error('Video compression error:', error);
      throw new Error('Failed to compress video');
    }
  }

  async getVideoInfo(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    sizeMB: number;
    bitrate?: number;
  }> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const inputName = 'probe.mp4';
    
    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      await this.ffmpeg.writeFile(inputName, fileData);
      
      // Get video info using ffprobe-like functionality
      await this.ffmpeg.exec([
        '-i', inputName,
        '-f', 'null',
        '-'
      ]);

      // Note: In browser FFmpeg, we can't easily get detailed probe info
      // This is a simplified version - in practice you might need to parse logs
      
      await this.ffmpeg.deleteFile(inputName);
      
      return {
        duration: 0, // Would need to parse from logs
        width: 0,
        height: 0,
        sizeMB: file.size / (1024 * 1024),
      };
    } catch (error) {
      console.error('Video info error:', error);
      throw new Error('Failed to get video info');
    }
  }

  async extractThumbnail(file: File, timeSeconds: number = 1): Promise<string> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const inputName = 'input.mp4';
    const outputName = 'thumb.jpg';

    try {
      await this.ffmpeg.writeFile(inputName, await file.arrayBuffer());
      
      await this.ffmpeg.exec([
        '-i', inputName,
        '-ss', timeSeconds.toString(),
        '-frames:v', '1',
        '-q:v', '2',
        outputName
      ]);

      const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
      const blob = new Blob([data.buffer], { type: 'image/jpeg' });
      
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Thumbnail extraction error:', error);
      throw new Error('Failed to extract thumbnail');
    }
  }

  cleanup() {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.initialized = false;
    }
  }
}

// Singleton instance
let clientProcessor: ClientVideoProcessor | null = null;

export const getClientVideoProcessor = async (): Promise<ClientVideoProcessor> => {
  if (!clientProcessor) {
    clientProcessor = new ClientVideoProcessor();
    await clientProcessor.initialize();
  }
  return clientProcessor;
};