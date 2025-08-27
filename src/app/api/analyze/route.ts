import { NextRequest, NextResponse } from 'next/server';
import { FFmpegProcessor } from '@/lib/ffmpeg-utils';
import { GeminiClient } from '@/lib/gemini-client';
import { AssemblyClient } from '@/lib/assembly-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const userPrompt = formData.get('prompt') as string | null;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Check for required API keys
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const assemblyApiKey = process.env.ASSEMBLY_API_KEY;

    if (!geminiApiKey || !assemblyApiKey) {
      return NextResponse.json(
        { error: 'Missing required API keys' },
        { status: 500 }
      );
    }

    // Convert video file to buffer
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    // Initialize clients
    const geminiClient = new GeminiClient(geminiApiKey);
    const assemblyClient = new AssemblyClient(assemblyApiKey);

    // Extract frames and audio in parallel
    console.log('Extracting frames and audio...');
    const [frames, audioBuffer] = await Promise.all([
      FFmpegProcessor.extractFrames(videoBuffer),
      FFmpegProcessor.extractAudio(videoBuffer)
    ]);

    console.log(`Extracted ${frames.length} frames`);

    let transcript = [];
    let transcriptText = '[No audio track found]';

    // Only transcribe if audio exists
    if (audioBuffer) {
      console.log('Transcribing audio with AssemblyAI...');
      transcript = await assemblyClient.transcribeAudioDirectly(audioBuffer);
      transcriptText = transcript
        .map(t => `[${t.timestamp.toFixed(1)}s] ${t.text}`)
        .join('\n');
    } else {
      console.log('No audio found, proceeding with video-only analysis');
    }
    
    console.log('Analyzing with Gemini...');
    const analysis = await geminiClient.analyzeVideo(
      frames.slice(0, 20), // Limit frames for demo to avoid token limits
      transcriptText,
      userPrompt || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        frames: frames.length,
        transcript: transcript.length,
        description: analysis.description,
        recommendedCuts: analysis.cuts,
        fullTranscript: transcript
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