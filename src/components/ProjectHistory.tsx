'use client';

import { useState, useEffect } from 'react';
import { Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjects, deleteProject, type ProjectSummary } from '@/lib/project-store';

interface ProjectHistoryProps {
  activeProjectId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  refreshKey?: number;
  disabled?: boolean;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const diffMs = Date.now() - d.getTime();
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

export default function ProjectHistory({ activeProjectId, onSelect, onNew, refreshKey, disabled = false }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => { listProjects().then(setProjects); }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    await deleteProject(id);
    if (id === activeProjectId) onNew();
    listProjects().then(setProjects);
  };

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {projects.length === 0 ? (
        <button onClick={onNew} className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
          + Add your first project
        </button>
      ) : (
        <div className="space-y-1">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`cursor-pointer flex items-center justify-between px-2.5 py-2 rounded text-xs transition-colors ${
                p.id === activeProjectId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="truncate font-medium">{p.name}</span>
                <span className="text-gray-400 shrink-0">{formatDuration(p.videoDuration)}</span>
                {p.cutCount > 0 && <span className="text-gray-400 shrink-0">{p.cutCount}✂</span>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-gray-300 hidden sm:inline">{formatDate(p.updatedAt)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => handleDelete(e, p.id)}
                  title="Delete"
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {projects.length > 0 && <button
        onClick={onNew}
        className="cursor-pointer mt-1 text-xs text-blue-600 hover:text-blue-800 px-2.5"
      >
        + New
      </button>}
    </div>
  );
}
