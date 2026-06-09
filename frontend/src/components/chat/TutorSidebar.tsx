// TutorSidebar — Right pane chat interface.
// Resizable via drag on the left edge. No collapse — always visible.

import { useRef, useCallback, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';

const MIN_WIDTH = 240;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 320;
const WIDTH_KEY = 'curio_sidebar_width';

export function TutorSidebar() {
  const { messages, isGeneratingChat, sendMessage, isTutorOpen, setTutorOpen } = useChat();
  const { article } = usePipeline();
  const isChatReady = !!article;

  const sidebarRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const currentWidth = useRef(DEFAULT_WIDTH);

  function applyWidth(width: number) {
    const clamped = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    currentWidth.current = clamped;
    if (sidebarRef.current) sidebarRef.current.style.width = `${clamped}px`;
    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) main.style.marginRight = `${clamped}px`;
  }

  useEffect(() => {
    const stored = localStorage.getItem(WIDTH_KEY);
    const width = stored ? parseInt(stored, 10) : DEFAULT_WIDTH;
    currentWidth.current = width;
    if (sidebarRef.current) sidebarRef.current.style.width = `${width}px`;
    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) main.style.marginRight = `${width}px`;

    return () => {
      if (main) main.style.marginRight = '0px';
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth <= 768) return; // Disable resizing on mobile
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarRef.current?.offsetWidth ?? DEFAULT_WIDTH;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      applyWidth(startWidth.current + (startX.current - e.clientX));
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(WIDTH_KEY, String(currentWidth.current));
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <>
      {isTutorOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setTutorOpen(false)} 
        />
      )}
      <aside className={`right-sidebar${isTutorOpen ? ' right-sidebar--open' : ''}`} ref={sidebarRef}>
        <div className="sidebar-resize-handle" onMouseDown={onMouseDown} />

        <div className="tutor-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>The Tutor</h3>
              <p>Interactive Guide</p>
            </div>
            <button 
              className="mobile-close-btn" 
              onClick={() => setTutorOpen(false)}
              aria-label="Close Chat"
            >
              <span className="material-symbols-outlined">{"close"}</span>
            </button>
          </div>
        </div>

      <div className="chat-area" role="log" aria-live="polite" aria-label="Chat messages">
        {isChatReady ? (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isGeneratingChat && <TypingIndicator />}
          </>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: '1.05rem',
              color: 'var(--ink-wash)',
              textAlign: 'center',
              padding: '2rem 1rem',
              marginTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary-container)' }}>
              history_edu
            </span>
            <span>Ignite curiosity or load an article to begin learning with the Tutor.</span>
          </div>
        )}
      </div>

      <ChatInput onSend={sendMessage} disabled={!isChatReady || isGeneratingChat} />
      </aside>
    </>
  );
}
