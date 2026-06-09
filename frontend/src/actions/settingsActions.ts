import { API_BASE, getHeaders, handleResponse } from './apiClient';
import type { Message } from '../types/curio';

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/settings`, { method: 'GET', headers: getHeaders() });
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
  const res = await fetch(`${API_BASE}/api/interests`, { method: 'GET', headers: getHeaders() });
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

export async function askTutor(
  question: string,
  history: Message[],
  articleContext: string,
): Promise<{ reply: string; tokenBalance?: number }> {
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
  const data = await handleResponse<{ reply: string; token_balance?: number }>(res, 'Tutor request failed');
  return { reply: data.reply, tokenBalance: data.token_balance };
}
