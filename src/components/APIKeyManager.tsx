'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Pencil, Zap, Trash2 } from 'lucide-react';
import { getStoredKey, setStoredKey, clearStoredKey } from '@/lib/api-keys';

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
}

type TestStatus = 'idle' | 'testing' | 'passed' | 'failed';

const GEMINI_KEY_REGEX = /^AIza[A-Za-z0-9_-]{31,}$/;

export default function APIKeyManager({ onKeysChanged }: APIKeyManagerProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) {
      setApiKey(stored);
      setSaved(true);
      onKeysChanged(true);
    }
  }, []);

  const handleSave = () => {
    setStoredKey(apiKey);
    setSaved(true);
    setTestStatus('idle');
    onKeysChanged(true);
  };

  const handleEdit = () => {
    setSaved(false);
    setTestStatus('idle');
    setTestError('');
    onKeysChanged(false);
  };

  const handleRemove = () => {
    clearStoredKey();
    setApiKey('');
    setSaved(false);
    setTestStatus('idle');
    setTestError('');
    onKeysChanged(false);
  };

  const testKey = async () => {
    setTestStatus('testing');
    setTestError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/test-apis`,
        { headers: { 'x-gemini-api-key': apiKey } }
      );
      const data = await response.json();

      if (data.gemini.status === 'connected') {
        setTestStatus('passed');
      } else {
        setTestStatus('failed');
        setTestError(data.gemini.error || 'Key rejected by Gemini API');
      }
    } catch {
      setTestStatus('failed');
      setTestError('Could not reach the server');
    }
  };

  const validFormat = GEMINI_KEY_REGEX.test(apiKey);

  return (
    <div className="max-w-lg mx-auto space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700">
          Google Gemini API Key
        </label>
        <p className="text-xs text-gray-400">Browser-only storage. Passed through in headers, never stored on our server.</p>
      </div>

      {saved ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-500 truncate">
            {'•'.repeat(8)}{apiKey.slice(-4)}
          </div>
          <button
            onClick={handleEdit}
            className="cursor-pointer px-2.5 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1.5 text-gray-600"
            title="Edit your API key"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={testKey}
            disabled={testStatus === 'testing'}
            className="cursor-pointer px-2.5 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 text-gray-600"
            title="Test connection to Gemini API (no tokens used)"
          >
            {testStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
             testStatus === 'passed' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
             testStatus === 'failed' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
             <Zap className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Test</span>
          </button>
          <button
            onClick={handleRemove}
            className="cursor-pointer px-2.5 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-red-50 hover:border-red-300 flex items-center gap-1.5 text-gray-600 hover:text-red-600"
            title="Remove API key from browser storage"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
            onKeyDown={(e) => e.key === 'Enter' && validFormat && handleSave()}
            placeholder="AIza..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          <button
            onClick={handleSave}
            disabled={!validFormat}
            className="cursor-pointer px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      )}

      {!saved && apiKey && !validFormat && (
        <p className="text-xs text-red-400">Doesn&apos;t look like a Gemini API key</p>
      )}
      {testStatus === 'passed' && (
        <p className="text-xs text-green-600">Connected to Gemini</p>
      )}
      {testStatus === 'failed' && (
        <p className="text-xs text-red-500">{testError}</p>
      )}

    </div>
  );
}
