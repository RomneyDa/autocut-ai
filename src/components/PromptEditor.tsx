'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getStoredPrompts,
  setStoredPrompt,
  resetStoredPrompt,
  isDefaultPrompt,
  DEFAULT_AUDIO_PROMPT,
  DEFAULT_VIDEO_ONLY_PROMPT,
} from '@/lib/gemini-prompts';

export default function PromptEditor({ disabled = false }: { disabled?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');

  useEffect(() => {
    const stored = getStoredPrompts();
    setAudioPrompt(stored.audio);
    setVideoPrompt(stored.video);
  }, []);

  const currentPrompt = activeTab === 'audio' ? audioPrompt : videoPrompt;
  const isDefault = isDefaultPrompt(activeTab, currentPrompt);
  const audioIsDefault = isDefaultPrompt('audio', audioPrompt);
  const videoIsDefault = isDefaultPrompt('video', videoPrompt);
  const anyCustomized = !audioIsDefault || !videoIsDefault;

  const handleChange = (value: string) => {
    if (activeTab === 'audio') setAudioPrompt(value);
    else setVideoPrompt(value);
    setStoredPrompt(activeTab, value);
  };

  const handleReset = () => {
    resetStoredPrompt(activeTab);
    const def = activeTab === 'audio' ? DEFAULT_AUDIO_PROMPT : DEFAULT_VIDEO_ONLY_PROMPT;
    if (activeTab === 'audio') setAudioPrompt(def);
    else setVideoPrompt(def);
  };

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 w-full"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>View / Edit</span>
        {anyCustomized && <span className="text-blue-500 ml-1">(edited)</span>}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <Button variant={activeTab === 'audio' ? 'default' : 'outline'} size="xs" onClick={() => setActiveTab('audio')}>
              With Audio{!audioIsDefault && ' *'}
            </Button>
            <Button variant={activeTab === 'video' ? 'default' : 'outline'} size="xs" onClick={() => setActiveTab('video')}>
              No Audio{!videoIsDefault && ' *'}
            </Button>
            {!isDefault && (
              <Button variant="ghost" size="xs" onClick={handleReset} title="Reset to default">
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
          <textarea
            value={currentPrompt}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-2 py-1.5 text-[11px] font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
            rows={10}
            maxLength={1_000_000}
          />
        </div>
      )}
    </div>
  );
}
