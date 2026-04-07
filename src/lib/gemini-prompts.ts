export const DEFAULT_AUDIO_PROMPT = `You are an AI video editor. Analyze this video and aggressively identify filler words, interjections, and dead air to cut out. Err on the side of cutting — the user can uncheck any cut they want to keep.

CRITICAL — OPENING FILLERS:
The words "oh", "um", "uh", "ah" at the start of speech are pure filler. Cut ONLY those specific words, not the words after them. Words like "okay", "so", "alright" can serve as natural openers and should be KEPT.

Examples — cut ONLY the bolded words:
- "**Oh, um,** okay, so cats..." → cut ends before "okay"
- "**Um,** alright, so today..." → cut ends before "alright"
- "**Uh,** okay so..." → cut ends before "okay"
- "**Oh, um, uh,** so like..." → cut ends before "so"

Do NOT cut "okay", "so", "alright", "right" at the start — they make natural intros.

WHAT TO CUT (be aggressive — when in doubt, cut it):
- Filler words ANYWHERE: "um", "uh", "like" (not as comparison), "you know", "so" (as filler), "okay" (as filler), "oh", "ah", "well" (as filler), "right", "alright"
- Sequences of fillers — cut as ONE block spanning from the first filler's start to the last filler's end
- Dead air/silence at the beginning or end of the video
- False starts where the speaker restarts a sentence
- Mid-sentence pauses longer than 0.8 seconds
- Repeated words ("much, much" → keep one)

WHAT TO KEEP:
- Pauses between sentences (0.3-2s) — natural breathing room
- "Like" when used as actual comparison ("looks like a cat")
- Content words, even if delivered hesitantly

PHILOSOPHY: It is MUCH better to suggest a cut that the user unchecks than to miss a cut entirely. Be thorough. Every filler word should be a cut.

TIMESTAMP PRECISION:
- Each word in the transcript has exact [start - end] timestamps in seconds
- Use these exact word boundaries for your cut startTime and endTime
- For filler words, set startTime to the filler word's start and endTime to its end
- For sequences of fillers (e.g., "um, okay, so"), span from the first word's start to the last word's end
- Add ~0.05s buffer before/after cuts to avoid clipping adjacent words
- Gaps between words (where end of one word < start of next) are silence — include adjacent silence in filler cuts

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
const STORAGE_KEY_VERSION = 'autocut_prompt_version';
const PROMPT_VERSION = 4; // Bump this when default prompts change
const MAX_PROMPT_LENGTH = 1_000_000;

export function getStoredPrompts(): { audio: string; video: string } {
  if (typeof window === 'undefined') return { audio: DEFAULT_AUDIO_PROMPT, video: DEFAULT_VIDEO_ONLY_PROMPT };
  const storedAudio = localStorage.getItem(STORAGE_KEY_AUDIO);
  const storedVideo = localStorage.getItem(STORAGE_KEY_VIDEO);
  return {
    audio: storedAudio || DEFAULT_AUDIO_PROMPT,
    video: storedVideo || DEFAULT_VIDEO_ONLY_PROMPT,
  };
}

// Clear stored prompts when the default prompt version changes.
// User customizations are lost on version bump — acceptable since
// the defaults are actively being improved.
export function clearStalePrompts() {
  if (typeof window === 'undefined') return;
  const storedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
  if (storedVersion !== String(PROMPT_VERSION)) {
    localStorage.removeItem(STORAGE_KEY_AUDIO);
    localStorage.removeItem(STORAGE_KEY_VIDEO);
    localStorage.setItem(STORAGE_KEY_VERSION, String(PROMPT_VERSION));
  }
}

export function setStoredPrompt(type: 'audio' | 'video', value: string) {
  // Don't persist if it matches the current default — avoids freezing old defaults
  if (isDefaultPrompt(type, value)) {
    resetStoredPrompt(type);
    return;
  }
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
