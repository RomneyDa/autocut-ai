'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Scissors, Eye, RotateCcw } from 'lucide-react';
import { CutRecommendation } from '@/lib/types';

interface VideoPreviewWithCutsProps {
  file: File;
  cuts: CutRecommendation[];
  selectedCuts: Set<number>;
  className?: string;
  showProcessed?: boolean;
}

export default function VideoPreviewWithCuts({ 
  file, 
  cuts, 
  selectedCuts, 
  className = '',
  showProcessed = false 
}: VideoPreviewWithCutsProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // For processed mode, track the "virtual" time
  const [virtualTime, setVirtualTime] = useState(0);

  // Get appropriate buffer time based on cut type
  const getBufferForCutType = (cutType: string): number => {
    switch (cutType) {
      case 'filler':
        return 0.15; // Short buffer for filler words to maintain speech flow
      case 'silence':
        return 0.05; // Minimal buffer for silence cuts
      case 'repetition':
        return 0.2;  // Slightly longer buffer for repetition cuts
      case 'visual_pause':
        return 0.1;  // Standard buffer for visual cuts
      case 'poor_quality':
        return 0.05; // Minimal buffer for quality issues
      case 'transition':
        return 0.15; // Buffer for transition cuts
      default:
        return 0.1;  // Default buffer
    }
  };

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get selected cuts array
  const selectedCutsArray = cuts.filter((_, index) => selectedCuts.has(index));
  
  // Sort cuts by start time
  const sortedCuts = [...selectedCutsArray].sort((a, b) => a.startTime - b.startTime);

  // Calculate the virtual duration (duration minus cuts and buffers)
  const cutDuration = selectedCutsArray.reduce((sum, cut) => {
    const buffer = getBufferForCutType(cut.type);
    return sum + (cut.endTime - cut.startTime) + buffer;
  }, 0);
  const processedDuration = duration - cutDuration;

  // Convert virtual time to actual video time (skipping cuts)
  const virtualToActualTime = useCallback((vTime: number): number => {
    if (previewMode === 'original' || sortedCuts.length === 0) {
      return vTime;
    }

    let actualTime = vTime;
    let accumulatedCutTime = 0;

    for (const cut of sortedCuts) {
      const cutStart = cut.startTime;
      const cutEnd = cut.endTime;
      const buffer = getBufferForCutType(cut.type);
      const cutDuration = (cutEnd - cutStart) + buffer;

      if (vTime + accumulatedCutTime >= cutStart) {
        actualTime = vTime + accumulatedCutTime + cutDuration;
        accumulatedCutTime += cutDuration;
      } else {
        break;
      }
    }

    return Math.min(actualTime, duration);
  }, [previewMode, sortedCuts, duration]);

  // Convert actual time to virtual time
  const actualToVirtualTime = useCallback((aTime: number): number => {
    if (previewMode === 'original' || sortedCuts.length === 0) {
      return aTime;
    }

    let virtualTime = aTime;
    
    for (const cut of sortedCuts) {
      const buffer = getBufferForCutType(cut.type);
      const cutEndWithBuffer = cut.endTime + buffer;
      
      if (aTime > cutEndWithBuffer) {
        virtualTime -= (cut.endTime - cut.startTime) + buffer;
      } else if (aTime >= cut.startTime) {
        virtualTime = cut.startTime - sortedCuts
          .filter(c => c.endTime + getBufferForCutType(c.type) <= cut.startTime)
          .reduce((sum, c) => sum + (c.endTime - c.startTime) + getBufferForCutType(c.type), 0);
        break;
      }
    }

    return Math.max(0, virtualTime);
  }, [previewMode, sortedCuts]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Poll for cut skipping at high frequency
  useEffect(() => {
    if (!isPlaying || previewMode !== 'processed') return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      const t = video.currentTime;
      for (const cut of sortedCuts) {
        if (t >= cut.startTime && t < cut.endTime) {
          video.currentTime = cut.endTime;
          return;
        }
      }
    }, 30); // ~33fps polling

    return () => clearInterval(interval);
  }, [isPlaying, previewMode, sortedCuts]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const actualTime = video.currentTime;
    setCurrentTime(actualTime);

    // Also skip in timeupdate as fallback
    if (previewMode === 'processed') {
      for (const cut of sortedCuts) {
        if (actualTime >= cut.startTime && actualTime < cut.endTime) {
          video.currentTime = cut.endTime;
          return;
        }
      }
      setVirtualTime(actualToVirtualTime(actualTime));
    } else {
      setVirtualTime(actualTime);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;

    const seekPercent = parseFloat(e.target.value) / 100;
    
    if (previewMode === 'processed') {
      const targetVirtualTime = seekPercent * processedDuration;
      const targetActualTime = virtualToActualTime(targetVirtualTime);
      videoRef.current.currentTime = targetActualTime;
      setVirtualTime(targetVirtualTime);
    } else {
      const targetTime = seekPercent * duration;
      videoRef.current.currentTime = targetTime;
      setVirtualTime(targetTime);
    }
  };

  const resetToStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setVirtualTime(0);
      setCurrentTime(0);
    }
  };

  const getCurrentDuration = () => {
    return previewMode === 'processed' ? processedDuration : duration;
  };

  const getCurrentTime = () => {
    return previewMode === 'processed' ? virtualTime : currentTime;
  };

  const getProgressPercent = () => {
    const current = getCurrentTime();
    const total = getCurrentDuration();
    return total > 0 ? (current / total) * 100 : 0;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Video Player */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-[500px] object-contain"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          preload="metadata"
        />

        {/* Mode Indicator */}
        <div className="absolute top-2 left-2">
          {previewMode === 'processed' ? (
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
              <Scissors className="w-3 h-3" />
              <span>Edited Preview</span>
            </div>
          ) : (
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>Original</span>
            </div>
          )}
        </div>
        
        {/* Play/Pause Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="bg-white bg-opacity-90 rounded-full p-3">
            {isPlaying ? (
              <Pause className="w-6 h-6 text-gray-800" />
            ) : (
              <Play className="w-6 h-6 text-gray-800 ml-1" />
            )}
          </div>
        </div>
      </div>

      {/* Timeline with Cut Markers */}
      <div className="bg-gray-900 px-4 py-3">
        <div className="space-y-2">
          {/* Timeline */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={getProgressPercent()}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            
            {/* Cut markers */}
            <div className="absolute inset-0 pointer-events-none">
              {cuts.map((cut, index) => {
                if (!selectedCuts.has(index) || !duration) return null;

                const startPercent = (cut.startTime / duration) * 100;
                const widthPercent = ((cut.endTime - cut.startTime) / duration) * 100;

                return (
                  <div
                    key={index}
                    className={`absolute top-0 h-2 rounded ${
                      previewMode === 'processed' ? 'bg-red-500 opacity-50' : 'bg-red-500 opacity-70'
                    }`}
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 0.3)}%`
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-gray-300"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={resetToStart}
                className="text-white hover:text-gray-300"
                title="Reset to start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="text-xs text-gray-300 font-mono">
                {formatTime(getCurrentTime())} / {formatTime(getCurrentDuration())}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {previewMode === 'processed' && selectedCuts.size > 0 && (
                <span className="text-xs text-green-300 font-medium">
                  {selectedCuts.size} cuts applied
                </span>
              )}
              
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cut Summary + Mode Toggle */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {showProcessed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewMode('processed')}
                  className={`cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    previewMode === 'processed'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Preview with cuts skipped automatically"
                >
                  <Scissors className="w-3 h-3" />
                  Edited
                </button>
                <button
                  onClick={() => setPreviewMode('original')}
                  className={`cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    previewMode === 'original'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Play the full uncut video with cut markers on timeline"
                >
                  <Eye className="w-3 h-3" />
                  Original
                </button>
              </div>
            )}
            {selectedCuts.size > 0 && (
              <span className="text-gray-600">
                {selectedCuts.size} cuts • {formatTime(cutDuration - selectedCutsArray.reduce((sum, cut) => sum + getBufferForCutType(cut.type), 0))} removed
              </span>
            )}
          </div>
          {selectedCuts.size > 0 && (
            <span className="text-green-600 font-medium">
              Final: {formatTime(processedDuration)}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}