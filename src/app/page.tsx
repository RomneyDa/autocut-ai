'use client';

import { useState } from 'react';
import VideoUploader from '@/components/VideoUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import AnalysisResults from '@/components/AnalysisResults';
import TestVideoUpload from '@/components/TestVideoUpload';
import DebugPanel from '@/components/DebugPanel';
import APIKeyManager from '@/components/APIKeyManager';
import { ProcessingStatus as ProcessingStatusType, AnalysisResult } from '@/lib/types';
import { apiHeaders } from '@/lib/api-keys';
import { Sparkles, Settings } from 'lucide-react';

const isDev = process.env.NODE_ENV === 'development';

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [status, setStatus] = useState<ProcessingStatusType | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [debugData, setDebugData] = useState<unknown>(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [apisConnected, setApisConnected] = useState(false);

  const handleVideoUpload = async (file: File) => {
    setCurrentFile(file);
    setResults(null);
    setDebugData(null);

    const formData = new FormData();
    formData.append('video', file);
    if (userPrompt.trim()) {
      formData.append('prompt', userPrompt);
    }

    setStatus({
      stage: 'uploading',
      progress: 0,
      message: 'Preparing video for analysis...'
    });

    try {
      setStatus({
        stage: 'extracting',
        progress: 20,
        message: 'Extracting frames and audio from video...'
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/analyze`, {
        method: 'POST',
        headers: apiHeaders(),
        body: formData
      });

      const data = await response.json();
      setDebugData(data);

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

        setResults({
          frames: [],
          transcript: data.data.fullTranscript || [],
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
            {isDev && (
              <button
                onClick={() => setShowTestMode(!showTestMode)}
                className="ml-4 p-2 text-gray-500 hover:text-gray-700"
                title="Toggle test mode"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-lg text-gray-600">
            AI-powered video editing that removes filler words and unnecessary content
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Your video is analyzed on our server using your API keys, then discarded. Large file compression happens entirely in your browser.
          </p>
        </div>

        {/* API Key Manager */}
        <div className="max-w-2xl mx-auto mb-8">
          <APIKeyManager onKeysChanged={setApisConnected} />
        </div>

        {/* Test Mode (dev only) */}
        {isDev && showTestMode && <TestVideoUpload />}

        {/* Main Content */}
        <div className="space-y-8">
          {!currentFile && !status && (
            <div className={!apisConnected ? 'opacity-50 pointer-events-none' : ''}>
              <div className="max-w-2xl mx-auto mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Please be more aggressive with removing filler words, or keep natural pauses..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  disabled={!apisConnected}
                />
              </div>

              <VideoUploader
                onVideoUpload={handleVideoUpload}
                isProcessing={!apisConnected}
              />
            </div>
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

          {/* Debug Panel (dev only) */}
          {isDev && debugData != null ? (
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
