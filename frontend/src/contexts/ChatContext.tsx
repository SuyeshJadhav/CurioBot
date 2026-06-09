/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Message } from '../types/curio';
import { askTutor } from '../actions/settingsActions';
import { useAuth } from './AuthContext';
import { usePipeline } from './PipelineContext';

export interface ChatContextType {
  messages: Message[];
  isGeneratingChat: boolean;
  isTutorOpen: boolean;
  sendMessage: (content: string) => Promise<void>;
  setTutorOpen: (open: boolean) => void;
}

const INIT_MSG: Message = {
  id: 'init-1', role: 'bot',
  content: "Hello! I'm Curios — your curiosity guide. Tap the ✨ Ignite button to begin, or ask me anything!",
  timestamp: new Date(),
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { updateUser } = useAuth();
  const { article, activeArticleId } = usePipeline();

  const [messages, setMessages] = useState<Message[]>([INIT_MSG]);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  // Reset chat when switching articles
  useEffect(() => { setMessages([INIT_MSG]); }, [activeArticleId]);

  const setTutorOpen = useCallback((open: boolean) => setIsTutorOpen(open), []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = { id: `msg-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    let currentMessages: Message[] = [];
    setMessages((prev) => { currentMessages = prev; return [...prev, userMsg]; });
    setIsGeneratingChat(true);

    try {
      const { reply, tokenBalance } = await askTutor(content, currentMessages, article ?? '');
      const botMsg: Message = { id: `msg-${Date.now() + 1}`, role: 'bot', content: reply, timestamp: new Date() };
      setMessages((prev) => [...prev, botMsg]);
      if (tokenBalance !== undefined) {
        // Propagate new token balance up to auth context so the sidebar updates
        updateUser({ ...(null as any), token_balance: tokenBalance } as any);
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`, role: 'bot',
        content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsGeneratingChat(false);
    }
  }, [article, updateUser]);

  return (
    <ChatContext.Provider value={{ messages, isGeneratingChat, isTutorOpen, sendMessage, setTutorOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('[Curios] useChat() must be called inside <ChatProvider>.');
  return ctx;
}
