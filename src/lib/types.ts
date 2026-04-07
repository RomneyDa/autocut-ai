export interface VideoFrame {
  timestamp: number;
  imageUrl: string;
}

export interface AnalysisResult {
  frames: VideoFrame[];
  transcript: string;
  aiDescription: string;
  recommendedCuts: CutRecommendation[];
}

export interface CutRecommendation {
  startTime: number;
  endTime: number;
  reason: string;
  confidence: number;
  type: 'silence' | 'filler' | 'repetition' | 'other' | 'visual_pause' | 'poor_quality' | 'transition';
}

export interface ProcessingStatus {
  stage: 'uploading' | 'extracting' | 'transcribing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
}