const GEMINI_KEY = 'autocut_gemini_api_key';

export function getStoredKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GEMINI_KEY) || '';
}

export function setStoredKey(key: string) {
  localStorage.setItem(GEMINI_KEY, key);
}

export function clearStoredKey() {
  localStorage.removeItem(GEMINI_KEY);
}

export function hasStoredKey() {
  return !!getStoredKey();
}

export function apiHeaders(): HeadersInit {
  return {
    'x-gemini-api-key': getStoredKey(),
  };
}
