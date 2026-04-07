import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { GeminiClient } from './gemini-client';
import { VideoFrame, CutRecommendation } from './types';
import { transcribeAudio, type TranscriptResult } from './client-transcriber';
import type { AnalysisConfig } from '@/components/AnalysisOptions';

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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractFrames(ffmpeg: FFmpeg, inputName: string, fps: number, quality: string): Promise<VideoFrame[]> {
  const qValue = quality === 'low' ? '10' : quality === 'high' ? '3' : '5';
  const scale = quality === 'low' ? ',scale=384:-1' : '';
  const framesPattern = 'frame-%04d.png';

  await ffmpeg.exec([
    '-i', inputName,
    '-vf', `fps=${fps}${scale}`,
    '-q:v', qValue,
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
        timestamp: (i - 1) / fps,
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
    return data.length > 44 ? data : null;
  } catch {
    return null;
  }
}

export interface AnalyzeProgress {
  stage: 'loading' | 'extracting' | 'transcribing' | 'analyzing' | 'complete' | 'error';
  message: string;
  progress: number;
}

export class AnalysisCancelledError extends Error {
  constructor() { super('Analysis cancelled'); this.name = 'AnalysisCancelledError'; }
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new AnalysisCancelledError();
}

export async function analyzeVideoClientSide(
  file: File,
  geminiKey: string,
  assemblyKey: string,
  config: AnalysisConfig,
  userPrompt?: string,
  onProgress?: (p: AnalyzeProgress) => void,
  signal?: AbortSignal,
): Promise<{ description: string; cuts: CutRecommendation[]; transcript: TranscriptResult | null; frameCount: number }> {
  const report = (stage: AnalyzeProgress['stage'], message: string, progress: number) =>
    onProgress?.({ stage, message, progress });

  // Step 1: Load ffmpeg
  report('loading', 'Loading video processor...', 5);
  const ffmpeg = await getFFmpeg();
  checkAbort(signal);

  // Step 2: Extract frames and audio
  report('extracting', 'Extracting frames and audio...', 10);
  const inputName = `input-${Date.now()}.mp4`;
  const fileData = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, fileData);

  const [frames, audioData] = await Promise.all([
    extractFrames(ffmpeg, inputName, config.fps, config.quality),
    extractAudio(ffmpeg, inputName),
  ]);

  await ffmpeg.deleteFile(inputName);
  checkAbort(signal);

  // Step 3: Transcribe audio with AssemblyAI (word-level timestamps)
  let transcript: TranscriptResult | null = null;
  let transcriptText = '[No audio track found]';

  if (audioData) {
    report('transcribing', 'Transcribing audio with AssemblyAI...', 30);
    transcript = await transcribeAudio(
      assemblyKey,
      audioData,
      (msg) => report('transcribing', msg, 40),
    );
    transcriptText = transcript.formatted;
  }
  checkAbort(signal);

  // Step 4: Analyze with Gemini (frames + transcript text)
  report('analyzing', `Analyzing ${frames.length} frames with Gemini...`, 60);
  const client = new GeminiClient(geminiKey, config.modelId);
  const result = await client.analyzeVideo(
    frames,
    transcriptText,
    userPrompt,
  );
  checkAbort(signal);

  report('complete', 'Analysis complete!', 100);
  return { ...result, transcript, frameCount: frames.length };
}
