import { NextRequest, NextResponse } from 'next/server';
import { FFmpegProcessor } from '@/lib/ffmpeg-utils';
import { GeminiClient } from '@/lib/gemini-client';

// Server-side route for future paid tier.
// Currently the client-side flow (client-analyzer.ts) is the primary path.

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
        { error: 'Missing API key.' },
        { status: 400 }
      );
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const geminiClient = new GeminiClient(geminiApiKey);

    console.log('Extracting frames...');
    const frames = await FFmpegProcessor.extractFrames(videoBuffer);
    console.log(`Extracted ${frames.length} frames`);

    // TODO: Add server-side AssemblyAI transcription for paid tier
    const transcript = '[No audio track found]';

    console.log('Analyzing with Gemini...');
    const analysis = await geminiClient.analyzeVideo(
      frames.slice(0, 20),
      transcript,
      userPrompt || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        frames: frames.length,
        description: analysis.description,
        recommendedCuts: analysis.cuts,
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
