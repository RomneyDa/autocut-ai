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
  let maxProgress = 0;
  const activeIntervals: ReturnType<typeof setInterval>[] = [];
  const report = (stage: AnalyzeProgress['stage'], message: string, progress: number) => {
    if (signal?.aborted) return;
    maxProgress = Math.max(maxProgress, progress);
    onProgress?.({ stage, message, progress: maxProgress });
  };
  const startInterval = (fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    activeIntervals.push(id);
    return id;
  };
  const clearAllIntervals = () => activeIntervals.forEach(id => clearInterval(id));
  signal?.addEventListener('abort', clearAllIntervals, { once: true });

  // Progress budget: loading 0-3%, extraction 3-30%, transcription 30-55%, gemini 55-99%

  // Step 1: Load ffmpeg
  report('loading', 'Loading video processor...', 1);
  const ffmpeg = await getFFmpeg();
  report('loading', 'Video processor ready', 3);
  checkAbort(signal);

  // Step 2: Extract frames and audio
  // Estimate extraction time based on video size (~1s per MB for WASM ffmpeg)
  const fileSizeMB = file.size / (1024 * 1024);
  const estExtractionSec = Math.max(fileSizeMB * 1.5, 5);
  report('extracting', 'Extracting frames and audio...', 3);

  const extractStart = Date.now();
  const extractInterval = startInterval(() => {
    const elapsed = (Date.now() - extractStart) / 1000;
    const pct = Math.min(29, 3 + (elapsed / estExtractionSec) * 27);
    report('extracting', 'Extracting frames and audio...', Math.round(pct));
  }, 500);

  const inputName = `input-${Date.now()}.mp4`;
  const fileData = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, fileData);

  const [frames, audioData] = await Promise.all([
    extractFrames(ffmpeg, inputName, config.fps, config.quality),
    extractAudio(ffmpeg, inputName),
  ]);

  clearInterval(extractInterval);
  await ffmpeg.deleteFile(inputName);
  report('extracting', `Extracted ${frames.length} frames`, 30);
  checkAbort(signal);

  // Step 3: Transcribe audio with AssemblyAI
  let transcript: TranscriptResult | null = null;
  let transcriptText = '[No audio track found]';

  if (audioData) {
    report('transcribing', 'Uploading audio to AssemblyAI...', 31);

    const transcribeStart = Date.now();
    const transcribeInterval = startInterval(() => {
      const elapsed = (Date.now() - transcribeStart) / 1000;
      // Transcription usually takes 5-15s, estimate accordingly
      const pct = Math.min(54, 31 + (elapsed / 15) * 24);
      report('transcribing', 'Transcribing with AssemblyAI...', Math.round(pct));
    }, 500);

    transcript = await transcribeAudio(
      assemblyKey,
      audioData,
      (msg) => report('transcribing', msg, 45),
      signal,
    );
    clearInterval(transcribeInterval);
    transcriptText = transcript.formatted;
    report('transcribing', 'Transcription complete', 55);
  }
  checkAbort(signal);

  // Step 4: Analyze with Gemini
  const frameCount = frames.length;
  report('analyzing', `Analyzing ${frameCount} frames with Gemini...`, 55);

  const analyzeStart = Date.now();
  const estGeminiSec = Math.max(frameCount * 0.5, 10);
  const analyzeInterval = startInterval(() => {
    const elapsed = (Date.now() - analyzeStart) / 1000;
    const pct = Math.min(90, 55 + (elapsed / estGeminiSec) * 35);
    report('analyzing', `Analyzing ${frameCount} frames with Gemini...`, Math.round(pct));
  }, 500);

  const client = new GeminiClient(geminiKey, config.modelId);
  let result;
  try {
    result = await client.analyzeVideo(frames, transcriptText, userPrompt);
  } finally {
    clearInterval(analyzeInterval);
  }
  checkAbort(signal);

  report('complete', 'Analysis complete!', 100);
  return { ...result, transcript, frameCount: frames.length };
}
