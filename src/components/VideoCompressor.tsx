'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap, FileDown, Info, Settings } from 'lucide-react';
import { getClientVideoProcessor } from '@/lib/client-video-processor';

interface VideoCompressorProps {
  file: File;
  onCompressed: (compressedFile: File) => void;
  onSkip: () => void;
  autoCompress?: boolean;
}

export default function VideoCompressor({ 
  file, 
  onCompressed, 
  onSkip, 
  autoCompress = false 
}: VideoCompressorProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize?: number;
    compressionRatio?: number;
  }>({ originalSize: file.size });
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [maxSizeMB, setMaxSizeMB] = useState(25);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [initializingFFmpeg, setInitializingFFmpeg] = useState(true);

  useEffect(() => {
    initializeFFmpeg();
  }, []);

  useEffect(() => {
    if (autoCompress && ffmpegReady && file.size > maxSizeMB * 1024 * 1024) {
      handleCompress();
    }
  }, [ffmpegReady, autoCompress]);

  const initializeFFmpeg = async () => {
    try {
      setInitializingFFmpeg(true);
      await getClientVideoProcessor();
      setFfmpegReady(true);
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
    } finally {
      setInitializingFFmpeg(false);
    }
  };

  const handleCompress = async () => {
    if (!ffmpegReady) return;

    setIsCompressing(true);
    setProgress(0);

    try {
      const processor = await getClientVideoProcessor();
      
      const compressedFile = await processor.compressVideo(file, {
        quality,
        maxSizeMB,
        onProgress: setProgress
      });

      setCompressionStats(prev => ({
        ...prev,
        compressedSize: compressedFile.size,
        compressionRatio: ((file.size - compressedFile.size) / file.size) * 100
      }));

      onCompressed(compressedFile);
    } catch (error) {
      console.error('Compression failed:', error);
      alert('Compression failed. You can skip compression and upload the original file.');
    } finally {
      setIsCompressing(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const shouldCompress = file.size > maxSizeMB * 1024 * 1024;

  if (initializingFFmpeg) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-medium text-blue-800">Initializing Video Processor</h3>
            <p className="text-sm text-blue-600">Loading FFmpeg WebAssembly...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="font-medium text-yellow-800">Video Compression Unavailable</h3>
            <p className="text-sm text-yellow-600">
              FFmpeg failed to load. You can still upload your video without compression.
            </p>
            <button
              onClick={onSkip}
              className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-800"
            >
              Continue without compression
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* File Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Video Compression</h3>
          <p className="text-sm text-gray-600">
            Original size: {formatFileSize(file.size)}
            {shouldCompress && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Recommended
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {compressionStats.compressedSize && (
            <div className="text-right">
              <div className="text-sm font-medium text-green-600">
                {formatFileSize(compressionStats.compressedSize)}
              </div>
              <div className="text-xs text-gray-500">
                {compressionStats.compressionRatio?.toFixed(1)}% smaller
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compression Settings */}
      {!isCompressing && !compressionStats.compressedSize && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="high">High (best quality)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="low">Low (smallest size)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Size (MB)
            </label>
            <input
              type="number"
              value={maxSizeMB}
              onChange={(e) => setMaxSizeMB(Number(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )}

      {/* Progress */}
      {isCompressing && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Compressing video...</span>
            <span className="text-sm font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onSkip}
          disabled={isCompressing}
          className="text-gray-600 hover:text-gray-800 text-sm underline"
        >
          Skip compression
        </button>
        
        <div className="flex space-x-2">
          {compressionStats.compressedSize ? (
            <button
              onClick={() => onSkip()}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Use Compressed Video</span>
            </button>
          ) : (
            <button
              onClick={handleCompress}
              disabled={isCompressing}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>{isCompressing ? 'Compressing...' : 'Compress Video'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            <p>
              Video compression runs entirely in your browser using WebAssembly. 
              Your video never leaves your device during this process.
            </p>
            {shouldCompress && (
              <p className="mt-1 font-medium">
                Your video is larger than {maxSizeMB}MB. Compression is recommended for faster upload and processing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}