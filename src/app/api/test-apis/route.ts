import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  const result = { gemini: { status: 'unknown', error: null as string | null } };

  try {
    const apiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      await model.generateContent('Reply with "ok"');
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
