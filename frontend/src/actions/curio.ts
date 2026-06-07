/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
//  src/actions/curio.ts — Backend API Bridge
// ============================================================

import type { Message, User } from '../types/curio';

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const API_BASE = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

// Helper to get auth headers with localStorage token
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('curio_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Centrally validates API responses, logs stack traces & details to the browser console,
 * and throws structured error messages.
 */
async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: fallbackError }));
    console.error('🔴 [API Error Caught]:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      error: err.error || fallbackError,
      stack: err.stack || 'No server stack trace provided.',
      details: err.details,
    });
    throw new Error(err.error || fallbackError);
  }
  return res.json() as Promise<T>;
}

export interface PipelineResult {
  topic: {
    title: string;
    domain: string;
    summary: string;
  };
  article: string;
  articleId?: string;
  sessionId: string;
  rabbitHoles?: Array<{ title: string; domain: string; why: string }>;
  tldr?: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

// ── Auth Actions ──────────────────────────────────────────────

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthResult>(res, 'Login failed');
}

export async function registerUser(email: string, username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  return handleResponse<AuthResult>(res, 'Registration failed');
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<User>(res, 'Failed to retrieve current user');
}

// ── Pipeline Actions ──────────────────────────────────────────

export async function runCurioPipeline(
  interests: string[] = ['science', 'technology', 'history', 'culture'],
  onStatus?: (status: string, data?: any) => void,
  hint?: string
): Promise<PipelineResult> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ interests, hint }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Pipeline generation failed' }));
    throw new Error(err.error || 'Pipeline generation failed');
  }

  const contentType = res.headers.get('Content-Type');
  if (contentType && contentType.includes('text/event-stream')) {
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported on response body.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: PipelineResult | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.status === 'completed') {
              finalResult = parsed.result;
            } else if (parsed.status === 'failed') {
              throw new Error(parsed.error || 'Pipeline generation failed');
            } else if (onStatus) {
              onStatus(parsed.status, parsed.data);
            }
          } catch (e: any) {
            if (e.message && e.message.includes('failed')) {
              throw e;
            }
            console.error('Error parsing SSE data:', e, trimmed);
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error('Stream finished but no article content was received.');
    }
    return finalResult;
  } else {
    // Fallback if not an SSE connection
    return handleResponse<PipelineResult>(res, 'Pipeline generation failed');
  }
}

export async function askTutor(
  question: string,
  history: Message[],
  articleContext: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/tutor/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      message: question,
      context: articleContext,
      history: history.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  const data = await handleResponse<{ reply: string }>(res, 'Tutor request failed');
  return data.reply;
}

// ── Navigation & Persistence Actions ─────────────────────────

export async function fetchHistory(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch history');
}

export async function fetchArticleById(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/articles/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any>(res, 'Failed to fetch article');
}

// Saved Sketches
export async function fetchSavedSketches(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/saved`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch saved sketches');
}

export async function saveSketch(articleId: string, notes?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ articleId, notes }),
  });
  await handleResponse<any>(res, 'Failed to save sketch');
}

export async function updateSketchNotes(articleId: string, notes: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved/${articleId}/notes`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ notes }),
  });
  await handleResponse<any>(res, 'Failed to update sketch notes');
}

export async function unsaveSketch(articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/saved/${articleId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<any>(res, 'Failed to unsave sketch');
}

// Daily Wonder
export async function fetchDailyWonder(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/wonder`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any>(res, 'Failed to fetch daily wonder');
}

export async function generateDailyWonder(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/wonder/generate`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse<any>(res, 'Failed to generate daily wonder');
}

// Library
export async function fetchLibraryCollections(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/library`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch collections');
}

export async function createCollection(name: string, description?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/library`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return handleResponse<any>(res, 'Failed to create collection');
}

export async function fetchCollectionArticles(collectionId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/library/${collectionId}/articles`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any[]>(res, 'Failed to fetch collection articles');
}

export async function addArticleToCollection(collectionId: string, articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/library/${collectionId}/articles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ articleId }),
  });
  await handleResponse<any>(res, 'Failed to add article to collection');
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<any>(res, 'Failed to fetch settings');
}

export async function updateSettings(settings: any): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });
  await handleResponse<any>(res, 'Failed to update settings');
}

export async function fetchInterests(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/interests`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<string[]>(res, 'Failed to fetch interests');
}

export async function addInterest(interest: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/interests`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ interest }),
  });
  await handleResponse<any>(res, 'Failed to add interest');
}

export async function deleteInterest(interest: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/interests/${encodeURIComponent(interest)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<any>(res, 'Failed to delete interest');
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/articles/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await handleResponse<any>(res, 'Failed to delete article');
}

export async function fetchReadTimestamps(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/reads/dates`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<string[]>(res, 'Failed to fetch read timestamps');
}

