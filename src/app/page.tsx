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
import { Github, Menu, X } from 'lucide-react';
import Image from 'next/image';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const id = getActiveProjectId();
      if (id) {
        const project = await loadProject(id);
        if (project) restoreProject(project);
      }
      setRestored(true);
    })();
  }, []);

  const getCurrentSettings = (): ProjectSettings => {
    const prompts = getStoredPrompts();
    return {
      analysisConfig,
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
    if (project.settings?.analysisConfig) setAnalysisConfig(project.settings.analysisConfig);
    setStatus(project.results ? { stage: 'complete', progress: 100, message: 'Analysis complete!' } : null);
    setSidebarOpen(false);
  };

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
        currentFile, geminiKey, assemblyKey, analysisConfig,
        userPrompt.trim() || undefined,
        (p) => setStatus({
          stage: p.stage === 'loading' ? 'extracting' : p.stage as ProcessingStatusType['stage'],
          progress: p.progress,
          message: p.message,
        }),
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

      const project: ProjectRecord = {
        ...(activeProjectId ? { id: activeProjectId } : {}),
        name: currentFile.name, fileSize: currentFile.size, videoDuration,
        videoFile: currentFile, results: analysisResult, transcript: tData,
        settings: getCurrentSettings(), selectedCuts: Array.from(allCuts),
        createdAt: Date.now(), updatedAt: Date.now(),
      };
      if (activeProjectId) {
        const existing = await loadProject(activeProjectId);
        if (existing) project.createdAt = existing.createdAt;
      }
      const id = await saveProject(project);
      setActiveId(id);
      setProjectRefreshKey(k => k + 1);
    } catch (error) {
      if (error instanceof AnalysisCancelledError) { setStatus(null); return; }
      console.error('Analysis error:', error);
      setStatus({ stage: 'error', progress: 0, message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => abortRef.current?.abort();
  const handleSelectedCutsChange = (cuts: Set<number>) => { setSelectedCuts(cuts); persistProject(); };
  const handlePayAndDownload = () => console.log('Video downloaded successfully!');

  const resetFlow = () => {
    setCurrentFile(null); setStatus(null); setResults(null); setUserPrompt('');
    setTranscriptData(null); setGeminiResponse(null); setVideoDuration(0);
    setSelectedCuts(new Set()); setActiveId(null); clearActiveProjectId();
  };

  const handleSelectProject = async (id: number) => {
    const project = await loadProject(id);
    if (project) restoreProject(project);
  };

  // Sidebar content (shared between mobile overlay and desktop sidebar)
  const sidebarContent = (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <Image src="/autocut/icon.svg" alt="AutoCut AI" width={28} height={28} />
        <span className="text-lg font-bold text-gray-900">AutoCut AI</span>
      </div>

      {/* API Keys */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">API Keys</h3>
        <APIKeyManager onKeysChanged={setApisConnected} forceCollapsed={false} />
      </div>

      {/* Projects */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Projects</h3>
        <ProjectHistory
          activeProjectId={activeProjectId}
          onSelect={handleSelectProject}
          onNew={resetFlow}
          refreshKey={projectRefreshKey}
          disabled={isAnalyzing}
        />
      </div>

      {/* Prompt */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prompt</h3>
        <PromptEditor disabled={isAnalyzing} />
      </div>

      {/* Links */}
      <div className="pt-4 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
        <a href="https://github.com/romneyda/autocut-ai" target="_blank" className="hover:text-gray-600 flex items-center gap-1">
          <Github className="w-3.5 h-3.5" /> GitHub
        </a>
        <span>·</span>
        <a href="https://buymeacoffee.com/dallin" target="_blank" className="hover:text-gray-600">
          ☕ Buy me a coffee
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 bg-white border-r border-gray-200 p-5 overflow-y-auto sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white p-5 overflow-y-auto shadow-xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
              <Menu className="w-5 h-5" />
            </button>
            <Image src="/autocut/icon.svg" alt="AutoCut AI" width={24} height={24} />
            <span className="font-bold text-gray-900">AutoCut AI</span>
          </div>
          <a href="https://github.com/romneyda/autocut-ai" target="_blank" className="text-gray-500 hover:text-gray-700">
            <Github className="w-4 h-4" />
          </a>
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          {/* Desktop header (no logo, just subtitle) */}
          <p className="hidden lg:block text-sm text-gray-500 mb-6">
            Automatically cut out unnecessary filler words, silence, and other content from your video
          </p>

          {/* Uploader */}
          {!currentFile && !status && restored && (
            <VideoUploader onVideoUpload={handleFileSelected} isProcessing={false} />
          )}

          {/* Video preview + controls */}
          {currentFile && !results && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-3 bg-white">
                <video
                  src={videoPreviewUrl!}
                  controls
                  className="w-full rounded-md bg-black object-contain"
                  style={{ maxHeight: '360px' }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-gray-500 truncate">
                    {currentFile.name} ({(currentFile.size / (1024 * 1024)).toFixed(1)} MB)
                    {videoDuration > 0 && <span className="ml-1">• {Math.round(videoDuration)}s</span>}
                  </div>
                  {!isAnalyzing && (
                    <button onClick={resetFlow} className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 underline ml-4 shrink-0">
                      Change
                    </button>
                  )}
                </div>
              </div>

              {isAnalyzing && <ProcessingStatus status={status!} onCancel={handleCancel} />}

              {!status && (
                <div className="space-y-3">
                  {videoDuration > 0 && (
                    <AnalysisOptions
                      videoDuration={videoDuration}
                      videoSizeMB={currentFile.size / (1024 * 1024)}
                      config={analysisConfig}
                      onChange={setAnalysisConfig}
                    />
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional Instructions (Optional)</label>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g., Be more aggressive with removing filler words..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  {videoDuration > 0 && <CostEstimate videoDuration={videoDuration} config={analysisConfig} />}

                  <button
                    onClick={handleAnalyze}
                    disabled={!apisConnected}
                    className="cursor-pointer w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {apisConnected ? 'AutoCut' : 'Enter API keys to analyze'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {status?.stage === 'error' && (
            <div className="text-center py-8">
              <button onClick={() => setStatus(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {!!results && status?.stage === 'complete' ? (
            <AnalysisResults
              results={results}
              selectedCuts={selectedCuts}
              onSelectedCutsChange={handleSelectedCutsChange}
              onPayAndDownload={handlePayAndDownload}
              videoFile={currentFile || undefined}
              transcriptFormatted={transcriptData?.formatted}
              geminiRawResponse={geminiResponse}
            />
          ) : null}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
          We don&apos;t view or store your API keys or data. &copy; {new Date().getFullYear()} Dallin Romney
        </footer>
      </main>
    </div>
  );
}
