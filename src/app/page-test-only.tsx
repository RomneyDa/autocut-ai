'use client';

import { useState } from 'react';
import VideoUploader from '@/components/VideoUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import AnalysisResults from '@/components/AnalysisResults';
import TestVideoUpload from '@/components/TestVideoUpload';
import DebugPanel from '@/components/DebugPanel';
import { ProcessingStatus as ProcessingStatusType, AnalysisResult } from '@/lib/types';
import { Sparkles, Settings } from 'lucide-react';

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [status, setStatus] = useState<ProcessingStatusType | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [debugData, setDebugData] = useState<unknown>(null);
  const [showTestMode, setShowTestMode] = useState(false);

  const handleVideoUpload = async (file: File) => {
    setCurrentFile(file);
    setResults(null);
    setDebugData(null);
    
    // Create FormData
    const formData = new FormData();
    formData.append('video', file);
    if (userPrompt.trim()) {
      formData.append('prompt', userPrompt);
    }

    // Set initial status
    setStatus({
      stage: 'uploading',
      progress: 0,
      message: 'Preparing video for analysis...'
    });

    try {
      // Update status during processing
      setStatus({
        stage: 'extracting',
        progress: 20,
        message: 'Extracting frames and audio from video...'
      });

      // Make API request
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/analyze`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setDebugData(data); // Store for debugging

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setStatus({
        stage: 'transcribing',
        progress: 60,
        message: 'Transcribing audio...'
      });

      setStatus({
        stage: 'analyzing',
        progress: 80,
        message: 'Analyzing with AI...'
      });

      if (data.success) {
        setStatus({
          stage: 'complete',
          progress: 100,
          message: 'Analysis complete! Review your cuts below.'
        });

        // Convert API response to AnalysisResult format
        setResults({
          frames: [], // We don't need to store all frames in UI
          transcript: data.data.transcript || '',
          aiDescription: data.data.description,
          recommendedCuts: data.data.recommendedCuts || []
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handlePayAndDownload = () => {
    console.log('Video downloaded successfully!');
  };

  const resetFlow = () => {
    setCurrentFile(null);
    setStatus(null);
    setResults(null);
    setUserPrompt('');
    setDebugData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-8 h-8 text-blue-600 mr-2" />
              AutoCut.AI
            </h1>
            <button
              onClick={() => setShowTestMode(!showTestMode)}
              className="ml-4 p-2 text-gray-500 hover:text-gray-700"
              title="Toggle test mode"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <p className="text-lg text-gray-600">
            AI-powered video editing that removes filler words and unnecessary content
          </p>
        </div>

        {/* Test Mode */}
        {showTestMode && <TestVideoUpload />}

        {/* Main Content */}
        <div className="space-y-8">
          {!currentFile && !status && (
            <>
              {/* User Prompt Input */}
              <div className="max-w-2xl mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Please be more aggressive with removing filler words, or keep natural pauses..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Video Uploader */}
              <VideoUploader
                onVideoUpload={handleVideoUpload}
                isProcessing={false}
              />
            </>
          )}

          {/* Processing Status */}
          {status && status.stage !== 'complete' && (
            <ProcessingStatus status={status} />
          )}

          {/* Results */}
          {!!results && status?.stage === 'complete' ? (
            <>
              <AnalysisResults
                results={results}
                onPayAndDownload={handlePayAndDownload}
                videoFile={currentFile || undefined}
              />
              
              {/* Reset Button */}
              <div className="text-center">
                <button
                  onClick={resetFlow}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Upload Another Video
                </button>
              </div>
            </>
          ) : null}

          {/* Error State */}
          {status?.stage === 'error' && (
            <div className="text-center">
              <button
                onClick={resetFlow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Debug Panel */}
          {debugData != null ? (
            <DebugPanel
              data={debugData}
              title="API Response Debug"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}