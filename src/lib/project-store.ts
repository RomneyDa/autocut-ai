import { AnalysisResult } from './types';
import type { AnalysisConfig } from '@/components/AnalysisOptions';

export interface ProjectSettings {
  analysisConfig: AnalysisConfig;
  audioPrompt: string;
  videoPrompt: string;
  userInstructions: string;
}

export interface ProjectRecord {
  id?: number;
  name: string;
  fileSize: number;
  videoDuration: number;
  videoFile: File;
  results: AnalysisResult | null;
  settings: ProjectSettings | null;
  selectedCuts: number[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  fileSize: number;
  videoDuration: number;
  cutCount: number;
  modelId?: string;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'autocut_db';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const ACTIVE_KEY = 'autocut_active_project';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // Delete old stores from v1
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains('files')) {
          db.deleteObjectStore('files');
        }
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: ProjectRecord): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  project.updatedAt = Date.now();
  const req = store.put(project);

  const id = await new Promise<number>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  setActiveProjectId(id);
  return id;
}

export async function loadProject(id: number): Promise<ProjectRecord | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get(id);

  const result = await new Promise<ProjectRecord | null>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  db.close();
  return result;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.index('updatedAt').openCursor(null, 'prev');

  const projects: ProjectSummary[] = [];

  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const val = cursor.value as ProjectRecord;
        projects.push({
          id: val.id!,
          name: val.name,
          fileSize: val.fileSize,
          videoDuration: val.videoDuration,
          cutCount: val.results?.recommendedCuts?.length || 0,
          modelId: val.settings?.analysisConfig?.modelId,
          createdAt: val.createdAt,
          updatedAt: val.updatedAt,
        });
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });

  db.close();
  return projects;
}

export async function deleteProject(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();

  if (getActiveProjectId() === id) {
    clearActiveProjectId();
  }
}

export function getActiveProjectId(): number | null {
  const val = localStorage.getItem(ACTIVE_KEY);
  return val ? parseInt(val, 10) : null;
}

export function setActiveProjectId(id: number) {
  localStorage.setItem(ACTIVE_KEY, String(id));
}

export function clearActiveProjectId() {
  localStorage.removeItem(ACTIVE_KEY);
}
