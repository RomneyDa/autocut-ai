import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { VideoFrame, CutRecommendation } from './types';
import { getVideoAnalysisPrompt, getVideoOnlyAnalysisPrompt } from './gemini-prompts';

function toBase64(data: Uint8Array | Buffer): string {
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    return data.toString('base64');
  }
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel | null = null;

  constructor(private apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async getModel(): Promise<GenerativeModel> {
    if (this.model) return this.model;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );
      const data = await res.json();
      const flashModel = data.models?.find(
        (m: { name: string; supportedGenerationMethods?: string[] }) =>
          m.name.includes('flash') &&
          m.supportedGenerationMethods?.includes('generateContent')
      );
      const modelId = flashModel
        ? flashModel.name.replace('models/', '')
        : 'gemini-2.5-flash';
      this.model = this.genAI.getGenerativeModel({ model: modelId });
    } catch {
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    return this.model;
  }

  async analyzeVideo(
    frames: VideoFrame[],
    audioData: Uint8Array | Buffer | null,
    userPrompt?: string
  ): Promise<{ description: string; cuts: CutRecommendation[]; transcript: string }> {
    const hasAudio = !!audioData;
    const systemPrompt = hasAudio
      ? getVideoAnalysisPrompt(userPrompt)
      : getVideoOnlyAnalysisPrompt(userPrompt);

    const content = [
      systemPrompt,
      '\n\nVIDEO FRAMES WITH TIMESTAMPS:\n'
    ];

    frames.forEach(frame => {
      content.push(`Timestamp: ${frame.timestamp.toFixed(1)}s`);
    });

    if (hasAudio) {
      content.push('\n\nAudio is provided inline. Transcribe the speech and use it to identify filler words, pauses, and other content to cut.');
      content.push('\n\nREMINDER: Be conservative with cuts. Only remove content that clearly detracts from the message. Preserve the speaker\'s natural rhythm and authentic communication style.');
    } else {
      content.push('\n\nNOTE: This video has no audio track. Focus on visual content analysis only.');
    }

    // Prepare images
    const imageParts = frames.map(frame => ({
      inlineData: {
        data: frame.imageUrl.split(',')[1],
        mimeType: 'image/png' as const,
      }
    }));

    // Prepare audio part if available
    const audioPart = hasAudio ? [{
      inlineData: {
        data: toBase64(audioData!),
        mimeType: 'audio/wav' as const,
      }
    }] : [];

    try {
      const model = await this.getModel();
      const result = await model.generateContent([
        content.join('\n'),
        ...imageParts,
        ...audioPart,
      ]);

      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validatedCuts = this.validateAndSanitizeCuts(parsed.cuts || [], hasAudio);

      return {
        description: parsed.description || (hasAudio ? 'No description provided' : 'Video-only content analyzed'),
        cuts: validatedCuts,
        transcript: parsed.transcript || '',
      };
    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw new Error('Failed to analyze video with Gemini');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateAndSanitizeCuts(cuts: any[], hasAudio: boolean): CutRecommendation[] {
    return cuts
      .filter(cut => {
        return cut.startTime !== undefined &&
               cut.endTime !== undefined &&
               cut.startTime < cut.endTime &&
               cut.endTime - cut.startTime >= 0.1;
      })
      .map(cut => ({
        startTime: parseFloat(cut.startTime),
        endTime: parseFloat(cut.endTime),
        reason: cut.reason || 'Unspecified cut',
        confidence: Math.min(1, Math.max(0, parseFloat(cut.confidence) || 0.5)),
        type: this.validateCutType(cut.type, hasAudio)
      }))
      .filter(cut => {
        const duration = cut.endTime - cut.startTime;
        if (duration > 10) return false;
        if (cut.type === 'filler' && duration > 2) return false;
        return true;
      })
      .sort((a, b) => a.startTime - b.startTime);
  }

  private validateCutType(type: string, hasAudio: boolean): CutRecommendation['type'] {
    const audioTypes: CutRecommendation['type'][] = ['filler', 'silence', 'repetition'];
    const videoTypes: CutRecommendation['type'][] = ['visual_pause', 'repetition', 'poor_quality', 'transition'];
    const validTypes = hasAudio ? [...audioTypes, 'other'] : [...videoTypes, 'other'];

    if (validTypes.includes(type as CutRecommendation['type'])) {
      return type as CutRecommendation['type'];
    }

    return 'other';
  }
}
