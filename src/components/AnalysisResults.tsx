'use client';

import { useState } from 'react';
import { AnalysisResult, CutRecommendation } from '@/lib/types';
import { Download } from 'lucide-react';
import VideoPreviewWithCuts from './VideoPreviewWithCuts';

interface AnalysisResultsProps {
  results: AnalysisResult;
  selectedCuts?: Set<number>;
  onSelectedCutsChange?: (cuts: Set<number>) => void;
  onPayAndDownload: () => void;
  onReset?: () => void;
  videoFile?: File;
  transcriptFormatted?: string;
  geminiRawResponse?: unknown;
  minSegmentMs?: number;
  onMinSegmentChange?: (v: number) => void;
}

export default function AnalysisResults({ results, selectedCuts: selectedCutsProp, onSelectedCutsChange, onPayAndDownload, onReset, videoFile, transcriptFormatted, geminiRawResponse, minSegmentMs = 0, onMinSegmentChange }: AnalysisResultsProps) {
  const [internalSelectedCuts, setInternalSelectedCuts] = useState<Set<number>>(
    () => selectedCutsProp ?? new Set(results.recommendedCuts.map((_, i) => i))
  );

  const selectedCuts = selectedCutsProp ?? internalSelectedCuts;
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const toggleCut = (index: number) => {
    const newSelected = new Set(selectedCuts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    if (onSelectedCutsChange) {
      onSelectedCutsChange(newSelected);
    } else {
      setInternalSelectedCuts(newSelected);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${minutes}:${secs.padStart(4, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  const getCutTypeColor = (type: CutRecommendation['type']) => {
    switch (type) {
      case 'filler': return 'bg-yellow-100 text-yellow-800';
      case 'silence': return 'bg-gray-100 text-gray-800';
      case 'repetition': return 'bg-blue-100 text-blue-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const selectedCutsArray = results.recommendedCuts.filter((_, index) =>
    selectedCuts.has(index)
  );

  const totalCutDuration = selectedCutsArray.reduce((sum, cut) =>
    sum + (cut.endTime - cut.startTime), 0
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (!videoFile) throw new Error('No video file available');

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cuts', JSON.stringify(selectedCutsArray));

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/process-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Video processing failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `edited-${videoFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      onPayAndDownload();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* 1. Transcript */}
      {transcriptFormatted && (
        <div>
          <button onClick={() => setShowTranscript(!showTranscript)} className="cursor-pointer flex items-center gap-1 w-full text-left min-w-0">
            <span className="text-gray-300 shrink-0">{showTranscript ? '▾' : '▸'}</span>
            <span className="text-xs font-medium text-gray-700 shrink-0">Transcript</span>
            {!showTranscript && (
              <span className="text-xs italic text-gray-500 truncate min-w-0">
                {transcriptFormatted.replace(/\[\d+\.\d+s\s*-\s*\d+\.\d+s\]\s*/g, '').replace(/"/g, '').replace(/\n/g, ' ')}
              </span>
            )}
          </button>
          {showTranscript && (
            <pre className="mt-1 ml-3 p-3 bg-gray-50 rounded-md overflow-auto max-h-64 text-[11px] font-mono text-gray-500 whitespace-pre-wrap">{transcriptFormatted}</pre>
          )}
        </div>
      )}

      {/* 2. Gemini analysis */}
      {results.aiDescription && (
        <div className="mb-4">
          <button onClick={() => setShowGemini(!showGemini)} className="cursor-pointer flex items-center gap-1 w-full text-left min-w-0">
            <span className="text-gray-300 shrink-0">{showGemini ? '▾' : '▸'}</span>
            <span className="text-xs font-medium text-gray-700 shrink-0">Analysis</span>
            {!showGemini && (
              <span className="text-xs italic text-gray-500 truncate min-w-0">{results.aiDescription}</span>
            )}
          </button>
          {showGemini && (
            <div className="mt-1 ml-3 space-y-2">
              <p className="text-sm italic text-gray-600">{results.aiDescription}</p>
              {geminiRawResponse != null && (
                <pre className="p-3 bg-gray-50 rounded-md overflow-auto max-h-64 text-[11px] font-mono text-gray-500">{JSON.stringify(geminiRawResponse, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Video Preview */}
      {videoFile && (
        <VideoPreviewWithCuts
          file={videoFile}
          cuts={results.recommendedCuts}
          selectedCuts={selectedCuts}
          minSegmentMs={minSegmentMs}
          onMinSegmentChange={onMinSegmentChange}
          showProcessed={true}
        />
      )}

      {/* 4. Cuts */}
      <div>
        <div className="py-1">
          <span className="text-xs text-gray-500">
            {selectedCuts.size} cuts &bull; {formatTime(totalCutDuration)} removed
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {results.recommendedCuts.map((cut, index) => (
            <div
              key={index}
              onClick={() => toggleCut(index)}
              className={`cursor-pointer flex items-center gap-3 px-2 py-1.5 rounded text-xs transition-colors ${
                selectedCuts.has(index) ? 'bg-blue-50/50' : 'opacity-40'
              } hover:bg-blue-50`}
            >
              <input
                type="checkbox"
                checked={selectedCuts.has(index)}
                onChange={() => toggleCut(index)}
                className="w-3.5 h-3.5 text-blue-600 shrink-0"
              />
              <span className="text-gray-500 font-mono w-24 shrink-0">
                {formatTime(cut.startTime)}–{formatTime(cut.endTime)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${getCutTypeColor(cut.type)}`}>
                {cut.type}
              </span>
              <span className="text-gray-600 truncate flex-1">{cut.reason}</span>
              <span className="text-gray-400 shrink-0">-{formatDuration(cut.endTime - cut.startTime)}</span>
            </div>
          ))}
        </div>

        {/* 5. Download */}
        <div className="py-3 flex items-center justify-end gap-3">
          {videoFile && (
            <a
              href={URL.createObjectURL(videoFile)}
              download={videoFile.name}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Download original
            </a>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Processing...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
