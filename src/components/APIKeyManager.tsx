'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import APIKeyInput from './APIKeyInput';
import {
  getStoredGeminiKey, setStoredGeminiKey, clearStoredGeminiKey,
  getStoredAssemblyKey, setStoredAssemblyKey, clearStoredAssemblyKey,
} from '@/lib/api-keys';

const GEMINI_KEY_REGEX = /^AIza[A-Za-z0-9_-]{31,}$/;

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
  forceCollapsed?: boolean;
}

export default function APIKeyManager({ onKeysChanged, forceCollapsed = false }: APIKeyManagerProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [assemblyKey, setAssemblyKey] = useState('');
  const [open, setOpen] = useState(false);

  const bothPresent = !!geminiKey && !!assemblyKey;

  useEffect(() => {
    const g = getStoredGeminiKey();
    const a = getStoredAssemblyKey();
    setGeminiKey(g);
    setAssemblyKey(a);
    if (!g || !a) setOpen(true);
  }, []);

  useEffect(() => {
    onKeysChanged(bothPresent);
  }, [geminiKey, assemblyKey]);

  const isOpen = forceCollapsed ? false : (!bothPresent || open);

  const testGemini = async (key: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    return res.ok;
  };

  const testAssembly = async (key: string) => {
    const res = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: { authorization: key },
    });
    return res.status !== 401;
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="font-medium">API Keys</span>
        {!isOpen && bothPresent && <span className="text-green-600">(saved)</span>}
        {!bothPresent && <span className="text-red-400">(required)</span>}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-4">
          <APIKeyInput
            label="Google Gemini API Key"
            getKeyUrl="https://aistudio.google.com/api-keys"
            storedKey={geminiKey}
            onSave={(k) => { setStoredGeminiKey(k); setGeminiKey(k); }}
            onClear={() => { clearStoredGeminiKey(); setGeminiKey(''); }}
            onTest={testGemini}
            testTitle="Test connection to Gemini (no tokens used)"
            validate={(k) => GEMINI_KEY_REGEX.test(k)}
            invalidMessage="Doesn't look like a Gemini API key"
            placeholder="AIza..."
          />
          <APIKeyInput
            label="AssemblyAI API Key"
            getKeyUrl="https://www.assemblyai.com/app/account"
            storedKey={assemblyKey}
            onSave={(k) => { setStoredAssemblyKey(k); setAssemblyKey(k); }}
            onClear={() => { clearStoredAssemblyKey(); setAssemblyKey(''); }}
            onTest={testAssembly}
            testTitle="Test connection to AssemblyAI"
            validate={(k) => k.length >= 20}
            invalidMessage="Key seems too short"
            placeholder="AssemblyAI API key..."
          />
        </div>
      )}
    </div>
  );
}
