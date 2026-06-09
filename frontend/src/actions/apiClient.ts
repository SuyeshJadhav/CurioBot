// ── Shared API client helpers ─────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function getHeaders(): HeadersInit {
  const token = localStorage.getItem('curio_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: fallbackError }));
    console.error('🔴 [API Error]:', {
      status: res.status,
      url: res.url,
      error: err.error || fallbackError,
    });
    throw new Error(err.error || fallbackError);
  }
  return res.json() as Promise<T>;
}

export { API_BASE };
