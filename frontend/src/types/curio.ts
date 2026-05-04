// ============================================================
//  CurioBot — Shared State Interface
//  Mirrors the LangGraph state schema from the backend.
//  All components derive their props from these types.
// ============================================================

export type MessageRole = 'user' | 'bot';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export interface HistoryEntry {
  id: string;
  topic: string;
  createdAt?: Date;
}

// The full shared state — matches the LangGraph AgentState schema
export interface CurioState {
  // ── Content State (driven by researcher/writer nodes) ─────
  currentTopic: string | null;
  article: string | null;       // Markdown from the writer node
  isGenerating: boolean;

  // ── Chat State (tutor sidebar) ────────────────────────────
  messages: Message[];

  // ── Session State (left sidebar) ──────────────────────────
  sessionId: string | null;
  history: HistoryEntry[];
}

// Context shape = state + action dispatchers
export interface CurioContextType extends CurioState {
  sendMessage: (content: string) => Promise<void>;
  igniteQuest: (topic?: string) => Promise<void>;
  clearSession: () => void;
}
