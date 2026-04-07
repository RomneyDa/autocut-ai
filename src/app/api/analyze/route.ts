import { NextRequest, NextResponse } from 'next/server';
import { FFmpegProcessor } from '@/lib/ffmpeg-utils';
import { GeminiClient } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const userPrompt = formData.get('prompt') as string | null;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const geminiApiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Missing API key. Please enter your Gemini API key above.' },
        { status: 400 }
      );
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const geminiClient = new GeminiClient(geminiApiKey);

    // Extract frames and audio in parallel
    console.log('Extracting frames and audio...');
    const [frames, audioBuffer] = await Promise.all([
      FFmpegProcessor.extractFrames(videoBuffer),
      FFmpegProcessor.extractAudio(videoBuffer)
    ]);

    console.log(`Extracted ${frames.length} frames, audio: ${audioBuffer ? 'yes' : 'no'}`);

    // Send frames + audio directly to Gemini
    console.log('Analyzing with Gemini...');
    const analysis = await geminiClient.analyzeVideo(
      frames.slice(0, 20),
      audioBuffer,
      userPrompt || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        frames: frames.length,
        description: analysis.description,
        recommendedCuts: analysis.cuts,
        transcript: analysis.transcript,
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
