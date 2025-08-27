import ffmpeg from 'fluent-ffmpeg';
import { VideoFrame } from './types';
import * as fs from "fs"

export class FFmpegProcessor {
  private static FRAMERATE = 10; // 10 frames per second (every 0.1 seconds)

  static async extractFrames(videoBuffer: Buffer): Promise<VideoFrame[]> {
    return new Promise((resolve, reject) => {
      const frames: VideoFrame[] = [];
      const tempVideoPath = `/tmp/video-${Date.now()}.mp4`;
      const tempFramesDir = `/tmp/frames-${Date.now()}`;

      // Write video buffer to temporary file
      fs.writeFileSync(tempVideoPath, videoBuffer);
      fs.mkdirSync(tempFramesDir, { recursive: true });

      ffmpeg(tempVideoPath)
        .outputOptions([
          `-vf fps=${this.FRAMERATE}`,
          '-q:v 2' // High quality
        ])
        .output(`${tempFramesDir}/frame-%04d.png`)
        .on('end', () => {
          try {
            const frameFiles = fs.readdirSync(tempFramesDir)
              .filter((file: string) => file.endsWith('.png'))
              .sort();

            frameFiles.forEach((file: string, index: number) => {
              const timestamp = index / this.FRAMERATE;
              const imageBuffer = fs.readFileSync(`${tempFramesDir}/${file}`);
              const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
              
              frames.push({
                timestamp,
                imageUrl
              });
            });

            // Cleanup
            fs.rmSync(tempVideoPath);
            fs.rmSync(tempFramesDir, { recursive: true });

            resolve(frames);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        })
        .run();
    });
  }

  static async extractAudio(videoBuffer: Buffer): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      const tempVideoPath = `/tmp/video-${Date.now()}.mp4`;
      const tempAudioPath = `/tmp/audio-${Date.now()}.wav`;

      // Write video buffer to temporary file
      fs.writeFileSync(tempVideoPath, videoBuffer);

      // First, check if video has audio stream
      ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
        if (err) {
          fs.rmSync(tempVideoPath);
          reject(err);
          return;
        }

        // Check for audio streams
        const audioStreams = metadata.streams?.filter(stream => stream.codec_type === 'audio') || [];
        
        if (audioStreams.length === 0) {
          console.log('No audio stream found in video, skipping audio extraction');
          fs.rmSync(tempVideoPath);
          resolve(null); // Return null for videos without audio
          return;
        }

        // Video has audio, proceed with extraction
        ffmpeg(tempVideoPath)
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .output(tempAudioPath)
          .on('end', () => {
            try {
              const audioBuffer = fs.readFileSync(tempAudioPath);
              
              // Cleanup
              fs.rmSync(tempVideoPath);
              fs.rmSync(tempAudioPath);
              
              resolve(audioBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            // Cleanup on error
            try {
              fs.rmSync(tempVideoPath);
              if (fs.existsSync(tempAudioPath)) {
                fs.rmSync(tempAudioPath);
              }
            } catch (cleanupError) {
              console.error('Cleanup error:', cleanupError);
            }
            
            // If it's an audio-related error, return null instead of rejecting
            if (error.message.includes('No audio') || 
                error.message.includes('Error opening output file') ||
                error.message.includes('Invalid argument')) {
              console.log('Audio extraction failed (likely no audio track), continuing without audio');
              resolve(null);
            } else {
              reject(error);
            }
          })
          .run();
      });
    });
  }

  static async getVideoDuration(videoBuffer: Buffer): Promise<number> {
    return new Promise((resolve, reject) => {
      const tempVideoPath = `/tmp/video-${Date.now()}.mp4`;
      fs.writeFileSync(tempVideoPath, videoBuffer);

      ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
        fs.rmSync(tempVideoPath);
        
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(duration);
        }
      });
    });
  }
}