const GEMINI_KEY = 'autocut_gemini_api_key';
const ASSEMBLY_KEY = 'autocut_assembly_api_key';

export function getStoredGeminiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GEMINI_KEY) || '';
}

export function setStoredGeminiKey(key: string) {
  localStorage.setItem(GEMINI_KEY, key);
}

export function clearStoredGeminiKey() {
  localStorage.removeItem(GEMINI_KEY);
}

export function getStoredAssemblyKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ASSEMBLY_KEY) || '';
}

export function setStoredAssemblyKey(key: string) {
  localStorage.setItem(ASSEMBLY_KEY, key);
}

export function clearStoredAssemblyKey() {
  localStorage.removeItem(ASSEMBLY_KEY);
}

export function hasAllKeys() {
  return !!getStoredGeminiKey() && !!getStoredAssemblyKey();
}
