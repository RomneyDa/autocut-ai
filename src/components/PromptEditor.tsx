'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
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

  const handleChange = (value: string) => {
    if (activeTab === 'audio') {
      setAudioPrompt(value);
    } else {
      setVideoPrompt(value);
    }
    setStoredPrompt(activeTab, value);
  };

  const handleReset = () => {
    resetStoredPrompt(activeTab);
    const def = activeTab === 'audio' ? DEFAULT_AUDIO_PROMPT : DEFAULT_VIDEO_ONLY_PROMPT;
    if (activeTab === 'audio') {
      setAudioPrompt(def);
    } else {
      setVideoPrompt(def);
    }
  };

  const audioIsDefault = isDefaultPrompt('audio', audioPrompt);
  const videoIsDefault = isDefaultPrompt('video', videoPrompt);
  const anyCustomized = !audioIsDefault || !videoIsDefault;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Prompt
        {anyCustomized && <span className="text-blue-500">(customized)</span>}
      </button>

      {open && (
        <div className={`mt-2 space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'audio' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setActiveTab('audio')}
              >
                Audio + Video
                {!audioIsDefault && <span className="text-blue-300 ml-1">*</span>}
              </Button>
              <Button
                variant={activeTab === 'video' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setActiveTab('video')}
              >
                Video Only
                {!videoIsDefault && <span className="text-blue-300 ml-1">*</span>}
              </Button>
            </div>
            {!isDefault && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleReset}
                title="Reset to default prompt"
              >
                <RotateCcw />
                Use default
              </Button>
            )}
          </div>

          <textarea
            value={currentPrompt}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs font-mono border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            rows={12}
            maxLength={1_000_000}
          />

          <p className="text-xs text-muted-foreground">
            This prompt is sent to Gemini along with your video frames and audio.
            Per-video instructions are appended after this prompt.
          </p>
        </div>
      )}
    </div>
  );
}
