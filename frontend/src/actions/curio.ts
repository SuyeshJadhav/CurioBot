// ============================================================
//  src/actions/curio.ts — Backend API Bridge
//
//  Architecture note: This module mirrors the "Server Action"
//  pattern from Next.js App Router. In this Vite SPA build, these
//  are REST calls to the Express/LangGraph backend. The function
//  signatures are identical, so porting to Next.js `"use server"`
//  later is a one-line change per function.
//
//  All secrets live on the backend — this file never touches API
//  keys directly.
// ============================================================

import type { Message } from '../types/curio';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ── Shared types ──────────────────────────────────────────────
export interface PipelineResult {
  topic: {
    title: string;
    domain: string;
    summary: string;
  };
  article: string;
  sessionId: string;
}

export interface TutorResult {
  reply: string;
}

// ── Action 1: runCurioPipeline ────────────────────────────────
// Triggers the full LangGraph supervisor pipeline:
//   topicPicker → researcher + wikiResearcher → writer
// Returns the finalized topic and article from AgentState.
export async function runCurioPipeline(
  interests: string[] = ['science', 'technology', 'history', 'culture']
): Promise<PipelineResult> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interests }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Pipeline failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data as PipelineResult;
}

// ── Action 2: askTutor ────────────────────────────────────────
// Sends the user's question to the Tutor agent with the current
// article as grounding context. The backend uses Gemini with a
// system prompt built from the article.
export async function askTutor(
  question: string,
  history: Message[],
  articleContext: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/tutor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      context: articleContext,
      history: history.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Tutor request failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.reply as string;
}
