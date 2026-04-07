import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini-client';

export async function GET(request: NextRequest) {
  const result = { gemini: { status: 'unknown', error: null as string | null } };

  try {
    const geminiApiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const geminiClient = new GeminiClient(geminiApiKey);
      const testFrames = [{
        timestamp: 0,
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }];
      await geminiClient.analyzeVideo(testFrames, null, 'Test prompt');
      result.gemini.status = 'connected';
    } else {
      result.gemini.status = 'no-key';
    }
  } catch (error) {
    result.gemini.status = 'error';
    result.gemini.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(result);
}
