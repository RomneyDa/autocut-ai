'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Scissors, Eye, RotateCcw } from 'lucide-react';
import { CutRecommendation } from '@/lib/types';
import { buildSegmentMap, actualToVirtual, virtualToActual, getSkipTarget } from '@/lib/cut-engine';

interface VideoPreviewWithCutsProps {
  file: File;
  cuts: CutRecommendation[];
  selectedCuts: Set<number>;
  minSegmentMs?: number;
  onMinSegmentChange?: (v: number) => void;
  className?: string;
  showProcessed?: boolean;
}

export default function VideoPreviewWithCuts({
  file,
  cuts,
  selectedCuts,
  minSegmentMs = 0,
  onMinSegmentChange,
  className = '',
  showProcessed = false
}: VideoPreviewWithCutsProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Deterministic segment map — recomputed when cuts/selection/minGap/duration change
  const { skipRegions, gapFills, merged, segments, editedDuration } = useMemo(
    () => buildSegmentMap(cuts, selectedCuts, duration, minSegmentMs),
    [cuts, selectedCuts, duration, minSegmentMs]
  );

  // Keep ref for use in timeupdate (avoids stale closures)
  const mergedRef = useRef(merged);
  const segmentsRef = useRef(segments);
  mergedRef.current = merged;
  segmentsRef.current = segments;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const virtualTime = actualToVirtual(currentTime, segments);
  const displayTime = previewMode === 'processed' ? virtualTime : currentTime;
  const displayDuration = previewMode === 'processed' ? editedDuration : duration;

  // Slider always maps to actual timeline so the dot jumps over red/yellow regions
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // RAF loop for skip detection — runs every frame for instant skipping
  const rafRef = useRef(0);
  const previewModeRef = useRef(previewMode);
  previewModeRef.current = previewMode;

  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      if (video && !video.paused && previewModeRef.current === 'processed') {
        const skipTo = getSkipTarget(video.currentTime, mergedRef.current);
        if (skipTo !== null) {
          video.currentTime = skipTo;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // timeupdate just syncs display state
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const targetActual = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = targetActual;
    // RAF will handle skipping if we land in a cut region
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetToStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Video */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-[500px] object-contain"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          preload="metadata"
        />
        <div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="bg-white bg-opacity-90 rounded-full p-3">
            {isPlaying ? <Pause className="w-6 h-6 text-gray-800" /> : <Play className="w-6 h-6 text-gray-800 ml-1" />}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-gray-900 px-4 py-3 space-y-2">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
          {/* Cut markers (red) */}
          <div className="absolute inset-0 pointer-events-none">
            {skipRegions.map((r, i) => {
              if (!duration) return null;
              return (
                <div
                  key={`cut-${i}`}
                  className="absolute top-0 h-2 rounded bg-red-500 opacity-60"
                  style={{
                    left: `${(r.start / duration) * 100}%`,
                    width: `${Math.max(((r.end - r.start) / duration) * 100, 0.3)}%`,
                  }}
                />
              );
            })}
            {/* Gap-fill markers (yellow) */}
            {gapFills.map((g, i) => {
              if (!duration) return null;
              return (
                <div
                  key={`gap-${i}`}
                  className="absolute top-0 h-2 rounded bg-yellow-400 opacity-60"
                  style={{
                    left: `${(g.start / duration) * 100}%`,
                    width: `${Math.max(((g.end - g.start) / duration) * 100, 0.3)}%`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={togglePlayPause} className="text-white hover:text-gray-300">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={resetToStart} className="text-white hover:text-gray-300" title="Reset to start">
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-300 font-mono">
              {formatTime(displayTime)} / {formatTime(displayDuration)}
            </span>
          </div>
          <button onClick={toggleMute} className="text-white hover:text-gray-300">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Toggle + Min Gap */}
      {showProcessed && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setPreviewMode('processed')}
              className={`cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                previewMode === 'processed' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Preview with cuts skipped"
            >
              <Scissors className="w-3 h-3" /> Edited
            </button>
            <button
              onClick={() => setPreviewMode('original')}
              className={`cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                previewMode === 'original' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Full uncut video"
            >
              <Eye className="w-3 h-3" /> Original
            </button>
            {onMinSegmentChange && (
              <div className="flex items-center gap-1.5 ml-auto">
                <label className="text-[10px] text-gray-400 shrink-0">Min gap</label>
                <input
                  type="range" min="0" max="500" step="10"
                  value={minSegmentMs}
                  onChange={(e) => onMinSegmentChange(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-[10px] text-gray-400 w-8">{minSegmentMs}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
        .slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: none; }
      `}</style>
    </div>
  );
}
