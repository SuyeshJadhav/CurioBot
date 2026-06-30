/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { HistoryEntry, Message } from '../types/curio';
import { runCurioPipeline, fetchHistory, fetchArticleById, deleteArticle as apiDeleteArticle, clearActiveJobId } from '../actions/pipelineActions';
import { useBootstrap } from './BootstrapContext';
import { usePreferences } from './UserPreferencesContext';

import { useNavigate } from 'react-router-dom';

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
  currentDomain: string | null;
  igniteQuest: (topic?: string | { title: string; domain?: string; summary?: string }, hint?: string) => Promise<void>;
  loadArticle: (id: string) => Promise<void>;
  closeArticle: (options?: { skipNavigate?: boolean }) => void;
  clearSession: () => void;
  deleteArticle: (id: string) => Promise<void>;
  loadHistory: () => Promise<void>;
}

const INIT_BOT_MSG: Message = {
  id: 'init-1', role: 'bot',
  content: "Welcome to your reading companion. I can explain tricky concepts, dig deeper into any section, or help you connect ideas across topics. Just ask.",
  timestamp: new Date(),
};

const PipelineContext = createContext<PipelineContextType | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { bootstrap } = useBootstrap();
  const { interests } = usePreferences();
  const navigate = useNavigate();

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
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchHistory();
      setHistory(data.map((e: any) => ({ id: e.id, topic: e.title, createdAt: new Date(e.created_at) })));
    } catch (err) { console.error('Failed to load history:', err); }
    finally { setIsLoadingHistory(false); }
  }, []);

  // Seed history from bootstrap payload — avoids individual fetch-on-mount
  useEffect(() => {
    if (!bootstrap?.history) return;
    setHistory(
      bootstrap.history.map((e: any) => ({ id: e.id, topic: e.title, createdAt: new Date(e.created_at) }))
    );
  }, [bootstrap]);

  const igniteQuest = useCallback(async (topic?: string | { title: string; domain?: string; summary?: string }, hint?: string) => {
    if (isGeneratingArticle) return;
    clearActiveJobId();

    let topicObj: { title: string; domain?: string; summary?: string } | undefined = undefined;
    let displayTitle: string | null = null;
    let displayDomain: string | null = null;

    if (topic) {
      if (typeof topic === 'string') {
        topicObj = { title: topic };
        displayTitle = topic;
      } else {
        topicObj = topic;
        displayTitle = topic.title;
        displayDomain = topic.domain ?? null;
      }
    }

    setCurrentTopic(displayTitle); setCurrentDomain(displayDomain); setArticle(null); setCurrentArticleId(null);
    setActiveArticleId(null); setIsGeneratingArticle(true);
    setGenerationStatus('picking_topic'); setRabbitHoles(null); setTldr(null);
    setPipelineMessages([INIT_BOT_MSG]);
    navigate('/ignite');
    try {
      const result = await runCurioPipeline(
        interests.length ? interests.slice(0, 15) : undefined,
        (status, data) => { setGenerationStatus(status); if (status === 'researching' && data) { setCurrentTopic(data.title); setCurrentDomain(data.domain || data.category || null); } },
        hint,
        topicObj,
      );
      setCurrentTopic(result.topic.title); setCurrentDomain(result.topic.domain || null); setArticle(result.article);
      setCurrentArticleId(result.articleId ?? null); setActiveArticleId(result.articleId ?? null);
      setRabbitHoles(result.rabbitHoles ?? null); setTldr(result.tldr ?? null);
      setSessionId(result.sessionId); setIsGeneratingArticle(false); setGenerationStatus(null);
      loadHistory();
      if (result.articleId) {
        navigate(`/article/${result.articleId}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setIsGeneratingArticle(false); setGenerationStatus(null);
      setPipelineMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'bot', content: `⚠️ ${err.message}`, timestamp: new Date() }]);
    }
  }, [interests, loadHistory, isGeneratingArticle, navigate]);

  const loadArticle = useCallback(async (id: string) => {
    if (id === currentArticleId || (id === activeArticleId && isGeneratingArticle)) {
      navigate(`/article/${id}`);
      return;
    }
    setIsGeneratingArticle(true); setArticle(null); setCurrentTopic(null); setCurrentDomain(null); setActiveArticleId(id);
    setPipelineMessages([INIT_BOT_MSG]);
    navigate(`/article/${id}`);
    try {
      const art = await fetchArticleById(id);
      setCurrentTopic(art.title); setCurrentDomain(art.domain || art.category || null); setArticle(art.content); setCurrentArticleId(art.id);
      setActiveArticleId(art.id); setRabbitHoles(art.rabbit_holes ?? null); setTldr(art.tldr ?? null);
      setIsGeneratingArticle(false);
    } catch { setIsGeneratingArticle(false); }
  }, [navigate, currentArticleId, activeArticleId, isGeneratingArticle]);

  const closeArticle = useCallback((options?: { skipNavigate?: boolean }) => {
    setActiveArticleId(null); setArticle(null); setCurrentTopic(null); setCurrentDomain(null); setCurrentArticleId(null);
    if (options?.skipNavigate) return;
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/library');
    }
  }, [navigate]);

  const clearSession = useCallback(() => {
    setCurrentTopic(null); setCurrentDomain(null); setArticle(null); setCurrentArticleId(null); setActiveArticleId(null);
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
      currentDomain,
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
