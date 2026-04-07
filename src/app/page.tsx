'use client';

import { useState, useMemo } from 'react';
import VideoUploader from '@/components/VideoUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import AnalysisResults from '@/components/AnalysisResults';
import TestVideoUpload from '@/components/TestVideoUpload';
import DebugPanel from '@/components/DebugPanel';
import APIKeyManager from '@/components/APIKeyManager';
import { ProcessingStatus as ProcessingStatusType, AnalysisResult } from '@/lib/types';
import { getStoredKey } from '@/lib/api-keys';
import { analyzeVideoClientSide } from '@/lib/client-analyzer';
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

  const videoPreviewUrl = useMemo(
    () => currentFile ? URL.createObjectURL(currentFile) : null,
    [currentFile]
  );

  const handleFileSelected = (file: File) => {
    setCurrentFile(file);
    setStatus(null);
    setResults(null);
    setDebugData(null);
  };

  const handleAnalyze = async () => {
    if (!currentFile) return;

    const apiKey = getStoredKey();
    if (!apiKey) return;

    try {
      const result = await analyzeVideoClientSide(
        currentFile,
        apiKey,
        userPrompt.trim() || undefined,
        (p) => {
          setStatus({
            stage: p.stage === 'loading' ? 'extracting' : p.stage as ProcessingStatusType['stage'],
            progress: p.progress,
            message: p.message,
          });
        },
      );

      setDebugData(result);
      setResults({
        frames: [],
        transcript: result.transcript,
        aiDescription: result.description,
        recommendedCuts: result.cuts,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
              AutoCut AI
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
            All processing happens in your browser. Your video and API key go directly to Gemini — nothing is sent to our server.
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
            <VideoUploader
              onVideoUpload={handleFileSelected}
              isProcessing={false}
            />
          )}

          {currentFile && !status && (
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <div className="border-2 border-gray-300 rounded-lg p-3 h-64 flex flex-col">
                <video
                  src={videoPreviewUrl!}
                  controls
                  className="w-full flex-1 min-h-0 rounded-md bg-black object-contain"
                />
                <div className="flex items-center justify-between mt-2 flex-shrink-0">
                  <div className="text-sm text-gray-600 truncate">
                    {currentFile.name} ({(currentFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                  <button
                    onClick={resetFlow}
                    className="text-xs text-gray-500 hover:text-gray-700 underline ml-4 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Be more aggressive with removing filler words, or keep natural pauses..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!apisConnected}
                className="cursor-pointer w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {apisConnected ? 'AutoCut' : 'Enter API key to analyze'}
              </button>
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
