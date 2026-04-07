'use client';

import { useState } from 'react';
import { AnalysisResult, CutRecommendation } from '@/lib/types';
import { Scissors, Clock, Download } from 'lucide-react';
import VideoPreviewWithCuts from './VideoPreviewWithCuts';

interface AnalysisResultsProps {
  results: AnalysisResult;
  selectedCuts?: Set<number>;
  onSelectedCutsChange?: (cuts: Set<number>) => void;
  onPayAndDownload: () => void;
  onReset?: () => void;
  videoFile?: File;
}

export default function AnalysisResults({ results, selectedCuts: selectedCutsProp, onSelectedCutsChange, onPayAndDownload, onReset, videoFile }: AnalysisResultsProps) {
  const [internalSelectedCuts, setInternalSelectedCuts] = useState<Set<number>>(
    () => selectedCutsProp ?? new Set(results.recommendedCuts.map((_, i) => i))
  );

  const selectedCuts = selectedCutsProp ?? internalSelectedCuts;
  const [isDownloading, setIsDownloading] = useState(false);

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
      case 'filler':
        return 'bg-yellow-100 text-yellow-800';
      case 'silence':
        return 'bg-gray-100 text-gray-800';
      case 'repetition':
        return 'bg-blue-100 text-blue-800';
      case 'visual_pause':
        return 'bg-indigo-100 text-indigo-800';
      case 'poor_quality':
        return 'bg-red-100 text-red-800';
      case 'transition':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const getBufferInfo = (type: CutRecommendation['type']) => {
    switch (type) {
      case 'filler':
        return '+ 0.15s buffer for natural speech flow';
      case 'silence':
        return '+ 0.05s buffer to avoid abrupt cuts';
      case 'repetition':
        return '+ 0.2s buffer for smooth transitions';
      case 'visual_pause':
        return '+ 0.1s buffer for visual continuity';
      case 'poor_quality':
        return '+ 0.05s buffer for quality transition';
      case 'transition':
        return '+ 0.15s buffer for smooth visual flow';
      default:
        return '+ 0.1s buffer';
    }
  };

  const selectedCutsArray = results.recommendedCuts.filter((_, index) => 
    selectedCuts.has(index)
  );
  
  const totalCutDuration = selectedCutsArray.reduce((sum, cut) => 
    sum + (cut.endTime - cut.startTime), 0
  );

  const handlePaymentSuccess = async () => {
    // setShowPaymentModal(false); // TODO: wire up payment
    setIsDownloading(true);

    try {
      if (!videoFile) {
        throw new Error('No video file available');
      }

      // Prepare form data for video processing
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cuts', JSON.stringify(selectedCutsArray));

      // Process the video
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/process-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Video processing failed');
      }

      // Download the processed video
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `edited-${videoFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      onPayAndDownload(); // Call parent callback

    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download video. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Gemini's Description */}
        {results.aiDescription && (
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-700">Gemini&apos;s description: </span>
            {results.aiDescription}
          </div>
        )}

        {/* Video Preview */}
        {videoFile && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-4">
            <VideoPreviewWithCuts
              file={videoFile}
              cuts={results.recommendedCuts}
              selectedCuts={selectedCuts}
              showProcessed={true}
            />
          </div>
        )}

        {/* Cuts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Scissors className="w-5 h-5 mr-2" />
            Cuts
          </h2>

          <div className="mb-4 text-sm text-gray-600">
            Click on cuts to toggle them on/off.
          </div>

          <div className="space-y-3">
            {results.recommendedCuts.map((cut, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedCuts.has(index)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => toggleCut(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCuts.has(index)}
                      onChange={() => toggleCut(index)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {formatTime(cut.startTime)} - {formatTime(cut.endTime)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCutTypeColor(cut.type)}`}>
                          {cut.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{cut.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">{getBufferInfo(cut.type)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      -{formatDuration(cut.endTime - cut.startTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(cut.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download / Reset */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-600">
            {selectedCuts.size} cuts • {formatTime(totalCutDuration)} removed
          </span>
          <div className="flex items-center gap-3">
            {onReset && (
              <button
                onClick={onReset}
                className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 underline"
              >
                New video
              </button>
            )}
            <button
              onClick={handlePaymentSuccess}
              disabled={isDownloading}
              className="cursor-pointer flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Processing...' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      {/* TODO: wire up payment
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        amount={100}
      />
      */}
    </>
  );
}