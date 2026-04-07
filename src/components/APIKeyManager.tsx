'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Pencil } from 'lucide-react';
import { getStoredKey, setStoredKey } from '@/lib/api-keys';

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
}

type KeyStatus = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'missing';

export default function APIKeyManager({ onKeysChanged }: APIKeyManagerProps) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<KeyStatus>('unchecked');
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) {
      setApiKey(stored);
      validateKey(stored);
    } else {
      setEditing(true);
      setStatus('missing');
    }
  }, []);

  const validateKey = async (key: string) => {
    setStatus('checking');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/test-apis`,
        { headers: { 'x-gemini-api-key': key } }
      );
      const data = await response.json();

      const valid = data.gemini.status === 'connected';
      setStatus(valid ? 'valid' : 'invalid');
      onKeysChanged(valid);

      if (valid) {
        setStoredKey(key);
        setEditing(false);
      }
    } catch {
      setStatus('invalid');
      onKeysChanged(false);
    }
  };

  const handleSave = () => {
    if (apiKey) validateKey(apiKey);
  };

  const statusIndicator = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
      case 'valid':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'invalid':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  if (!editing && status === 'valid') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Gemini API key connected</span>
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
          {statusIndicator()}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Gemini API key"
            className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && apiKey && handleSave()}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!apiKey}
        className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Validate & Save
      </button>

      <p className="text-xs text-gray-500 text-center">
        Key is stored in your browser only — never saved on our server.
      </p>
    </div>
  );
}
