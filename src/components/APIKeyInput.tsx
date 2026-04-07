'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Pencil, Zap, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface APIKeyInputProps {
  label: string;
  getKeyUrl: string;
  getKeyLabel?: string;
  storedKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
  onTest?: (key: string) => Promise<boolean>;
  testTitle?: string;
  validate?: (key: string) => boolean;
  invalidMessage?: string;
  placeholder?: string;
}

type TestStatus = 'idle' | 'testing' | 'passed' | 'failed';

export default function APIKeyInput({
  label,
  getKeyUrl,
  storedKey,
  onSave,
  onClear,
  onTest,
  testTitle = 'Test API key',
  validate,
  invalidMessage = "Doesn't look like a valid API key",
  placeholder = 'API key...',
}: APIKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  useEffect(() => {
    if (storedKey) { setApiKey(storedKey); setSaved(true); }
  }, [storedKey]);

  const handleSave = () => { onSave(apiKey); setSaved(true); setTestStatus('idle'); };
  const handleEdit = () => { setSaved(false); setTestStatus('idle'); };
  const handleRemove = () => { onClear(); setApiKey(''); setSaved(false); setTestStatus('idle'); };

  const handleTest = async () => {
    if (!onTest) return;
    setTestStatus('testing');
    try {
      const ok = await onTest(apiKey);
      setTestStatus(ok ? 'passed' : 'failed');
      if (ok) toast.success(`${label} connected`);
      else toast.error('Key rejected');
    } catch (e) {
      setTestStatus('failed');
      toast.error(e instanceof Error ? e.message : 'Test failed');
    }
  };

  const validFormat = validate ? validate(apiKey) : apiKey.length > 0;

  if (saved) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
        <span className="text-xs text-gray-400 truncate flex-1 font-mono">{'•'.repeat(6)}{apiKey.slice(-4)}</span>
        <button onClick={handleEdit} className="cursor-pointer text-gray-400 hover:text-gray-600" title="Edit">
          <Pencil className="w-3 h-3" />
        </button>
        {onTest && (
          <button onClick={handleTest} disabled={testStatus === 'testing'} className="cursor-pointer text-gray-400 hover:text-gray-600 disabled:opacity-50" title={testTitle}>
            {testStatus === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> :
             testStatus === 'passed' ? <CheckCircle className="w-3 h-3 text-green-500" /> :
             testStatus === 'failed' ? <XCircle className="w-3 h-3 text-red-500" /> :
             <Zap className="w-3 h-3" />}
          </button>
        )}
        <button onClick={handleRemove} className="cursor-pointer text-gray-400 hover:text-red-500" title="Remove">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <a href={getKeyUrl} target="_blank" className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
          Get key <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
          onKeyDown={(e) => e.key === 'Enter' && validFormat && handleSave()}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-300"
        />
        <button
          onClick={handleSave}
          disabled={!validFormat}
          className="cursor-pointer px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {apiKey && !validFormat && (
        <p className="text-[10px] text-red-400">{invalidMessage}</p>
      )}
    </div>
  );
}
