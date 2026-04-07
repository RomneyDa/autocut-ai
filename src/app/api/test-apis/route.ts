import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const result = { gemini: { status: 'unknown', error: null as string | null } };

  try {
    const apiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;
    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (res.ok) {
        result.gemini.status = 'connected';
      } else {
        result.gemini.status = 'error';
        const data = await res.json();
        result.gemini.error = data.error?.message || 'Invalid API key';
      }
    } else {
      result.gemini.status = 'no-key';
    }
  } catch (error) {
    result.gemini.status = 'error';
    result.gemini.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(result);
}
