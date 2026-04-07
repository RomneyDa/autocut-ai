'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Pencil, Zap, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  getKeyLabel,
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
    if (storedKey) {
      setApiKey(storedKey);
      setSaved(true);
    }
  }, [storedKey]);

  const handleSave = () => {
    onSave(apiKey);
    setSaved(true);
    setTestStatus('idle');
  };

  const handleEdit = () => {
    setSaved(false);
    setTestStatus('idle');
  };

  const handleRemove = () => {
    onClear();
    setApiKey('');
    setSaved(false);
    setTestStatus('idle');
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTestStatus('testing');
    try {
      const ok = await onTest(apiKey);
      if (ok) {
        setTestStatus('passed');
        toast.success(`${label} connected`);
      } else {
        setTestStatus('failed');
        toast.error('Key rejected by API');
      }
    } catch (e) {
      setTestStatus('failed');
      toast.error(e instanceof Error ? e.message : 'Test failed');
    }
  };

  const validFormat = validate ? validate(apiKey) : apiKey.length > 0;

  const testIcon = testStatus === 'testing' ? <Loader2 className="animate-spin" /> :
    testStatus === 'passed' ? <CheckCircle className="text-green-500" /> :
    testStatus === 'failed' ? <XCircle className="text-red-500" /> :
    <Zap />;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <a
          href={getKeyUrl}
          target="_blank"
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          {saved ? (getKeyLabel || 'Manage keys') : (getKeyLabel || 'Get a key')}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {saved ? (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-500 truncate">
            {'•'.repeat(8)}{apiKey.slice(-4)}
          </div>
          <Button variant="outline" size="sm" onClick={handleEdit} title={`Edit ${label}`}>
            <Pencil />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          {onTest && (
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testStatus === 'testing'} title={testTitle}>
              {testIcon}
              <span className="hidden sm:inline">Test</span>
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleRemove} title={`Remove ${label}`}>
            <Trash2 />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
            onKeyDown={(e) => e.key === 'Enter' && validFormat && handleSave()}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button size="sm" onClick={handleSave} disabled={!validFormat}>
            Save
          </Button>
        </div>
      )}

      {!saved && apiKey && !validFormat && (
        <p className="text-xs text-red-400">{invalidMessage}</p>
      )}
    </div>
  );
}
