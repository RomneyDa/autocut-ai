import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { GeminiClient } from './gemini-client';
import { VideoFrame, CutRecommendation } from './types';

const FRAMERATE = 2; // 2 fps for analysis (less tokens than 10)

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpegInstance;
}

async function extractFrames(ffmpeg: FFmpeg, inputName: string): Promise<VideoFrame[]> {
  const framesPattern = 'frame-%04d.png';

  await ffmpeg.exec([
    '-i', inputName,
    '-vf', `fps=${FRAMERATE}`,
    '-q:v', '5', // lower quality for smaller base64, fine for analysis
    framesPattern
  ]);

  const frames: VideoFrame[] = [];
  for (let i = 1; ; i++) {
    const name = `frame-${String(i).padStart(4, '0')}.png`;
    try {
      const data = await ffmpeg.readFile(name) as Uint8Array;
      if (data.length === 0) break;
      const base64 = uint8ArrayToBase64(data);
      frames.push({
        timestamp: (i - 1) / FRAMERATE,
        imageUrl: `data:image/png;base64,${base64}`,
      });
      await ffmpeg.deleteFile(name);
    } catch {
      break;
    }
  }

  return frames;
}

async function extractAudio(ffmpeg: FFmpeg, inputName: string): Promise<Uint8Array | null> {
  const outputName = 'audio.wav';

  try {
    await ffmpeg.exec([
      '-i', inputName,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ac', '1',
      '-ar', '16000',
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName) as Uint8Array;
    await ffmpeg.deleteFile(outputName);
    return data.length > 44 ? data : null; // WAV header is 44 bytes
  } catch {
    return null;
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface AnalyzeProgress {
  stage: 'loading' | 'extracting' | 'analyzing' | 'complete' | 'error';
  message: string;
  progress: number;
}

export async function analyzeVideoClientSide(
  file: File,
  apiKey: string,
  userPrompt?: string,
  onProgress?: (p: AnalyzeProgress) => void,
): Promise<{ description: string; cuts: CutRecommendation[]; transcript: string; frameCount: number }> {
  const report = (stage: AnalyzeProgress['stage'], message: string, progress: number) =>
    onProgress?.({ stage, message, progress });

  report('loading', 'Loading video processor...', 5);
  const ffmpeg = await getFFmpeg();

  report('extracting', 'Extracting frames and audio...', 15);
  const inputName = `input-${Date.now()}.mp4`;
  const fileData = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, fileData);

  const [frames, audioData] = await Promise.all([
    extractFrames(ffmpeg, inputName),
    extractAudio(ffmpeg, inputName),
  ]);

  await ffmpeg.deleteFile(inputName);

  report('analyzing', `Analyzing ${frames.length} frames with Gemini...`, 50);
  const client = new GeminiClient(apiKey);
  const result = await client.analyzeVideo(
    frames.slice(0, 30), // cap frames sent to Gemini
    audioData,
    userPrompt,
  );

  report('complete', 'Analysis complete!', 100);
  return { ...result, frameCount: frames.length };
}
