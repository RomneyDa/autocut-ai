'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, AlertCircle } from 'lucide-react';
import VideoCompressor from './VideoCompressor';

interface VideoUploaderProps {
  onVideoUpload: (file: File) => void;
  isProcessing: boolean;
}

export default function VideoUploader({ onVideoUpload, isProcessing }: VideoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCompressor, setShowCompressor] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }

    // No file size limit since we compress on client-side
    // Large files will automatically be offered compression

    setError(null);
    setSelectedFile(file);

    // Show compressor if file is > 25MB
    if (file.size > 25 * 1024 * 1024) {
      setShowCompressor(true);
    } else {
      // Upload directly for smaller files
      onVideoUpload(file);
    }
  }, [onVideoUpload]);

  const handleCompressed = (compressedFile: File) => {
    setShowCompressor(false);
    onVideoUpload(compressedFile);
  };

  const handleSkipCompression = () => {
    if (selectedFile) {
      setShowCompressor(false);
      onVideoUpload(selectedFile);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setShowCompressor(false);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
    },
    multiple: false,
    disabled: isProcessing || showCompressor
  });

  // Show compressor if file is selected and needs compression
  if (showCompressor && selectedFile) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Optimize Your Video
          </h3>
          <p className="text-sm text-gray-600">
            Your video is {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. 
            Compression can reduce upload time and processing costs.
          </p>
        </div>

        <VideoCompressor
          file={selectedFile}
          onCompressed={handleCompressed}
          onSkip={handleSkipCompression}
          autoCompress={false}
        />

        <div className="text-center">
          <button
            onClick={resetSelection}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Choose Different Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors h-64
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isDragActive ? (
            <Video className="w-12 h-12 text-blue-500" />
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop your video here' : 'Upload your video'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isProcessing 
                ? 'Processing...'
                : 'Drag & drop a video file or click to browse'
              }
            </p>
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div>Supports MP4, MOV, AVI, MKV, WebM, M4V</div>
            <div>Any size • Automatic compression for large files</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 text-center">
        Best with MP4 under 10 minutes with clear audio.
      </p>
    </div>
  );
}