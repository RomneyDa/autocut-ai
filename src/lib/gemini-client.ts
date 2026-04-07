import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { VideoFrame, CutRecommendation } from './types';
import { getVideoAnalysisPrompt, getVideoOnlyAnalysisPrompt } from './gemini-prompts';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async analyzeVideo(
    frames: VideoFrame[], 
    transcript: string, 
    userPrompt?: string
  ): Promise<{ description: string; cuts: CutRecommendation[] }> {
    // Use appropriate prompt based on whether we have audio
    const hasAudio = !!(transcript && transcript !== '[No audio track found]');
    const systemPrompt = hasAudio 
      ? getVideoAnalysisPrompt(userPrompt)
      : getVideoOnlyAnalysisPrompt(userPrompt);

    // Prepare the content with frames and transcript
    const content = [
      systemPrompt,
      '\n\nVIDEO FRAMES WITH TIMESTAMPS:\n'
    ];

    // Add frame data
    frames.forEach(frame => {
      content.push(`Timestamp: ${frame.timestamp.toFixed(1)}s`);
    });

    if (hasAudio) {
      content.push('\n\nAUDIO TRANSCRIPT WITH TIMESTAMPS:\n' + transcript);
      content.push('\n\nREMINDER: Be conservative with cuts. Only remove content that clearly detracts from the message. Preserve the speaker\'s natural rhythm and authentic communication style.');
    } else {
      content.push('\n\nNOTE: This video has no audio track. Focus on visual content analysis only.');
    }

    // Prepare images for the model
    const imageParts = frames.map(frame => ({
      inlineData: {
        data: frame.imageUrl.split(',')[1], // Remove data:image/png;base64, prefix
        mimeType: 'image/png'
      }
    }));

    try {
      const result = await this.model.generateContent([
        content.join('\n'),
        ...imageParts
      ]);

      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize the cuts
      const validatedCuts = this.validateAndSanitizeCuts(parsed.cuts || [], hasAudio);
      
      return {
        description: parsed.description || (hasAudio ? 'No description provided' : 'Video-only content analyzed'),
        cuts: validatedCuts
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
        // Basic validation
        return cut.startTime !== undefined && 
               cut.endTime !== undefined && 
               cut.startTime < cut.endTime &&
               cut.endTime - cut.startTime >= 0.1; // Minimum 100ms cut
      })
      .map(cut => ({
        startTime: parseFloat(cut.startTime),
        endTime: parseFloat(cut.endTime),
        reason: cut.reason || 'Unspecified cut',
        confidence: Math.min(1, Math.max(0, parseFloat(cut.confidence) || 0.5)),
        type: this.validateCutType(cut.type, hasAudio)
      }))
      .filter(cut => {
        // Additional quality filters
        const duration = cut.endTime - cut.startTime;
        
        // Don't allow cuts that are too long (likely mistakes)
        if (duration > 10) return false;
        
        // For filler words, don't allow cuts longer than 2 seconds
        if (cut.type === 'filler' && duration > 2) return false;
        
        return true;
      })
      .sort((a, b) => a.startTime - b.startTime); // Sort by start time
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