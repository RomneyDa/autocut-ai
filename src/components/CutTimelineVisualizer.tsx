'use client';

interface Cut {
  startTime: number;
  endTime: number;
  type: string;
  reason: string;
}

interface CutTimelineVisualizerProps {
  duration: number;
  cuts: Cut[];
  selectedCuts: Set<number>;
  currentTime?: number;
  onTimeSeek?: (time: number) => void;
  className?: string;
}

export default function CutTimelineVisualizer({
  duration,
  cuts,
  selectedCuts,
  currentTime = 0,
  onTimeSeek,
  className = ''
}: CutTimelineVisualizerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCutTypeColor = (type: string) => {
    switch (type) {
      case 'filler':
        return 'bg-yellow-500';
      case 'silence':
        return 'bg-gray-500';
      case 'repetition':
        return 'bg-blue-500';
      default:
        return 'bg-purple-500';
    }
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimeSeek) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onTimeSeek(Math.max(0, Math.min(duration, time)));
  };

  // Create segments for visualization
  const segments = [];
  let lastEnd = 0;

  cuts.forEach((cut, index) => {
    if (!selectedCuts.has(index)) return;

    // Add keep segment before cut (if any)
    if (cut.startTime > lastEnd) {
      segments.push({
        type: 'keep',
        start: lastEnd,
        end: cut.startTime,
        duration: cut.startTime - lastEnd
      });
    }

    // Add cut segment
    segments.push({
      type: 'cut',
      start: cut.startTime,
      end: cut.endTime,
      duration: cut.endTime - cut.startTime,
      cutType: cut.type,
      reason: cut.reason
    });

    lastEnd = cut.endTime;
  });

  // Add final keep segment
  if (lastEnd < duration) {
    segments.push({
      type: 'keep',
      start: lastEnd,
      end: duration,
      duration: duration - lastEnd
    });
  }

  const selectedCutsArray = cuts.filter((_, index) => selectedCuts.has(index));
  const totalCutDuration = selectedCutsArray.reduce((sum, cut) => sum + (cut.endTime - cut.startTime), 0);
  const processedDuration = duration - totalCutDuration;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Timeline Preview</h3>
          <div className="text-xs text-gray-600">
            {formatTime(processedDuration)} final duration
          </div>
        </div>

        {/* Timeline */}
        <div 
          className="relative h-12 bg-gray-100 rounded-lg cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Segments */}
          {segments.map((segment, index) => {
            const widthPercent = (segment.duration / duration) * 100;
            const leftPercent = (segment.start / duration) * 100;

            return (
              <div
                key={index}
                className={`absolute h-full transition-all duration-200 ${
                  segment.type === 'cut' 
                    ? `${getCutTypeColor(segment.cutType || '')} opacity-60` 
                    : 'bg-green-400'
                }`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
                title={
                  segment.type === 'cut' 
                    ? `Cut: ${segment.reason} (${formatTime(segment.start)} - ${formatTime(segment.end)})`
                    : `Keep: ${formatTime(segment.start)} - ${formatTime(segment.end)}`
                }
              >
                {segment.type === 'cut' && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-white text-xs font-bold opacity-80">✂️</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Current time indicator */}
          <div
            className="absolute top-0 w-0.5 h-full bg-red-600 z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-600 rounded-full"></div>
          </div>

          {/* Time markers */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-gray-500 px-1">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span className="text-gray-600">Keep</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">Filler</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-600">Silence</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Repetition</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">{formatTime(duration)}</div>
              <div className="text-xs text-gray-600">Original</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">-{formatTime(totalCutDuration)}</div>
              <div className="text-xs text-gray-600">Removed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{formatTime(processedDuration)}</div>
              <div className="text-xs text-gray-600">Final</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Math.round((totalCutDuration / duration) * 100)}%
              </div>
              <div className="text-xs text-gray-600">Reduction</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}