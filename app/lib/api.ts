/**
 * BillyMC API client with auth fallback
 * Uses Firebase JWT when available, dev API key otherwise
 */

const API_BASE = 'https://billymc-api.bmcii1976.workers.dev';
const DEV_API_KEY = 'echo-omega-prime-billymc-2026';

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    }
  }
  headers['X-Echo-API-Key'] = DEV_API_KEY;
  return headers;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const mergedHeaders = { ...authHeaders, ...(options.headers || {}) };
  return fetch(`${API_BASE}${path}`, { ...options, headers: mergedHeaders });
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await apiFetch(path);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  return res.json();
}

export { API_BASE };
