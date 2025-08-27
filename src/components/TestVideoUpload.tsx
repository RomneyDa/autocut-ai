'use client';

import { useState } from 'react';
import { Play, AlertCircle, CheckCircle } from 'lucide-react';

interface TestResult {
  success?: boolean;
  data?: {
    frames: number;
    transcript: number;
    description: string;
    recommendedCuts: Array<{
      startTime: number;
      endTime: number;
      reason: string;
      confidence: number;
      type: string;
    }>;
    // fullTranscript: any[];
  };
  error?: string;
  details?: string;
}

export default function TestVideoUpload() {
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createTestVideo = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      // Create a simple test video using HTML5 Canvas and MediaRecorder
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 640;
      canvas.height = 480;

      // Create a simple animated test video
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // Create a test file with some speech-like content
        const testFile = new File([blob], 'test-video.webm', { type: 'video/webm' });
        
        // Test the analysis API
        const formData = new FormData();
        formData.append('video', testFile);
        formData.append('prompt', 'This is a test video with some filler words like um and uh.');

        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          setTestResults(result);
        } catch (error) {
          setTestResults({ error: error instanceof Error ? error.message : 'Test failed' });
        }
        
        setIsLoading(false);
      };

      // Draw some test frames
      let frame = 0;
      const drawFrame = () => {
        if (!ctx) return;
        
        // Clear canvas
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw test content
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Test Video', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.font = '24px Arial';
        ctx.fillText(`Frame: ${frame}`, canvas.width / 2, canvas.height / 2);
        
        ctx.font = '18px Arial';
        ctx.fillText('Um... this is a test, uh...', canvas.width / 2, canvas.height / 2 + 40);
        
        frame++;
        
        if (frame < 90) { // 3 seconds at 30fps
          requestAnimationFrame(drawFrame);
        } else {
          mediaRecorder.stop();
        }
      };

      mediaRecorder.start();
      drawFrame();

    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : 'Failed to create test video' });
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Test Mode</h3>
      <p className="text-sm text-yellow-700 mb-4">
        Create and test with a synthetic video to verify the AI analysis pipeline works.
      </p>
      
      <button
        onClick={createTestVideo}
        disabled={isLoading}
        className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <Play className="w-4 h-4" />
        <span>{isLoading ? 'Creating Test Video...' : 'Run Test'}</span>
      </button>

      {testResults && (
        <div className="mt-4">
          {testResults.error ? (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Test Failed</h4>
                <p className="text-sm text-red-700">{testResults.error}</p>
                {testResults.details && (
                  <p className="text-xs text-red-600 mt-1">{testResults.details}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800">Test Successful!</h4>
                <p className="text-sm text-green-700">
                  Analysis completed: {testResults.data?.recommendedCuts?.length || 0} cuts recommended
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-green-600 cursor-pointer">View Results</summary>
                  <pre className="text-xs mt-2 p-2 bg-green-100 rounded overflow-auto max-h-40">
                    {JSON.stringify(testResults.data, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}