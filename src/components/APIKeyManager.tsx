'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Pencil } from 'lucide-react';
import { getStoredKeys, setStoredKeys } from '@/lib/api-keys';

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
}

type KeyStatus = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'missing';

export default function APIKeyManager({ onKeysChanged }: APIKeyManagerProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [assemblyKey, setAssemblyKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<KeyStatus>('unchecked');
  const [assemblyStatus, setAssemblyStatus] = useState<KeyStatus>('unchecked');
  const [showGemini, setShowGemini] = useState(false);
  const [showAssembly, setShowAssembly] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const stored = getStoredKeys();
    if (stored.geminiKey) setGeminiKey(stored.geminiKey);
    if (stored.assemblyKey) setAssemblyKey(stored.assemblyKey);
    if (stored.geminiKey && stored.assemblyKey) {
      validateKeys(stored.geminiKey, stored.assemblyKey);
    } else {
      setEditing(true);
      if (!stored.geminiKey) setGeminiStatus('missing');
      if (!stored.assemblyKey) setAssemblyStatus('missing');
    }
  }, []);

  const validateKeys = async (gKey: string, aKey: string) => {
    setGeminiStatus('checking');
    setAssemblyStatus('checking');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/test-apis`,
        { headers: { 'x-gemini-api-key': gKey, 'x-assembly-api-key': aKey } }
      );
      const data = await response.json();

      const gValid = data.gemini.status === 'connected';
      const aValid = data.assembly.status === 'connected';
      setGeminiStatus(gValid ? 'valid' : 'invalid');
      setAssemblyStatus(aValid ? 'valid' : 'invalid');
      onKeysChanged(gValid && aValid);

      if (gValid && aValid) {
        setEditing(false);
      }
    } catch {
      setGeminiStatus('invalid');
      setAssemblyStatus('invalid');
      onKeysChanged(false);
    }
  };

  const handleSave = () => {
    setStoredKeys(geminiKey, assemblyKey);
    if (geminiKey && assemblyKey) {
      validateKeys(geminiKey, assemblyKey);
    }
  };

  const statusIndicator = (status: KeyStatus) => {
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

  const bothValid = geminiStatus === 'valid' && assemblyStatus === 'valid';

  if (!editing && bothValid) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>API keys connected</span>
        <button
          onClick={() => setEditing(true)}
          className="ml-1 p-1 text-gray-400 hover:text-gray-600"
          title="Edit API keys"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-3">
      <div className="space-y-2">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
            Google Gemini
            {statusIndicator(geminiStatus)}
          </label>
          <div className="relative">
            <input
              type={showGemini ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Gemini API key"
              className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
            <button
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
            AssemblyAI
            {statusIndicator(assemblyStatus)}
          </label>
          <div className="relative">
            <input
              type={showAssembly ? 'text' : 'password'}
              value={assemblyKey}
              onChange={(e) => setAssemblyKey(e.target.value)}
              placeholder="AssemblyAI API key"
              className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
            <button
              onClick={() => setShowAssembly(!showAssembly)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showAssembly ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!geminiKey || !assemblyKey}
        className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save & Validate
      </button>

      <p className="text-xs text-gray-500 text-center">
        Keys are stored in your browser only — never saved on our server.
      </p>
    </div>
  );
}
