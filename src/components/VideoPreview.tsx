'use client';

import { useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoPreviewProps {
  file: File;
  className?: string;
}

export default function VideoPreview({ file, className = '' }: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

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

  const togglePlayPause = () => {
    const video = document.getElementById('preview-video') as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const toggleMute = () => {
    const video = document.getElementById('preview-video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = document.getElementById('preview-video') as HTMLVideoElement;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    if (video) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className={`bg-black rounded-lg overflow-hidden ${className}`}>
      <div className="relative">
        <video
          id="preview-video"
          src={videoUrl}
          className="w-full h-auto"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          preload="metadata"
        />
        
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

      {/* Controls */}
      <div className="bg-gray-900 px-4 py-3">
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

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <span className="text-xs text-gray-300 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

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