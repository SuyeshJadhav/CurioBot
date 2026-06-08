// ============================================================
//  CurioBot — Shared State Interface
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

export interface User {
  id: string;
  email: string;
  username: string;
  token_balance?: number;
}

export interface SavedSketch {
  id: string;
  notes: string | null;
  created_at: string;
  article_id: string;
  articles: {
    id: string;
    title: string;
    domain: string;
    summary: string;
    content: string;
  };
}

export interface LibraryCollection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CollectionArticle {
  id: string;
  created_at: string;
  articles: {
    id: string;
    title: string;
    domain: string;
    summary: string;
  };
}

export interface DailyWonder {
  id: string;
  topic: string;
  summary: string;
  domain: string;
  publish_date: string;
  article_id?: string;
}

export interface UserSettings {
  model: string;
  reading_time?: "2min" | "5min" | "10min";
  knowledge_level?: "beginner" | "intermediate" | "expert";
  topic_novelty?: "familiar" | "mixed" | "wildcard";
  onboarding_complete?: boolean;
}

// The full shared state
export interface CurioState {
  user: User | null;
  token: string | null;
  activeTab: 'home' | 'discover' | 'search' | 'library' | 'interests' | 'settings';
  isTutorOpen: boolean;
  isMenuOpen: boolean;

  // ── Content State ──────────────────────────────────────────
  currentTopic: string | null;
  article: string | null;       // Markdown from the writer node
  currentArticleId: string | null;
  isGeneratingArticle: boolean;
  generationStatus: string | null;
  rabbitHoles: Array<{ title: string; domain: string; why: string }> | null;
  tldr: string | null;

  // ── Chat State (tutor sidebar) ────────────────────────────
  messages: Message[];
  isGeneratingChat: boolean;

  // ── Session State (left sidebar) ──────────────────────────
  sessionId: string | null;
  history: HistoryEntry[];

  // ── Tab Collections ───────────────────────────────────────
  savedSketches: SavedSketch[];
  libraryCollections: LibraryCollection[];
  activeCollectionId: string | null;
  collectionArticles: CollectionArticle[];
  dailyWonder: DailyWonder | null;
  isGeneratingWonder: boolean;
  
  // ── User Settings & Interests ─────────────────────────────
  userSettings: UserSettings | null;
  interests: string[];

  // ── Read Tracking & Overlay ──────────────────────────────
  activeArticleId: string | null;
  isLoadingUserData: boolean;
}

// Context shape = state + action dispatchers
export interface CurioContextType extends CurioState {
  login: (username: string, password: string) => Promise<void>;
  loginWithOAuth: (token: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  changeTab: (tab: 'home' | 'discover' | 'search' | 'library' | 'interests' | 'settings') => void;
  setTutorOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  
  sendMessage: (content: string) => Promise<void>;
  igniteQuest: (topic?: string, hint?: string) => Promise<void>;
  clearSession: () => void;

  loadArticle: (id: string) => Promise<void>;
  closeArticle: () => void;
  toggleSaveArticle: (notes?: string) => Promise<void>;
  deleteSavedSketch: (articleId: string) => Promise<void>;
  updateSketchNotes: (articleId: string, notes: string) => Promise<void>;
  loadSavedSketches: () => Promise<void>;
  loadLibrary: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  addArticleToCollection: (collectionId: string, articleId: string) => Promise<void>;
  loadCollectionArticles: (collectionId: string) => Promise<void>;
  setActiveCollectionId: (collectionId: string | null) => void;
  loadDailyWonder: () => Promise<void>;
  generateDailyWonder: () => Promise<void>;
  
  loadSettings: () => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  loadInterests: () => Promise<void>;
  addInterest: (interest: string) => Promise<void>;
  deleteInterest: (interest: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
}

