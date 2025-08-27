import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { VideoFrame, CutRecommendation } from './types';

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
    const systemPrompt = `You are an AI video editor that analyzes videos to identify unnecessary content that should be cut out. 

Your task is to:
1. Analyze the sequence of video frames and audio transcript
2. Identify sections that should be removed (filler words, long silences, repetitive content, etc.)
3. Provide a detailed description of what happens in the video
4. Recommend specific cuts with timestamps

Focus on:
- Removing "um", "uh", "like", "you know" and similar filler words
- Cutting out long silences (>2 seconds)
- Removing repetitive content or mistakes
- Keeping natural pauses and important context

Return your response as JSON with this structure:
{
  "description": "Detailed description of the video content",
  "cuts": [
    {
      "startTime": 1.2,
      "endTime": 2.1,
      "reason": "Filler word 'um'",
      "confidence": 0.9,
      "type": "filler"
    }
  ]
}

${userPrompt ? `Additional user instructions: ${userPrompt}` : ''}`;

    // Prepare the content with frames and transcript
    const content = [
      systemPrompt,
      '\n\nVIDEO FRAMES WITH TIMESTAMPS:\n'
    ];

    // Add frame data
    frames.forEach(frame => {
      content.push(`Timestamp: ${frame.timestamp.toFixed(1)}s`);
    });

    content.push('\n\nAUDIO TRANSCRIPT:\n' + transcript);

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
      
      return {
        description: parsed.description || 'No description provided',
        cuts: parsed.cuts || []
      };
    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw new Error('Failed to analyze video with Gemini');
    }
  }
}