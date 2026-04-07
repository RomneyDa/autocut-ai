// Client-side AssemblyAI transcription (CORS-enabled, no server proxy needed)

export interface TranscriptWord {
  text: string;
  start: number; // milliseconds
  end: number;   // milliseconds
  confidence: number;
}

export interface TranscriptResult {
  text: string;
  words: TranscriptWord[];
  formatted: string; // timestamped text for Gemini
}

async function uploadAudio(apiKey: string, audioData: Uint8Array): Promise<string> {
  const res = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/octet-stream',
    },
    body: audioData as unknown as BodyInit,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  return data.upload_url;
}

async function createTranscript(apiKey: string, audioUrl: string): Promise<string> {
  const res = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      word_boost: ['um', 'uh', 'like', 'you know', 'so', 'okay', 'actually'],
      disfluencies: true,
      punctuate: true,
      format_text: true,
    }),
  });

  if (!res.ok) throw new Error(`Transcription request failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function pollTranscript(apiKey: string, transcriptId: string, signal?: AbortSignal): Promise<{ text: string; words: TranscriptWord[] }> {
  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const res = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
      signal,
    });

    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const data = await res.json();

    if (data.status === 'completed') {
      return {
        text: data.text || '',
        words: (data.words || []).map((w: { text: string; start: number; end: number; confidence: number }) => ({
          text: w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
      };
    }

    if (data.status === 'error') {
      throw new Error(`Transcription failed: ${data.error}`);
    }

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 1000);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
  }
}

function formatTranscriptForGemini(words: TranscriptWord[]): string {
  return words
    .map(w => `[${(w.start / 1000).toFixed(3)}s - ${(w.end / 1000).toFixed(3)}s] "${w.text}"`)
    .join('\n');
}

export async function transcribeAudio(
  apiKey: string,
  audioData: Uint8Array,
  onStatus?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<TranscriptResult> {
  onStatus?.('Uploading audio to AssemblyAI...');
  const audioUrl = await uploadAudio(apiKey, audioData);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  onStatus?.('Transcribing with AssemblyAI...');
  const transcriptId = await createTranscript(apiKey, audioUrl);

  onStatus?.('Transcribing with AssemblyAI...');
  const result = await pollTranscript(apiKey, transcriptId, signal);

  return {
    text: result.text,
    words: result.words,
    formatted: formatTranscriptForGemini(result.words),
  };
}
