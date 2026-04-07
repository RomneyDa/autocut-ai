'use client';

import { ProcessingStatus as ProcessingStatusType } from '@/lib/types';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingStatusProps {
  status: ProcessingStatusType;
}

export default function ProcessingStatus({ status }: ProcessingStatusProps) {
  const getIcon = () => {
    switch (status.stage) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStageLabel = () => {
    switch (status.stage) {
      case 'uploading':
        return 'Uploading video';
      case 'extracting':
        return 'Extracting frames and audio';
      case 'transcribing':
        return 'Transcribing audio';
      case 'analyzing':
        return 'Analyzing with AI';
      case 'complete':
        return 'Analysis complete';
      case 'error':
        return 'Error occurred';
      default:
        return 'Processing';
    }
  };

  const getProgressColor = () => {
    switch (status.stage) {
      case 'complete':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        {getIcon()}
        <div>
          <h3 className="text-lg font-medium text-gray-900">{getStageLabel()}</h3>
          <p className="text-sm text-gray-500">{status.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{Math.round(status.progress)}%</span>
      </div>
    </div>
  );
}