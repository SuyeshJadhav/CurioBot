/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE, getHeaders, handleResponse } from './apiClient';

export interface PipelineResult {
  topic: { title: string; domain: string; summary: string };
  article: string;
  articleId?: string;
  sessionId: string;
  rabbitHoles?: Array<{ title: string; domain: string; why: string }>;
  tldr?: string;
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 2500, 5000];

/** Persists the active BullMQ job ID across retries so we reconnect, not re-enqueue */
let _activeJobId: string | null = null;
export function clearActiveJobId() { _activeJobId = null; }

/**
 * Runs the article generation pipeline over SSE.
 * Automatically retries with exponential backoff if the stream drops
 * before completion (client-side counterpart to server-side grace period).
 */
export async function runCurioPipeline(
  interests: string[] = ['science', 'technology', 'history', 'culture'],
  onStatus?: (status: string, data?: any) => void,
  hint?: string,
  topic?: { title: string; domain?: string; summary?: string },
): Promise<PipelineResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await attemptPipeline(interests, onStatus, hint, topic);
    } catch (err: any) {
      const isNetworkDrop = err instanceof TypeError || err.message?.includes('network');
      if (!isNetworkDrop || attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BACKOFF_MS[attempt] ?? 5000;
      console.warn(`📡 [Pipeline] Network drop detected. Retrying in ${delay}ms… (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Pipeline failed after max retries.');
}

async function attemptPipeline(
  interests: string[],
  onStatus?: (status: string, data?: any) => void,
  hint?: string,
  topic?: { title: string; domain?: string; summary?: string },
): Promise<PipelineResult> {
  const url = _activeJobId 
    ? `${API_BASE}/api/generate?jobId=${encodeURIComponent(_activeJobId)}`
    : `${API_BASE}/api/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ interests, hint, topic }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Pipeline generation failed' }));
    throw new Error(err.error || 'Pipeline generation failed');
  }

  const contentType = res.headers.get('Content-Type');
  if (contentType?.includes('text/event-stream')) {
    return readSSEStream(res, onStatus);
  }
  return handleResponse<PipelineResult>(res, 'Pipeline generation failed');
}

async function readSSEStream(
  res: Response,
  onStatus?: (status: string, data?: any) => void,
): Promise<PipelineResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('ReadableStream not supported on response body.');

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
      if (!trimmed?.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        if (parsed.status === 'queued' && parsed.jobId) {
          _activeJobId = parsed.jobId;
        } else if (parsed.status === 'completed') {
          finalResult = parsed.result;
          clearActiveJobId();
        } else if (parsed.status === 'failed') {
          clearActiveJobId();
          throw new Error(parsed.error || 'Pipeline generation failed');
        } else if (onStatus) {
          onStatus(parsed.status, parsed.data);
        }
      } catch (e: any) {
        if (e.message?.includes('failed')) {
          clearActiveJobId();
          throw e;
        }
      }
    }
  }

  if (!finalResult) throw new Error('Stream finished but no article content was received.');
  return finalResult;
}

// ── History & Articles ────────────────────────────────────────────────────────

export async function fetchHistory(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/history`, { method: 'GET', headers: getHeaders() });
  return handleResponse<any[]>(res, 'Failed to fetch history');
}

export async function fetchArticleById(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/articles/${id}`, { method: 'GET', headers: getHeaders() });
  return handleResponse<any>(res, 'Failed to fetch article');
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/articles/${id}`, { method: 'DELETE', headers: getHeaders() });
  await handleResponse<any>(res, 'Failed to delete article');
}
