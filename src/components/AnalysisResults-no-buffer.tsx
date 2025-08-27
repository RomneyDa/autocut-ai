'use client';

import { useState } from 'react';
import { AnalysisResult, CutRecommendation } from '@/lib/types';
import { Scissors, Clock, Volume2, FileText, Download, DollarSign, Play, Eye } from 'lucide-react';
import PaymentModal from './PaymentModal';
import VideoPreviewWithCuts from './VideoPreviewWithCuts';

interface AnalysisResultsProps {
  results: AnalysisResult;
  onPayAndDownload: () => void;
  videoFile?: File;
}

export default function AnalysisResults({ results, onPayAndDownload, videoFile }: AnalysisResultsProps) {
  const [selectedCuts, setSelectedCuts] = useState<Set<number>>(
    new Set(results.recommendedCuts.map((_, index) => index))
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(true);

  const toggleCut = (index: number) => {
    const newSelected = new Set(selectedCuts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCuts(newSelected);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${minutes}:${secs.padStart(4, '0')}`;
  };

  const getCutTypeColor = (type: CutRecommendation['type']) => {
    switch (type) {
      case 'filler':
        return 'bg-yellow-100 text-yellow-800';
      case 'silence':
        return 'bg-gray-100 text-gray-800';
      case 'repetition':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const selectedCutsArray = results.recommendedCuts.filter((_, index) => 
    selectedCuts.has(index)
  );
  
  const totalCutDuration = selectedCutsArray.reduce((sum, cut) => 
    sum + (cut.endTime - cut.startTime), 0
  );

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
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
      const response = await fetch('/api/process-video', {
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
        {/* Video Preview */}
        {videoFile && showVideoPreview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Play className="w-5 h-5 mr-2" />
                Video Preview
              </h2>
              <button
                onClick={() => setShowVideoPreview(!showVideoPreview)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <VideoPreviewWithCuts
                file={videoFile}
                cuts={results.recommendedCuts}
                selectedCuts={selectedCuts}
                showProcessed={true}
              />
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>How to use:</strong></p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• <strong>Original mode:</strong> Play the full video with timeline markers showing cuts</li>
                  <li>• <strong>Edited mode:</strong> Automatically skips all cut sections for a seamless preview</li>
                  <li>• <strong>Timeline:</strong> Click anywhere to jump to that point in the video</li>
                  <li>• <strong>Duration:</strong> Shows the final edited length in processed mode</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Analysis Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.recommendedCuts.length}</div>
              <div className="text-sm text-gray-600">Recommended Cuts</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(totalCutDuration)}
              </div>
              <div className="text-sm text-gray-600">Time to Remove</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{selectedCuts.size}</div>
              <div className="text-sm text-gray-600">Selected Cuts</div>
            </div>
          </div>

          <div className="prose max-w-none">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Video Description</h3>
            <p className="text-gray-700">{results.aiDescription}</p>
          </div>
        </div>

        {/* Recommended Cuts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Scissors className="w-5 h-5 mr-2" />
            Recommended Cuts
          </h2>

          <div className="mb-4 text-sm text-gray-600">
            Click on cuts to toggle them on/off. Preview the changes in the video player above.
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
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      -{formatTime(cut.endTime - cut.startTime)}
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

        {/* Download Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Ready to download your edited video?
              </h3>
              <p className="text-sm text-gray-600">
                {selectedCuts.size} cuts selected • {formatTime(totalCutDuration)} will be removed
              </p>
              {videoFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Preview the final result using "Processed" mode in the video player above
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={isDownloading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isDownloading ? 'Processing...' : 'Pay $1.00 & Download'}</span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        amount={100} // $1.00 in cents
      />
    </>
  );
}