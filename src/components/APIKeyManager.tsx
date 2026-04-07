'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Pencil } from 'lucide-react';
import { getStoredKey, setStoredKey } from '@/lib/api-keys';

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
}

type TestStatus = 'idle' | 'testing' | 'passed' | 'failed';

const GEMINI_KEY_REGEX = /^AIza[A-Za-z0-9_-]{31,}$/;

function isValidKeyFormat(key: string) {
  return GEMINI_KEY_REGEX.test(key);
}

export default function APIKeyManager({ onKeysChanged }: APIKeyManagerProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored && isValidKeyFormat(stored)) {
      setApiKey(stored);
      setSaved(true);
      onKeysChanged(true);
    } else {
      setEditing(true);
    }
  }, []);

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    setTestStatus('idle');
    setTestError('');

    if (isValidKeyFormat(value)) {
      setStoredKey(value);
      setSaved(true);
      onKeysChanged(true);
    } else {
      setSaved(false);
      onKeysChanged(false);
    }
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

  const validFormat = isValidKeyFormat(apiKey);

  if (!editing && saved) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Gemini API key saved</span>
        <button
          onClick={() => setEditing(true)}
          className="ml-1 p-1 text-gray-400 hover:text-gray-600"
          title="Edit API key"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
          Google Gemini API Key
          {saved && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
          {apiKey && !validFormat && <XCircle className="w-3.5 h-3.5 text-red-400" />}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {apiKey && !validFormat && (
          <p className="text-xs text-red-400 mt-1">Doesn&apos;t look like a Gemini API key</p>
        )}
      </div>

      {saved && (
        <div className="space-y-2">
          <button
            onClick={testKey}
            disabled={testStatus === 'testing'}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testStatus === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {testStatus === 'passed' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {testStatus === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
            Test Key
          </button>
          {testStatus === 'passed' && (
            <p className="text-xs text-green-600 text-center">Key works — connected to Gemini</p>
          )}
          {testStatus === 'failed' && (
            <p className="text-xs text-red-500 text-center">{testError}</p>
          )}
          <p className="text-xs text-gray-400 text-center">
            Sends a short text message to Gemini to verify your key works. Uses a few tokens.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Key is stored in your browser only — never saved on the server. Passed through in headers.
      </p>
    </div>
  );
}
