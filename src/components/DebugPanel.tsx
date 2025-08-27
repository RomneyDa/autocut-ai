'use client';

import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';

interface DebugPanelProps {
  data: unknown;
  title?: string;
}

export default function DebugPanel({ data, title = "Debug Info" }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-300 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg"
      >
        <div className="flex items-center space-x-2">
          <Bug className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      
      {isOpen && (
        <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <pre className="text-xs text-gray-800 overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}