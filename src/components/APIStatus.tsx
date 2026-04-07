'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface APIEntry {
  status: string;
  error?: string;
}

interface APIStatusData {
  gemini: APIEntry;
  assembly: APIEntry;
  environment: {
    hasGeminiKey: boolean;
    hasAssemblyKey: boolean;
    nodeEnv: string;
  };
}

interface APIStatusProps {
  onStatusChecked?: (allConnected: boolean) => void;
}

export default function APIStatus({ onStatusChecked }: APIStatusProps) {
  const [status, setStatus] = useState<APIStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAPIs();
  }, []);

  const checkAPIs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/test-apis`);
      const data = await response.json();
      setStatus(data);
      
      const allConnected = data.gemini.status === 'connected' && data.assembly.status === 'connected';
      onStatusChecked?.(allConnected);
    } catch (error) {
      console.error('Failed to check API status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (apiStatus: string) => {
    switch (apiStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no-key':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />;
    }
  };

  const getStatusColor = (apiStatus: string) => {
    switch (apiStatus) {
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'no-key':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusMessage = (apiName: string, apiStatus: string, error?: string) => {
    switch (apiStatus) {
      case 'connected':
        return `${apiName} API is connected and working`;
      case 'error':
        return `${apiName} API error: ${error || 'Unknown error'}`;
      case 'no-key':
        return `${apiName} API key not found in environment`;
      default:
        return `Checking ${apiName} API...`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        <span className="text-sm text-gray-700">Checking API connections...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">Failed to check API status</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">API Status</h3>
        <button
          onClick={checkAPIs}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>
      
      {/* Gemini API Status */}
      <div className={`p-3 border rounded-lg ${getStatusColor(status.gemini.status)}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon(status.gemini.status)}
          <span className="text-sm font-medium">Google Gemini</span>
        </div>
        <p className="text-xs mt-1 text-gray-600">
          {getStatusMessage('Gemini', status.gemini.status, status.gemini.error)}
        </p>
      </div>

      {/* AssemblyAI Status */}
      <div className={`p-3 border rounded-lg ${getStatusColor(status.assembly.status)}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon(status.assembly.status)}
          <span className="text-sm font-medium">AssemblyAI</span>
        </div>
        <p className="text-xs mt-1 text-gray-600">
          {getStatusMessage('AssemblyAI', status.assembly.status, status.assembly.error)}
        </p>
      </div>

      {/* Environment Info */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Environment</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Gemini Key: {status.environment.hasGeminiKey ? '✓ Set' : '✗ Missing'}</div>
          <div>Assembly Key: {status.environment.hasAssemblyKey ? '✓ Set' : '✗ Missing'}</div>
          <div>Node Env: {status.environment.nodeEnv}</div>
        </div>
      </div>
    </div>
  );
}