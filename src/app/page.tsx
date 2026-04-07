'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import VideoUploader from '@/components/VideoUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import AnalysisResults from '@/components/AnalysisResults';
import APIKeyManager from '@/components/APIKeyManager';
import PromptEditor from '@/components/PromptEditor';
import ProjectHistory from '@/components/ProjectHistory';
import AnalysisOptions, { CostEstimate, type AnalysisConfig, getStoredConfig } from '@/components/AnalysisOptions';
import { ProcessingStatus as ProcessingStatusType, AnalysisResult } from '@/lib/types';
import { getStoredGeminiKey, getStoredAssemblyKey } from '@/lib/api-keys';
import { analyzeVideoClientSide, AnalysisCancelledError } from '@/lib/client-analyzer';
import {
  saveProject, loadProject, getActiveProjectId, setActiveProjectId, clearActiveProjectId,
  type ProjectRecord, type ProjectSettings, type TranscriptData,
} from '@/lib/project-store';
import { getStoredPrompts } from '@/lib/gemini-prompts';
import { Github, Scissors } from 'lucide-react';
import Image from 'next/image';

const isDev = process.env.NODE_ENV === 'development';

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [status, setStatus] = useState<ProcessingStatusType | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [selectedCuts, setSelectedCuts] = useState<Set<number>>(new Set());
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [geminiResponse, setGeminiResponse] = useState<unknown>(null);
  const [apisConnected, setApisConnected] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>(getStoredConfig);
  const [videoDuration, setVideoDuration] = useState(0);
  const [restored, setRestored] = useState(false);
  const [activeProjectId, setActiveId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Restore active project on mount
  useEffect(() => {
    (async () => {
      const id = getActiveProjectId();
      if (id) {
        const project = await loadProject(id);
        if (project) {
          restoreProject(project);
        }
      }
      setRestored(true);
    })();
  }, []);

  const getCurrentSettings = (): ProjectSettings => {
    const prompts = getStoredPrompts();
    return {
      analysisConfig: analysisConfig,
      audioPrompt: prompts.audio,
      videoPrompt: prompts.video,
      userInstructions: userPrompt,
    };
  };

  const restoreProject = (project: ProjectRecord) => {
    setCurrentFile(project.videoFile);
    setResults(project.results);
    setUserPrompt(project.settings?.userInstructions || '');
    setVideoDuration(project.videoDuration);
    setSelectedCuts(new Set(project.selectedCuts));
    setTranscriptData(project.transcript || null);
    setGeminiResponse(null);
    setActiveId(project.id!);
    setActiveProjectId(project.id!);
    if (project.settings?.analysisConfig) {
      setAnalysisConfig(project.settings.analysisConfig);
    }
    if (project.results) {
      setStatus({ stage: 'complete', progress: 100, message: 'Analysis complete!' });
    } else {
      setStatus(null);
    }
  };

  // Debounced save to IDB
  const persistProject = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!currentFile) return;
      const project: ProjectRecord = {
        ...(activeProjectId ? { id: activeProjectId } : {}),
        name: currentFile.name,
        fileSize: currentFile.size,
        videoDuration,
        videoFile: currentFile,
        results,
        transcript: transcriptData,
        settings: getCurrentSettings(),
        selectedCuts: Array.from(selectedCuts),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (activeProjectId) {
        const existing = await loadProject(activeProjectId);
        if (existing) {
          project.createdAt = existing.createdAt;
          if (!results && existing.settings) project.settings = existing.settings;
          if (!transcriptData && existing.transcript) project.transcript = existing.transcript;
        }
      }

      const id = await saveProject(project);
      setActiveId(id);
      setProjectRefreshKey(k => k + 1);
    }, 500);
  }, [currentFile, results, userPrompt, videoDuration, selectedCuts, activeProjectId, analysisConfig, transcriptData]);

  const videoPreviewUrl = useMemo(
    () => currentFile ? URL.createObjectURL(currentFile) : null,
    [currentFile]
  );

  // Get video duration when file changes
  useEffect(() => {
    if (!videoPreviewUrl) { setVideoDuration(0); return; }
    if (videoDuration > 0) return;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = videoPreviewUrl;
  }, [videoPreviewUrl]);

  const handleFileSelected = (file: File) => {
    setCurrentFile(file);
    setStatus(null);
    setResults(null);
    setTranscriptData(null);
    setGeminiResponse(null);
    setVideoDuration(0);
    setSelectedCuts(new Set());
    setActiveId(null);
    clearActiveProjectId();
  };

  const isAnalyzing = !!status && status.stage !== 'complete' && status.stage !== 'error';

  const handleAnalyze = async () => {
    if (!currentFile) return;

    const geminiKey = getStoredGeminiKey();
    const assemblyKey = getStoredAssemblyKey();
    if (!geminiKey || !assemblyKey) return;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await analyzeVideoClientSide(
        currentFile,
        geminiKey,
        assemblyKey,
        analysisConfig,
        userPrompt.trim() || undefined,
        (p) => {
          setStatus({
            stage: p.stage === 'loading' ? 'extracting' : p.stage as ProcessingStatusType['stage'],
            progress: p.progress,
            message: p.message,
          });
        },
        controller.signal,
      );

      const tData: TranscriptData | null = result.transcript ? {
        text: result.transcript.text,
        words: result.transcript.words,
        formatted: result.transcript.formatted,
      } : null;
      setTranscriptData(tData);
      setGeminiResponse(result);

      const analysisResult: AnalysisResult = {
        frames: [],
        transcript: result.transcript?.text || '',
        aiDescription: result.description,
        recommendedCuts: result.cuts,
      };
      setResults(analysisResult);

      const allCuts = new Set(result.cuts.map((_, i) => i));
      setSelectedCuts(allCuts);

      // Save project with settings used for this analysis
      const project: ProjectRecord = {
        ...(activeProjectId ? { id: activeProjectId } : {}),
        name: currentFile.name,
        fileSize: currentFile.size,
        videoDuration,
        videoFile: currentFile,
        results: analysisResult,
        transcript: tData,
        settings: getCurrentSettings(),
        selectedCuts: Array.from(allCuts),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (activeProjectId) {
        const existing = await loadProject(activeProjectId);
        if (existing) project.createdAt = existing.createdAt;
      }
      const id = await saveProject(project);
      setActiveId(id);
      setProjectRefreshKey(k => k + 1);
    } catch (error) {
      if (error instanceof AnalysisCancelledError) {
        setStatus(null);
        return;
      }
      console.error('Analysis error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleSelectedCutsChange = (cuts: Set<number>) => {
    setSelectedCuts(cuts);
    persistProject();
  };

  const handlePayAndDownload = () => {
    console.log('Video downloaded successfully!');
  };

  const resetFlow = () => {
    setCurrentFile(null);
    setStatus(null);
    setResults(null);
    setUserPrompt('');
    setTranscriptData(null);
    setGeminiResponse(null);
    setVideoDuration(0);
    setSelectedCuts(new Set());
    setActiveId(null);
    clearActiveProjectId();
  };

  const handleSelectProject = async (id: number) => {
    const project = await loadProject(id);
    if (project) restoreProject(project);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="mb-8 relative">
          <a
            href="https://github.com/romneyda/autocut-ai"
            target="_blank"
            className="absolute right-0 top-2 text-gray-700 hover:text-gray-900 transition-colors"
            title="View source on GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/autocut/icon.svg" alt="AutoCut AI" width={36} height={36} />
            <h1 className="text-3xl font-bold text-gray-900">AutoCut AI</h1>
          </div>
          <p className="text-gray-600">
            Automatically cut out unnecessary filler words, silence, and other content from your video
          </p>
        </div>

        {/* Settings */}
        <div className="max-w-2xl mx-auto mb-6 space-y-1">
          <APIKeyManager onKeysChanged={setApisConnected} forceCollapsed={isAnalyzing} />
          <ProjectHistory
            activeProjectId={activeProjectId}
            onSelect={handleSelectProject}
            onNew={resetFlow}
            refreshKey={projectRefreshKey}
            disabled={isAnalyzing}
          />
          <PromptEditor disabled={!!status && status.stage !== 'complete' && status.stage !== 'error'} />
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {!currentFile && !status && restored && (
            <VideoUploader
              onVideoUpload={handleFileSelected}
              isProcessing={false}
            />
          )}

          {/* Video preview (visible during pre-analyze AND processing) */}
          {currentFile && !results && (
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <div className="border-2 border-gray-300 rounded-lg p-3 h-64 flex flex-col">
                <video
                  src={videoPreviewUrl!}
                  controls
                  className="w-full flex-1 min-h-0 rounded-md bg-black object-contain"
                />
                <div className="flex items-center justify-between mt-2 flex-shrink-0">
                  <div className="text-sm text-gray-600 truncate">
                    {currentFile.name} ({(currentFile.size / (1024 * 1024)).toFixed(1)} MB)
                    {videoDuration > 0 && <span className="ml-1">• {Math.round(videoDuration)}s</span>}
                  </div>
                  {!isAnalyzing && (
                    <button
                      onClick={resetFlow}
                      className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 underline ml-4 flex-shrink-0"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>

              {/* Processing Status */}
              {isAnalyzing && (
                <ProcessingStatus status={status!} onCancel={handleCancel} />
              )}

              {/* Pre-analyze controls */}
              {!status && (
                <>
                  {videoDuration > 0 && (
                    <AnalysisOptions
                      videoDuration={videoDuration}
                      videoSizeMB={currentFile.size / (1024 * 1024)}
                      config={analysisConfig}
                      onChange={setAnalysisConfig}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Instructions (Optional)
                    </label>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g., Be more aggressive with removing filler words, or keep natural pauses..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>

                  {videoDuration > 0 && (
                    <CostEstimate videoDuration={videoDuration} config={analysisConfig} />
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!apisConnected}
                    className="cursor-pointer w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {apisConnected ? 'AutoCut' : 'Enter API keys to analyze'}
                  </button>
                </>
              )}

            </div>
          )}

          {/* Error State */}
          {status?.stage === 'error' && (
            <div className="text-center">
              <button
                onClick={() => setStatus(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {!!results && status?.stage === 'complete' ? (
            <>
              <AnalysisResults
                results={results}
                selectedCuts={selectedCuts}
                onSelectedCutsChange={handleSelectedCutsChange}
                onPayAndDownload={handlePayAndDownload}
                videoFile={currentFile || undefined}
                transcriptFormatted={transcriptData?.formatted}
                geminiRawResponse={geminiResponse}
              />
            </>
          ) : null}
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-8">
        We don&apos;t view or store your API keys or data. &copy; {new Date().getFullYear()} Dallin Romney
        {' · '}
        <a
          href="https://buymeacoffee.com/dallin"
          target="_blank"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ☕ Buy me a coffee
        </a>
      </footer>
    </div>
  );
}
