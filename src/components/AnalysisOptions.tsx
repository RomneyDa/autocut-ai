'use client';

import { useState, useEffect, useMemo } from 'react';
import { type GeminiModelInfo, fetchAvailableModels } from '@/lib/gemini-models';
import { getStoredGeminiKey } from '@/lib/api-keys';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export interface AnalysisConfig {
  quality: 'high' | 'medium' | 'low';
  fps: number;
  modelId: string;
}

interface AnalysisOptionsProps {
  videoDuration: number;
  videoSizeMB: number;
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
}

// Gemini token rates (frames+transcript mode)
const TOKENS_PER_IMAGE_SMALL = 258;
const TOKENS_PER_IMAGE_LOW = 66;
const TOKENS_PER_SEC_TRANSCRIPT = 3; // ~1 token/word, ~2.5 words/sec

// AssemblyAI pricing (per hour)
const ASSEMBLY_PRICE_PER_HOUR = 0.15; // Universal-2 default

function estimateOutputTokens(durationSec: number): number {
  return Math.ceil(200 + durationSec * 30);
}

function estimateTokens(config: AnalysisConfig, durationSec: number) {
  const frameCount = Math.ceil(durationSec * config.fps);
  const tokensPerFrame = config.quality === 'low' ? TOKENS_PER_IMAGE_LOW : TOKENS_PER_IMAGE_SMALL;
  const imageTokens = frameCount * tokensPerFrame;
  const transcriptTokens = Math.ceil(durationSec * TOKENS_PER_SEC_TRANSCRIPT);
  const outputTokens = estimateOutputTokens(durationSec);
  return { imageTokens, transcriptTokens, outputTokens, totalInput: imageTokens + transcriptTokens };
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  durationSec: number,
  model: GeminiModelInfo | null,
) {
  if (!model) return null;
  const geminiInputCost = (inputTokens / 1_000_000) * model.inputPricePerM;
  const geminiOutputCost = (outputTokens / 1_000_000) * model.outputPricePerM;
  const assemblyCost = (durationSec / 3600) * ASSEMBLY_PRICE_PER_HOUR;
  return {
    gemini: geminiInputCost + geminiOutputCost,
    assembly: assemblyCost,
    total: geminiInputCost + geminiOutputCost + assemblyCost,
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `~$${cost.toFixed(3)}`;
  return `~$${cost.toFixed(2)}`;
}

export const DEFAULT_CONFIG: AnalysisConfig = {
  quality: 'medium',
  fps: 4,
  modelId: 'gemini-2.5-flash',
};

const STORAGE_KEY = 'autocut_analysis_config';

export function getStoredConfig(): AnalysisConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function setStoredConfig(config: AnalysisConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function AnalysisOptions({ videoDuration, videoSizeMB, config, onChange }: AnalysisOptionsProps) {
  const [fpsInput, setFpsInput] = useState(String(config.fps));
  const [models, setModels] = useState<GeminiModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setFpsInput(String(config.fps));
  }, [config.fps]);

  useEffect(() => {
    const key = getStoredGeminiKey();
    if (!key) return;
    setLoadingModels(true);
    fetchAvailableModels(key)
      .then(setModels)
      .finally(() => setLoadingModels(false));
  }, []);

  const selectedModel = models.find(m => m.id === config.modelId) || null;

  const { imageTokens, transcriptTokens, outputTokens, totalInput } = useMemo(
    () => estimateTokens(config, videoDuration),
    [config, videoDuration]
  );

  const cost = useMemo(
    () => estimateCost(totalInput, outputTokens, videoDuration, selectedModel),
    [totalInput, outputTokens, videoDuration, selectedModel]
  );

  const handleFpsChange = (value: string) => {
    setFpsInput(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0.1 && num <= 10) {
      const updated = { ...config, fps: Math.round(num * 10) / 10 };
      onChange(updated);
      setStoredConfig(updated);
    }
  };

  const update = (partial: Partial<AnalysisConfig>) => {
    const updated = { ...config, ...partial };
    onChange(updated);
    setStoredConfig(updated);
  };

  const [expanded, setExpanded] = useState(false);

  const frameCount = Math.ceil(videoDuration * config.fps);

  const modelName = selectedModel?.displayName || config.modelId;
  const qualityName = config.quality.charAt(0).toUpperCase() + config.quality.slice(1);
  const summaryText = `${modelName}, ${config.fps} fps, ${qualityName}`;

  return (
    <div className="space-y-3 text-sm">
      {/* Collapsed summary / expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="font-medium">Advanced</span>
        {!expanded && <span className="text-muted-foreground/70">— {summaryText}</span>}
      </button>

      {expanded && <>
      {/* Model */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-gray-700 w-16 shrink-0">Model</label>
        <div className="flex-1">
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading models...
            </div>
          ) : (
            <select
              value={config.modelId}
              onChange={(e) => update({ modelId: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-input rounded-md bg-background"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                  {m.deprecated ? ' (deprecated)' : ''}
                  {' — $' + m.inputPricePerM.toFixed(2) + '/M in'}
                </option>
              ))}
              {models.length === 0 && (
                <option value={config.modelId}>{config.modelId}</option>
              )}
            </select>
          )}
        </div>
      </div>

      {/* Quality */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-gray-700 w-16 shrink-0">Quality</label>
        <div className="flex gap-2 flex-1">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => update({ quality: q })}
              className={`cursor-pointer flex-1 px-3 py-1.5 text-xs rounded-md border capitalize transition-colors ${
                config.quality === q
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-gray-700 w-16 shrink-0">FPS</label>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={config.fps}
            onChange={(e) => handleFpsChange(e.target.value)}
            className="flex-1"
          />
          <input
            type="text"
            value={fpsInput}
            onChange={(e) => handleFpsChange(e.target.value)}
            className="w-12 px-1.5 py-1 text-xs text-center border border-input rounded-md"
          />
        </div>
      </div>

      </>}
    </div>
  );
}

export function CostEstimate({ videoDuration, config }: { videoDuration: number; config: AnalysisConfig }) {
  const [models, setModels] = useState<GeminiModelInfo[]>([]);

  useEffect(() => {
    const key = getStoredGeminiKey();
    if (!key) return;
    fetchAvailableModels(key).then(setModels);
  }, []);

  const selectedModel = models.find(m => m.id === config.modelId) || null;
  const { totalInput, outputTokens } = useMemo(() => estimateTokens(config, videoDuration), [config, videoDuration]);
  const cost = useMemo(() => estimateCost(totalInput, outputTokens, videoDuration, selectedModel), [totalInput, outputTokens, videoDuration, selectedModel]);

  return (
    <div className="px-3 py-2 bg-muted rounded-md text-xs text-muted-foreground space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span>Estimated cost:</span>
        <span className="font-medium text-foreground">
          {cost !== null ? formatCost(cost.total) : '—'}
        </span>
      </div>
      {cost !== null && (
        <div className="text-[10px] text-muted-foreground/70">
          Gemini: ~{formatTokens(totalInput)} tokens in + ~{formatTokens(outputTokens)} tokens out = {formatCost(cost.gemini)}
          {' · '}
          AssemblyAI: {Math.round(videoDuration)}s transcription = {formatCost(cost.assembly)}
        </div>
      )}
    </div>
  );
}
