import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini-client';
import { AssemblyClient } from '@/lib/assembly-client';

export async function GET(request: NextRequest) {
  const results = {
    gemini: { status: 'unknown', error: null as string | null },
    assembly: { status: 'unknown', error: null as string | null },
  };

  // Test Gemini API
  try {
    const geminiApiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const geminiClient = new GeminiClient(geminiApiKey);
      // Simple test - analyze a basic prompt
      const testFrames = [{
        timestamp: 0,
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }];
      const analysis = await geminiClient.analyzeVideo(testFrames, 'Hello world', 'Test prompt');
      results.gemini.status = 'connected';
    } else {
      results.gemini.status = 'no-key';
    }
  } catch (error) {
    results.gemini.status = 'error';
    results.gemini.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test AssemblyAI API
  try {
    const assemblyApiKey = request.headers.get('x-assembly-api-key') || process.env.ASSEMBLY_API_KEY;
    if (assemblyApiKey) {
      const assemblyClient = new AssemblyClient(assemblyApiKey);
      // Create a minimal WAV file (44 byte header + 1000 bytes of silent audio)
      const testBuffer = Buffer.from([
        // WAV header
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0xDC, 0x03, 0x00, 0x00, // File size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Format chunk size
        0x01, 0x00,             // PCM format
        0x01, 0x00,             // Mono
        0x44, 0xAC, 0x00, 0x00, // 44100 Hz
        0x88, 0x58, 0x01, 0x00, // Byte rate
        0x02, 0x00,             // Block align
        0x10, 0x00,             // 16 bits per sample
        0x64, 0x61, 0x74, 0x61, // "data"
        0xE8, 0x03, 0x00, 0x00, // Data chunk size (1000 bytes)
        ...new Array(1000).fill(0) // Silent audio data
      ]);
      // const uploadUrl = await assemblyClient.uploadAudio(testBuffer);
      const url = "https://assembly.ai/wildfires.mp3"
      await assemblyClient.transcribeAudio(url)
      results.assembly.status = 'connected'
    } else {
      results.assembly.status = 'no-key';
    }
  } catch (error) {
    results.assembly.status = 'error';
    results.assembly.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(results);
}