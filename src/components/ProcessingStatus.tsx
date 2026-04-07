'use client';

import { ProcessingStatus as ProcessingStatusType } from '@/lib/types';
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ProcessingStatusProps {
  status: ProcessingStatusType;
  onCancel?: () => void;
}

export default function ProcessingStatus({ status, onCancel }: ProcessingStatusProps) {
  const getIcon = () => {
    switch (status.stage) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />;
      default:
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />;
    }
  };

  const getProgressColor = () => {
    switch (status.stage) {
      case 'complete': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <p className="text-sm text-gray-700">{status.message}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="cursor-pointer text-gray-400 hover:text-gray-600 shrink-0"
            title="Cancel"
          >
            <span className="hidden sm:inline text-xs underline">Cancel</span>
            <X className="w-4 h-4 sm:hidden" />
          </button>
        )}
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
