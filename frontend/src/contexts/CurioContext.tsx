// ============================================================
//  CurioContext — Shared State Provider
//
//  Architecture decision: Context over prop-drilling because
//  IgniteCanvas, TutorSidebar, and LeftSidebar are siblings
//  that all need read/write access to the same LangGraph state.
//  A parent that only passes state down (never uses it) is a
//  "god component" anti-pattern — Context solves this cleanly.
//
//  Phase 2 update: Wired to real Server Action bridge in
//  src/actions/curio.ts (replaces all mock setTimeout calls).
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  CurioContextType,
  CurioState,
  Message,
} from '../types/curio';
import { runCurioPipeline, askTutor } from '../actions/curio';

// ── Context creation ──────────────────────────────────────────
// Null default forces the useCurio() guard below — components
// outside the provider will throw a descriptive error.
const CurioContext = createContext<CurioContextType | null>(null);

// ── Initial state ─────────────────────────────────────────────
const INITIAL_STATE: CurioState = {
  currentTopic: null,
  article: null,
  isGenerating: false,
  messages: [
    {
      id: 'init-1',
      role: 'bot',
      content:
        "Hello! I'm CurioBot — your curiosity guide. Tap the ✨ Ignite button to begin, or ask me anything!",
      timestamp: new Date(),
    },
  ],
  sessionId: null,
  history: [],
};

// ── Provider component ────────────────────────────────────────
export function CurioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurioState>(INITIAL_STATE);

  // sendMessage — appends user bubble, calls askTutor action, appends reply.
  // The article content from state is passed as grounding context.
  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Snapshot current messages + article before the async call
    // so we can pass them correctly into the action.
    let currentMessages: Message[] = [];
    let currentArticle: string | null = null;

    setState((prev) => {
      currentMessages = prev.messages;
      currentArticle = prev.article;
      return {
        ...prev,
        messages: [...prev.messages, userMsg],
        isGenerating: true,
      };
    });

    try {
      const replyText = await askTutor(
        content,
        currentMessages,
        currentArticle ?? ''
      );

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'bot',
        content: replyText,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMsg],
        isGenerating: false,
      }));
    } catch (err) {
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'bot',
        content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errMsg],
        isGenerating: false,
      }));
    }
  }, []);

  // igniteQuest — kicks off the full LangGraph pipeline.
  // Calls runCurioPipeline() and populates article + history.
  const igniteQuest = useCallback(async (topic?: string) => {
    setState((prev) => ({
      ...prev,
      currentTopic: topic ?? null,
      article: null,
      isGenerating: true,
      // Reset chat on new quest so the tutor starts fresh
      messages: [INITIAL_STATE.messages[0]],
    }));

    try {
      const result = await runCurioPipeline();

      const resolvedTopic = result.topic.title;
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        currentTopic: resolvedTopic,
        article: result.article,
        sessionId: result.sessionId,
        history: [
          { id: result.sessionId, topic: resolvedTopic, createdAt: new Date() },
          ...prev.history,
        ],
      }));
    } catch (err) {
      // Surface the error as a chat message so the UI doesn't silently fail
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'bot',
        content: `⚠️ Pipeline error: ${err instanceof Error ? err.message : 'Unknown error'}. Is the backend running?`,
        timestamp: new Date(),
      };
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        messages: [...prev.messages, errMsg],
      }));
    }
  }, []);

  // clearSession — resets everything back to the empty journal state
  const clearSession = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const contextValue: CurioContextType = {
    ...state,
    sendMessage,
    igniteQuest,
    clearSession,
  };

  return (
    <CurioContext.Provider value={contextValue}>
      {children}
    </CurioContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────
// Always use this hook instead of useContext(CurioContext) directly.
// The null-guard gives a clear error if a component is mounted
// outside the provider tree.
export function useCurio(): CurioContextType {
  const ctx = useContext(CurioContext);
  if (!ctx) {
    throw new Error(
      '[CurioBot] useCurio() must be called inside a <CurioProvider>. ' +
      'Make sure your component tree is wrapped in <CurioProvider> in App.tsx.'
    );
  }
  return ctx;
}
