export interface GeminiModelInfo {
  id: string;
  displayName: string;
  inputTokenLimit: number;
  // Pricing per million tokens (paid tier)
  inputPricePerM: number;       // text/image/video
  audioInputPricePerM: number;  // audio
  outputPricePerM: number;
  deprecated?: boolean;
}

// Pricing from https://ai.google.dev/gemini-api/docs/pricing (as of 2026-04)
// Models not listed here will use a fallback estimate
const KNOWN_PRICING: Record<string, Omit<GeminiModelInfo, 'id' | 'displayName' | 'inputTokenLimit'>> = {
  'gemini-2.5-flash': {
    inputPricePerM: 0.30,
    audioInputPricePerM: 1.00,
    outputPricePerM: 2.50,
  },
  'gemini-2.5-pro': {
    inputPricePerM: 1.25,
    audioInputPricePerM: 1.25,
    outputPricePerM: 10.00,
  },
  'gemini-2.0-flash': {
    inputPricePerM: 0.10,
    audioInputPricePerM: 0.70,
    outputPricePerM: 0.40,
    deprecated: true,
  },
  'gemini-2.0-flash-001': {
    inputPricePerM: 0.10,
    audioInputPricePerM: 0.70,
    outputPricePerM: 0.40,
    deprecated: true,
  },
  'gemini-2.0-flash-lite': {
    inputPricePerM: 0.075,
    audioInputPricePerM: 0.075,
    outputPricePerM: 0.30,
    deprecated: true,
  },
  'gemini-2.0-flash-lite-001': {
    inputPricePerM: 0.075,
    audioInputPricePerM: 0.075,
    outputPricePerM: 0.30,
    deprecated: true,
  },
  'gemini-2.5-flash-lite': {
    inputPricePerM: 0.10,
    audioInputPricePerM: 0.30,
    outputPricePerM: 0.40,
  },
  'gemini-3-flash-preview': {
    inputPricePerM: 0.50,
    audioInputPricePerM: 1.00,
    outputPricePerM: 3.00,
  },
  'gemini-3-pro-preview': {
    inputPricePerM: 1.25,
    audioInputPricePerM: 1.25,
    outputPricePerM: 10.00,
  },
  'gemini-3.1-pro-preview': {
    inputPricePerM: 2.00,
    audioInputPricePerM: 2.00,
    outputPricePerM: 12.00,
  },
};

const FALLBACK_PRICING: Omit<GeminiModelInfo, 'id' | 'displayName' | 'inputTokenLimit'> = {
  inputPricePerM: 0.30,
  audioInputPricePerM: 1.00,
  outputPricePerM: 2.50,
};

// Gemini models suitable for video/audio analysis
const ELIGIBLE_PREFIXES = ['gemini-2.5', 'gemini-2.0', 'gemini-3', 'gemini-flash', 'gemini-pro'];
const EXCLUDED_SUFFIXES = ['tts', 'image', 'customtools'];

export async function fetchAvailableModels(apiKey: string): Promise<GeminiModelInfo[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) return [];

  const data = await res.json();
  const models: GeminiModelInfo[] = [];

  for (const m of data.models || []) {
    const methods: string[] = m.supportedGenerationMethods || [];
    if (!methods.includes('generateContent')) continue;

    const id = (m.name as string).replace('models/', '');
    const isEligible = ELIGIBLE_PREFIXES.some(p => id.startsWith(p));
    const isExcluded = EXCLUDED_SUFFIXES.some(s => id.endsWith(s));
    if (!isEligible || isExcluded) continue;

    const pricing = KNOWN_PRICING[id] || FALLBACK_PRICING;

    models.push({
      id,
      displayName: m.displayName || id,
      inputTokenLimit: m.inputTokenLimit || 1048576,
      ...pricing,
    });
  }

  // Sort: non-deprecated first, then by price ascending
  models.sort((a, b) => {
    if (a.deprecated && !b.deprecated) return 1;
    if (!a.deprecated && b.deprecated) return -1;
    return a.inputPricePerM - b.inputPricePerM;
  });

  return models;
}
