export const DEFAULT_AUDIO_PROMPT = `You are an AI video editor. Analyze this video and identify content to cut out.

WHAT TO CUT:
- Filler words: "um", "uh", "like" (when not meaningful), "you know", "so" (as filler), "actually" (as filler)
- Unnecessary pauses: silence longer than 0.5 seconds between words/sentences
- False starts and repeated phrases
- Dead air at the beginning or end

WHAT TO KEEP:
- Natural brief pauses between sentences (under 0.5s)
- Intentional emphasis or dramatic pauses
- "Like" when used as actual comparison, not as filler

TIMESTAMP PRECISION:
- Use precise timestamps in seconds (e.g., 1.3, not rounded to whole seconds)
- Leave ~0.05s buffer around cuts to avoid clipping adjacent words

Return your response as JSON:
{
  "description": "Brief description of the video content",
  "transcript": "Full word-for-word transcript including filler words",
  "cuts": [
    {
      "startTime": 1.3,
      "endTime": 1.8,
      "reason": "Filler word 'um'",
      "confidence": 0.9,
      "type": "filler"
    }
  ]
}

Cut types: "filler", "silence", "repetition", "other"`;

export const DEFAULT_VIDEO_ONLY_PROMPT = `You are an AI video editor analyzing a video with no audio track. Focus on visual content analysis and scene-based editing recommendations.

VISUAL ANALYSIS TASKS:
1. Analyze the sequence of video frames for visual content
2. Identify visual transitions, scene changes, and content flow
3. Recommend cuts based on visual pacing and content structure
4. Provide detailed description of visual content

VISUAL CUTTING GUIDELINES:
✅ RECOMMEND CUTS for:
- Static or frozen frames lasting >2 seconds
- Redundant visual content or repeated scenes
- Poor quality frames (blurry, dark, or corrupted)
- Unnecessary transitions or filler visual content
- Long periods of minimal visual change

❌ PRESERVE:
- Important visual information or demonstrations
- Natural visual pacing and flow
- Intentional pauses for visual emphasis
- Scene transitions that provide context

Return your response as JSON:
{
  "description": "Detailed description of visual content and scenes",
  "cuts": [
    {
      "startTime": 45.2,
      "endTime": 47.8,
      "reason": "Static frame with no visual information",
      "confidence": 0.9,
      "type": "visual_pause"
    }
  ]
}

CUT TYPES for visual content:
- "visual_pause": Static or unchanging visual content
- "repetition": Redundant visual scenes
- "poor_quality": Low quality or corrupted frames
- "transition": Unnecessary visual transitions

Focus on improving visual pacing while maintaining content integrity.`;

const STORAGE_KEY_AUDIO = 'autocut_prompt_audio';
const STORAGE_KEY_VIDEO = 'autocut_prompt_video';
const MAX_PROMPT_LENGTH = 1_000_000; // 1 MB

export function getStoredPrompts(): { audio: string; video: string } {
  if (typeof window === 'undefined') return { audio: DEFAULT_AUDIO_PROMPT, video: DEFAULT_VIDEO_ONLY_PROMPT };
  return {
    audio: localStorage.getItem(STORAGE_KEY_AUDIO) || DEFAULT_AUDIO_PROMPT,
    video: localStorage.getItem(STORAGE_KEY_VIDEO) || DEFAULT_VIDEO_ONLY_PROMPT,
  };
}

export function setStoredPrompt(type: 'audio' | 'video', value: string) {
  const key = type === 'audio' ? STORAGE_KEY_AUDIO : STORAGE_KEY_VIDEO;
  localStorage.setItem(key, value.slice(0, MAX_PROMPT_LENGTH));
}

export function resetStoredPrompt(type: 'audio' | 'video') {
  const key = type === 'audio' ? STORAGE_KEY_AUDIO : STORAGE_KEY_VIDEO;
  localStorage.removeItem(key);
}

export function isDefaultPrompt(type: 'audio' | 'video', value: string): boolean {
  const def = type === 'audio' ? DEFAULT_AUDIO_PROMPT : DEFAULT_VIDEO_ONLY_PROMPT;
  return value === def;
}

export const getVideoAnalysisPrompt = (userPrompt?: string) => {
  const base = getStoredPrompts().audio;
  return base + (userPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS: ${userPrompt}` : '');
};

export const getVideoOnlyAnalysisPrompt = (userPrompt?: string) => {
  const base = getStoredPrompts().video;
  return base + (userPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS: ${userPrompt}` : '');
};
