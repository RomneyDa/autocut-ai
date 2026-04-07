const GEMINI_KEY = 'autocut_gemini_api_key';
const ASSEMBLY_KEY = 'autocut_assembly_api_key';

export function getStoredKeys() {
  if (typeof window === 'undefined') return { geminiKey: '', assemblyKey: '' };
  return {
    geminiKey: localStorage.getItem(GEMINI_KEY) || '',
    assemblyKey: localStorage.getItem(ASSEMBLY_KEY) || '',
  };
}

export function setStoredKeys(geminiKey: string, assemblyKey: string) {
  localStorage.setItem(GEMINI_KEY, geminiKey);
  localStorage.setItem(ASSEMBLY_KEY, assemblyKey);
}

export function clearStoredKeys() {
  localStorage.removeItem(GEMINI_KEY);
  localStorage.removeItem(ASSEMBLY_KEY);
}

export function hasStoredKeys() {
  const { geminiKey, assemblyKey } = getStoredKeys();
  return !!(geminiKey && assemblyKey);
}

export function apiHeaders(): HeadersInit {
  const { geminiKey, assemblyKey } = getStoredKeys();
  return {
    'x-gemini-api-key': geminiKey,
    'x-assembly-api-key': assemblyKey,
  };
}
