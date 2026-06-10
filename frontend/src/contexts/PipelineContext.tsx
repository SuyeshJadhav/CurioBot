/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { HistoryEntry, Message } from '../types/curio';
import { runCurioPipeline, fetchHistory, fetchArticleById, deleteArticle as apiDeleteArticle } from '../actions/pipelineActions';
import { useAuth } from './AuthContext';
import { usePreferences } from './UserPreferencesContext';

export interface PipelineContextType {
  currentTopic: string | null;
  article: string | null;
  currentArticleId: string | null;
  activeArticleId: string | null;
  isGeneratingArticle: boolean;
  generationStatus: string | null;
  rabbitHoles: Array<{ title: string; domain: string; why: string }> | null;
  tldr: string | null;
  sessionId: string | null;
  history: HistoryEntry[];
  isLoadingHistory: boolean;
  pipelineMessages: Message[];  // error messages from pipeline runs
  igniteQuest: (topic?: string | { title: string; domain?: string; summary?: string }, hint?: string) => Promise<void>;
  loadArticle: (id: string) => Promise<void>;
  closeArticle: () => void;
  clearSession: () => void;
  deleteArticle: (id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
}

const INIT_BOT_MSG: Message = {
  id: 'init-1', role: 'bot',
  content: "Hello! I'm Curios — your curiosity guide. Tap the ✨ Ignite button to begin, or ask me anything!",
  timestamp: new Date(),
};

const PipelineContext = createContext<PipelineContextType | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { interests } = usePreferences();

  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [article, setArticle] = useState<string | null>(null);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [rabbitHoles, setRabbitHoles] = useState<PipelineContextType['rabbitHoles']>(null);
  const [tldr, setTldr] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pipelineMessages, setPipelineMessages] = useState<Message[]>([INIT_BOT_MSG]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchHistory();
      setHistory(data.map((e: any) => ({ id: e.id, topic: e.title, createdAt: new Date(e.created_at) })));
    } catch (err) { console.error('Failed to load history:', err); }
    finally { setIsLoadingHistory(false); }
  }, []);

  useEffect(() => { if (token) loadHistory(); }, [token, loadHistory]);

  const igniteQuest = useCallback(async (topic?: string | { title: string; domain?: string; summary?: string }, hint?: string) => {
    let topicObj: { title: string; domain?: string; summary?: string } | undefined = undefined;
    let displayTitle: string | null = null;

    if (topic) {
      if (typeof topic === 'string') {
        topicObj = { title: topic };
        displayTitle = topic;
      } else {
        topicObj = topic;
        displayTitle = topic.title;
      }
    }

    setCurrentTopic(displayTitle); setArticle(null); setCurrentArticleId(null);
    setActiveArticleId(null); setIsGeneratingArticle(true);
    setGenerationStatus('picking_topic'); setRabbitHoles(null); setTldr(null);
    setPipelineMessages([INIT_BOT_MSG]);
    try {
      const result = await runCurioPipeline(
        interests.length ? interests : undefined,
        (status, data) => { setGenerationStatus(status); if (status === 'researching' && data) setCurrentTopic(data.title); },
        hint,
        topicObj,
      );
      setCurrentTopic(result.topic.title); setArticle(result.article);
      setCurrentArticleId(result.articleId ?? null); setActiveArticleId(result.articleId ?? null);
      setRabbitHoles(result.rabbitHoles ?? null); setTldr(result.tldr ?? null);
      setSessionId(result.sessionId); setIsGeneratingArticle(false); setGenerationStatus(null);
      loadHistory();
    } catch (err: any) {
      setIsGeneratingArticle(false); setGenerationStatus(null);
      setPipelineMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'bot', content: `⚠️ ${err.message}`, timestamp: new Date() }]);
    }
  }, [interests, loadHistory]);

  const loadArticle = useCallback(async (id: string) => {
    setIsGeneratingArticle(true); setArticle(null); setCurrentTopic(null); setActiveArticleId(id);
    setPipelineMessages([INIT_BOT_MSG]);
    try {
      const art = await fetchArticleById(id);
      setCurrentTopic(art.title); setArticle(art.content); setCurrentArticleId(art.id);
      setActiveArticleId(art.id); setRabbitHoles(art.rabbit_holes ?? null); setTldr(art.tldr ?? null);
      setIsGeneratingArticle(false); loadHistory();
    } catch { setIsGeneratingArticle(false); }
  }, [loadHistory]);

  const closeArticle = useCallback(() => {
    setActiveArticleId(null); setArticle(null); setCurrentTopic(null); setCurrentArticleId(null);
  }, []);

  const clearSession = useCallback(() => {
    setCurrentTopic(null); setArticle(null); setCurrentArticleId(null); setActiveArticleId(null);
    setIsGeneratingArticle(false); setGenerationStatus(null); setRabbitHoles(null); setTldr(null);
    setSessionId(null); setPipelineMessages([INIT_BOT_MSG]);
  }, []);

  const deleteArticle = useCallback(async (id: string) => {
    const prevHistory = history;
    setHistory((h) => h.filter((e) => e.id !== id));
    if (currentArticleId === id) closeArticle();
    try { await apiDeleteArticle(id); }
    catch { setHistory(prevHistory); }
  }, [history, currentArticleId, closeArticle]);

  return (
    <PipelineContext.Provider value={{
      currentTopic, article, currentArticleId, activeArticleId, isGeneratingArticle,
      generationStatus, rabbitHoles, tldr, sessionId, history, isLoadingHistory,
      pipelineMessages, igniteQuest, loadArticle, closeArticle, clearSession, deleteArticle, loadHistory,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline(): PipelineContextType {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('[Curios] usePipeline() must be called inside <PipelineProvider>.');
  return ctx;
}
