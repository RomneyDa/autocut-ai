'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjects, deleteProject, type ProjectSummary } from '@/lib/project-store';

interface ProjectHistoryProps {
  activeProjectId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  refreshKey?: number; // increment to trigger refresh
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function ProjectHistory({ activeProjectId, onSelect, onNew, refreshKey }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    const list = await listProjects();
    setProjects(list);
  };

  useEffect(() => { refresh(); }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteProject(id);
    if (id === activeProjectId) onNew();
    refresh();
  };

  if (projects.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="font-medium">Projects</span>
        <span className="text-muted-foreground/70">({projects.length})</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`cursor-pointer flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                p.id === activeProjectId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-muted border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatDuration(p.videoDuration)} · {formatSize(p.fileSize)}
                </span>
                {p.cutCount > 0 && (
                  <span className="text-muted-foreground shrink-0">{p.cutCount} cuts</span>
                )}
                {p.modelId && (
                  <span className="text-muted-foreground/50 shrink-0">{p.modelId.replace('gemini-', '')}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(p.updatedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => handleDelete(e, p.id)}
                  title="Delete project"
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}

          <button
            onClick={onNew}
            className="cursor-pointer w-full text-xs text-blue-600 hover:text-blue-800 py-1"
          >
            + New video
          </button>
        </div>
      )}
    </div>
  );
}
