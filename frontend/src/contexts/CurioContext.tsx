/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  CurioContextType,
  CurioState,
  Message,
  UserSettings,
} from '../types/curio';
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  runCurioPipeline,
  askTutor,
  fetchHistory,
  fetchArticleById,
  fetchSavedSketches,
  saveSketch,
  unsaveSketch,
  updateSketchNotes as apiUpdateSketchNotes,
  fetchDailyWonder,
  generateDailyWonder as apiGenerateDailyWonder,
  fetchLibraryCollections,
  createCollection as apiCreateCollection,
  addArticleToCollection as apiAddArticleToCollection,
  fetchCollectionArticles,
  fetchSettings,
  updateSettings,
  fetchInterests,
  addInterest as apiAddInterest,
  deleteInterest as apiDeleteInterest,
  deleteArticle as apiDeleteArticle,
  fetchReadTimestamps,
} from '../actions/curio';

const CurioContext = createContext<CurioContextType | null>(null);

const INITIAL_STATE: CurioState = {
  user: null,
  token: null,
  activeTab: 'home',

  currentTopic: null,
  article: null,
  currentArticleId: null,
  isGeneratingArticle: false,
  generationStatus: null,
  rabbitHoles: null,
  tldr: null,

  messages: [
    {
      id: 'init-1',
      role: 'bot',
      content: "Hello! I'm CurioBot — your curiosity guide. Tap the ✨ Ignite button to begin, or ask me anything!",
      timestamp: new Date(),
    },
  ],
  isGeneratingChat: false,

  sessionId: null,
  history: [],

  savedSketches: [],
  libraryCollections: [],
  activeCollectionId: null,
  collectionArticles: [],
  dailyWonder: null,
  isGeneratingWonder: false,
  userSettings: null,
  interests: [],
  activeArticleId: null,
  readTimestamps: [],
};

export function CurioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurioState>(INITIAL_STATE);

  // ── Restore Auth Token on Mount ─────────────────────────────
  useEffect(() => {
    async function restoreAuth() {
      const storedToken = localStorage.getItem('curio_token');
      if (storedToken) {
        try {
          const user = await fetchCurrentUser();
          setState((prev) => ({
            ...prev,
            token: storedToken,
            user,
          }));
        } catch {
          console.warn('Failed to restore session. Clearing token.');
          localStorage.removeItem('curio_token');
        }
      }
    }
    restoreAuth();
  }, []);

  // ── Trigger Data Loading when Logged In ─────────────────────
  const loadUserData = useCallback(async () => {
    try {
      const historyList = await fetchHistory();
      const sketches = await fetchSavedSketches();
      const libraries = await fetchLibraryCollections();
      const wonder = await fetchDailyWonder();
      const settings = await fetchSettings();
      const interestsList = await fetchInterests();
      const timestamps = await fetchReadTimestamps().catch(() => []);

      setState((prev) => ({
        ...prev,
        history: historyList.map((entry) => ({
          id: entry.id,
          topic: entry.title,
          createdAt: new Date(entry.created_at),
        })),
        savedSketches: sketches,
        libraryCollections: libraries,
        dailyWonder: wonder.topic ? wonder : null,
        userSettings: settings,
        interests: interestsList,
        readTimestamps: timestamps,
      }));
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, []);

  useEffect(() => {
    if (state.token && state.user) {
      const timer = setTimeout(() => {
        loadUserData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state.token, state.user, loadUserData]);

  // ── Auth Actions ────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginUser(username, password);
    localStorage.setItem('curio_token', result.token);
    setState((prev) => ({
      ...prev,
      token: result.token,
      user: result.user,
    }));
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const result = await registerUser(email, username, password);
    localStorage.setItem('curio_token', result.token);
    setState((prev) => ({
      ...prev,
      token: result.token,
      user: result.user,
    }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('curio_token');
    setState(INITIAL_STATE);
  }, []);

  const changeTab = useCallback((tab: 'home' | 'discover' | 'search' | 'library' | 'interests' | 'settings') => {
    setState((prev) => ({
      ...prev,
      activeTab: tab,
      activeArticleId: null,
    }));
  }, []);

  // ── Chat Actions ────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    let currentMessages: Message[] = [];
    let currentArticle: string | null = null;

    setState((prev) => {
      currentMessages = prev.messages;
      currentArticle = prev.article;
      return {
        ...prev,
        messages: [...prev.messages, userMsg],
        isGeneratingChat: true,
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
        isGeneratingChat: false,
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
        isGeneratingChat: false,
      }));
    }
  }, []);

  // ── Article Exploration Actions ─────────────────────────────

  const igniteQuest = useCallback(async (topic?: string, hint?: string) => {
    let userInterests: string[] = [];
    setState((prev) => {
      userInterests = prev.interests;
      return {
        ...prev,
        currentTopic: topic ?? null,
        article: null,
        currentArticleId: null,
        activeArticleId: null,
        isGeneratingArticle: true,
        generationStatus: 'picking_topic',
        rabbitHoles: null,
        tldr: null,
        messages: [INITIAL_STATE.messages[0]],
      };
    });

    try {
      const result = await runCurioPipeline(
        topic ? [topic] : (userInterests.length ? userInterests : undefined),
        (status, data) => {
          setState((prev) => ({
            ...prev,
            generationStatus: status,
            ...(status === 'researching' && data ? { currentTopic: data.title } : {})
          }));
        },
        hint
      );
      const resolvedTopic = result.topic.title;

      setState((prev) => ({
        ...prev,
        isGeneratingArticle: false,
        generationStatus: null,
        currentTopic: resolvedTopic,
        article: result.article,
        currentArticleId: result.articleId ?? null,
        activeArticleId: result.articleId ?? null,
        rabbitHoles: result.rabbitHoles ?? null,
        tldr: result.tldr ?? null,
        sessionId: result.sessionId,
      }));

      // Refresh user's database list and read timestamps
      loadUserData();
    } catch (err) {
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'bot',
        content: `⚠️ Pipeline error: ${err instanceof Error ? err.message : 'Unknown error'}.`,
        timestamp: new Date(),
      };
      setState((prev) => ({
        ...prev,
        isGeneratingArticle: false,
        generationStatus: null,
        messages: [...prev.messages, errMsg],
      }));
    }
  }, [loadUserData]);

  const loadArticle = useCallback(async (id: string) => {
    setState((prev) => ({
      ...prev,
      isGeneratingArticle: true,
      messages: [INITIAL_STATE.messages[0]],
      activeArticleId: id,
    }));

    try {
      const art = await fetchArticleById(id);
      setState((prev) => ({
        ...prev,
        currentTopic: art.title,
        article: art.content,
        currentArticleId: art.id,
        activeArticleId: art.id,
        rabbitHoles: art.rabbit_holes ?? null,
        tldr: art.tldr ?? null,
        isGeneratingArticle: false,
      }));
      // Trigger user data refresh to fetch new read date logs
      loadUserData();
    } catch (err) {
      console.error('Failed to load article:', err);
      setState((prev) => ({
        ...prev,
        isGeneratingArticle: false,
      }));
    }
  }, [loadUserData]);

  const closeArticle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeArticleId: null,
      article: null,
      currentTopic: null,
      currentArticleId: null,
    }));
  }, []);

  const loadReadTimestamps = useCallback(async () => {
    try {
      const timestamps = await fetchReadTimestamps();
      setState((prev) => ({ ...prev, readTimestamps: timestamps }));
    } catch (err) {
      console.error('Failed to reload read timestamps:', err);
    }
  }, []);

  // ── Sketches (Bookmarks) ────────────────────────────────────

  const loadSavedSketches = useCallback(async () => {
    try {
      const sketches = await fetchSavedSketches();
      setState((prev) => ({ ...prev, savedSketches: sketches }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const toggleSaveArticle = useCallback(async (notes?: string) => {
    const articleId = state.currentArticleId;
    if (!articleId) return;

    const isCurrentlySaved = state.savedSketches.some((s) => s.article_id === articleId);
    const originalSavedSketches = state.savedSketches;

    // Optimistic Update
    setState((prev) => {
      if (isCurrentlySaved) {
        return {
          ...prev,
          savedSketches: prev.savedSketches.filter((s) => s.article_id !== articleId),
        };
      } else {
        const historyEntry = prev.history.find((h) => h.id === articleId);
        const newOptimisticSketch = {
          id: `temp-${Date.now()}`,
          notes: notes ?? null,
          created_at: new Date().toISOString(),
          article_id: articleId,
          articles: {
            id: articleId,
            title: prev.currentTopic ?? historyEntry?.topic ?? 'Curious Topic',
            domain: 'general',
            summary: prev.tldr ?? 'A curious article.',
            content: prev.article ?? '',
          },
        };
        return {
          ...prev,
          savedSketches: [...prev.savedSketches, newOptimisticSketch],
        };
      }
    });

    try {
      if (isCurrentlySaved) {
        await unsaveSketch(articleId);
      } else {
        await saveSketch(articleId, notes);
      }
      // Reload sketches list (refreshes real database IDs and metadata)
      await loadSavedSketches();
    } catch (err) {
      console.error('Failed to save/unsave sketch:', err);
      // Rollback
      setState((prev) => ({
        ...prev,
        savedSketches: originalSavedSketches,
      }));
    }
  }, [state.currentArticleId, state.savedSketches, loadSavedSketches]);

  const deleteSavedSketch = useCallback(async (articleId: string) => {
    const originalSavedSketches = state.savedSketches;
    setState((prev) => ({
      ...prev,
      savedSketches: prev.savedSketches.filter((s) => s.article_id !== articleId),
    }));
    try {
      await unsaveSketch(articleId);
      await loadSavedSketches();
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        savedSketches: originalSavedSketches,
      }));
    }
  }, [state.savedSketches, loadSavedSketches]);

  const updateSketchNotes = useCallback(async (articleId: string, notes: string) => {
    try {
      await apiUpdateSketchNotes(articleId, notes);
      loadSavedSketches();
    } catch (err) {
      console.error(err);
    }
  }, [loadSavedSketches]);

  // ── Daily Wonder ───────────────────────────────────────────

  const loadDailyWonder = useCallback(async () => {
    try {
      const wonder = await fetchDailyWonder();
      setState((prev) => ({ ...prev, dailyWonder: wonder.topic ? wonder : null }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const generateDailyWonder = useCallback(async () => {
    setState((prev) => ({ ...prev, isGeneratingWonder: true }));
    try {
      const wonder = await apiGenerateDailyWonder();
      setState((prev) => ({
        ...prev,
        isGeneratingWonder: false,
        dailyWonder: wonder,
      }));
      // Automatically load the newly generated article in the editor
      if (wonder.article_id) {
        loadArticle(wonder.article_id);
      }
    } catch (err) {
      console.error(err);
      setState((prev) => ({ ...prev, isGeneratingWonder: false }));
    }
  }, [loadArticle]);

  // ── Library Collections ─────────────────────────────────────

  const loadLibrary = useCallback(async () => {
    try {
      const collections = await fetchLibraryCollections();
      setState((prev) => ({ ...prev, libraryCollections: collections }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const createCollection = useCallback(async (name: string, description?: string) => {
    try {
      await apiCreateCollection(name, description);
      loadLibrary();
    } catch (err) {
      console.error(err);
    }
  }, [loadLibrary]);

  const addArticleToCollection = useCallback(async (collectionId: string, articleId: string) => {
    try {
      await apiAddArticleToCollection(collectionId, articleId);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadCollectionArticles = useCallback(async (collectionId: string) => {
    try {
      const list = await fetchCollectionArticles(collectionId);
      setState((prev) => ({ ...prev, collectionArticles: list }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const setActiveCollectionId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeCollectionId: id }));
  }, []);

  const clearSession = useCallback(() => {
    setState((prev) => ({
      ...INITIAL_STATE,
      user: prev.user,
      token: prev.token,
    }));
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await fetchSettings();
      setState((prev) => ({ ...prev, userSettings: settings }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const saveSettings = useCallback(async (settings: UserSettings) => {
    try {
      await updateSettings(settings);
      setState((prev) => ({ ...prev, userSettings: settings }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadInterests = useCallback(async () => {
    try {
      const list = await fetchInterests();
      setState((prev) => ({ ...prev, interests: list }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const addInterest = useCallback(async (interest: string) => {
    const originalInterests = state.interests;
    setState((prev) => {
      if (prev.interests.includes(interest)) return prev;
      return {
        ...prev,
        interests: [...prev.interests, interest],
      };
    });
    try {
      await apiAddInterest(interest);
      await loadInterests();
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        interests: originalInterests,
      }));
    }
  }, [state.interests, loadInterests]);

  const deleteInterest = useCallback(async (interest: string) => {
    const originalInterests = state.interests;
    setState((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
    try {
      await apiDeleteInterest(interest);
      await loadInterests();
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        interests: originalInterests,
      }));
    }
  }, [state.interests, loadInterests]);

  const deleteArticle = useCallback(async (id: string) => {
    const originalHistory = state.history;
    const originalArticleId = state.currentArticleId;
    const originalTopic = state.currentTopic;
    const originalArticle = state.article;
    const originalActiveArticleId = state.activeArticleId;

    setState((prev) => {
      const isCurrent = prev.currentArticleId === id;
      return {
        ...prev,
        history: prev.history.filter((entry) => entry.id !== id),
        ...(isCurrent ? { currentTopic: null, article: null, currentArticleId: null, activeArticleId: null } : {}),
      };
    });

    try {
      await apiDeleteArticle(id);
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        history: originalHistory,
        currentArticleId: originalArticleId,
        currentTopic: originalTopic,
        article: originalArticle,
        activeArticleId: originalActiveArticleId,
      }));
    }
  }, [state.history, state.currentArticleId, state.currentTopic, state.article, state.activeArticleId]);

  const contextValue: CurioContextType = {
    ...state,
    login,
    register,
    logout,
    changeTab,
    sendMessage,
    igniteQuest,
    clearSession,
    loadArticle,
    closeArticle,
    toggleSaveArticle,
    deleteSavedSketch,
    updateSketchNotes,
    loadSavedSketches,
    loadLibrary,
    createCollection,
    addArticleToCollection,
    loadCollectionArticles,
    setActiveCollectionId,
    loadDailyWonder,
    generateDailyWonder,
    loadSettings,
    saveSettings,
    loadInterests,
    addInterest,
    deleteInterest,
    deleteArticle,
    loadReadTimestamps,
  };

  return (
    <CurioContext.Provider value={contextValue}>
      {children}
    </CurioContext.Provider>
  );
}

export function useCurio(): CurioContextType {
  const ctx = useContext(CurioContext);
  if (!ctx) {
    throw new Error('[CurioBot] useCurio() must be called inside a <CurioProvider>.');
  }
  return ctx;
}
