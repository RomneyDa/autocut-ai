'use client';

import { useState, useEffect } from 'react';
import APIKeyInput from './APIKeyInput';
import {
  getStoredGeminiKey, setStoredGeminiKey, clearStoredGeminiKey,
  getStoredAssemblyKey, setStoredAssemblyKey, clearStoredAssemblyKey,
} from '@/lib/api-keys';

const GEMINI_KEY_REGEX = /^AIza[A-Za-z0-9_-]{31,}$/;

interface APIKeyManagerProps {
  onKeysChanged: (connected: boolean) => void;
}

export default function APIKeyManager({ onKeysChanged }: APIKeyManagerProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [assemblyKey, setAssemblyKey] = useState('');

  useEffect(() => {
    setGeminiKey(getStoredGeminiKey());
    setAssemblyKey(getStoredAssemblyKey());
  }, []);

  useEffect(() => {
    onKeysChanged(!!geminiKey && !!assemblyKey);
  }, [geminiKey, assemblyKey]);

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
    // 200 = valid key (returns list), 401 = bad key
    return res.status !== 401;
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
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
  );
}
