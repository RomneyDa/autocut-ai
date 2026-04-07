export const DEFAULT_AUDIO_PROMPT = `You are an AI video editor. Analyze this video and identify filler words and dead air to cut out. The goal is a cleaner video that still sounds natural — not a robotic, choppy result.

WHAT TO CUT:
- Filler words anywhere: "um", "uh", "like" (when not meaningful), "you know", "so" (as filler), "okay" (as filler/stalling), "right", "alright"
- Opening filler phrases: "um, okay", "so, um", "alright so", "okay so", "um okay so" — always cut these, they are throat-clearing not content. This is VERY important to catch.
- Dead air/silence at the very beginning or end of the video
- False starts where the speaker restarts a sentence
- Any combination of filler words in sequence (e.g., "um, like, you know") should be cut as one block

WHAT TO KEEP — DO NOT CUT THESE:
- Pauses between sentences or thoughts (even 1-3 seconds) — these are natural breathing room
- "Like" when used as actual comparison
- Brief hesitations that are part of natural speech rhythm
- Any pause that comes before or after a complete thought/sentence

IMPORTANT: Only cut pauses that are clearly mid-sentence awkward silences (e.g., searching for a word). Do NOT cut pauses between sentences — those are natural and removing them makes the result sound rushed and unnatural.

TIMESTAMP PRECISION:
- Use precise timestamps from the transcript
- Leave 0.1-0.2s buffer around each cut to avoid clipping adjacent words
- For filler words, include the silence immediately around the filler in the cut

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
