// TutorSidebar — Right pane chat interface.
// Resizable via drag on the left edge. Collapsable via button.

import { useRef, useCallback, useEffect, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';

const MIN_WIDTH = 240;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 320;
const WIDTH_KEY = 'curio_sidebar_width';
// Gap between the left edge of sidebar and the centre of the toggle button
const TOGGLE_OFFSET = 18;

export function TutorSidebar() {
  const { messages, isGeneratingChat, sendMessage, isTutorOpen, setTutorOpen } = useChat();
  const { article } = usePipeline();
  const isChatReady = !!article;

  const sidebarRef  = useRef<HTMLElement>(null);
  const toggleRef   = useRef<HTMLButtonElement>(null);
  const isDragging  = useRef(false);
  const startX      = useRef(0);
  const startWidth  = useRef(DEFAULT_WIDTH);
  const currentWidth = useRef(DEFAULT_WIDTH);

  const [isCollapsed, setIsCollapsed] = useState(() =>
    localStorage.getItem('curio_sidebar_collapsed') === 'true'
  );

  // ── Imperatively position the toggle button ──────────────────────────────
  // "right" value when expanded = sidebar width + a small gap so the button
  // peeks out from the left edge of the sidebar.
  // When collapsed the button sits just inside the viewport at `right: 12px`.
  function applyTogglePosition(collapsed: boolean, width: number) {
    if (!toggleRef.current) return;
    toggleRef.current.style.right = collapsed
      ? '12px'
      : `${width - TOGGLE_OFFSET}px`;
  }

  // ── Sync sidebar width + main margin + toggle ─────────────────────────────
  function applyWidth(width: number) {
    const clamped = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    currentWidth.current = clamped;
    if (sidebarRef.current) sidebarRef.current.style.width = `${clamped}px`;
    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) main.style.marginRight = `${clamped}px`;
    applyTogglePosition(false, clamped);
  }

  // ── Toggle collapse ───────────────────────────────────────────────────────
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('curio_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // On collapse state change: animate margin + reposition toggle
  useEffect(() => {
    const stored = localStorage.getItem(WIDTH_KEY);
    const width = stored ? parseInt(stored, 10) : DEFAULT_WIDTH;
    currentWidth.current = width;

    if (sidebarRef.current) sidebarRef.current.style.width = `${width}px`;

    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) {
      main.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      main.style.marginRight = isCollapsed ? '0px' : `${width}px`;
    }

    // Delay toggle reposition until after collapse CSS transition completes
    // so it isn't clipped by the sidebar edge mid-animation
    const delay = isCollapsed ? 0 : 50;
    const tid = setTimeout(() => applyTogglePosition(isCollapsed, width), delay);

    return () => {
      clearTimeout(tid);
      const m = document.querySelector<HTMLElement>('.main-content');
      if (m) { m.style.transition = ''; m.style.marginRight = '0px'; }
    };
  }, [isCollapsed]);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth <= 768 || isCollapsed) return;
    e.preventDefault();

    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarRef.current?.offsetWidth ?? DEFAULT_WIDTH;

    // Kill transitions during drag for zero-lag
    if (sidebarRef.current) sidebarRef.current.style.transition = 'none';
    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) main.style.transition = 'none';
    if (toggleRef.current) toggleRef.current.style.transition = 'none';

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [isCollapsed]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      applyWidth(startWidth.current + (startX.current - e.clientX));
    }

    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;

      // Restore transitions
      const ease = '0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      if (sidebarRef.current) sidebarRef.current.style.transition = `transform ${ease}`;
      const main = document.querySelector<HTMLElement>('.main-content');
      if (main) main.style.transition = `margin-right ${ease}`;
      if (toggleRef.current) toggleRef.current.style.transition = `right ${ease}, transform 0.3s ${ease}, box-shadow 0.2s, border-color 0.2s`;

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
        <div className="sidebar-backdrop" onClick={() => setTutorOpen(false)} />
      )}

      {/* Toggle lives OUTSIDE the aside so translateX on aside never hides it */}
      <button
        ref={toggleRef}
        onClick={toggleCollapse}
        className="sidebar-collapse-toggle"
        title={isCollapsed ? 'Expand Tutor' : 'Collapse Tutor'}
        style={{
          position: 'fixed',
          // Initial right position set imperatively in useEffect;
          // this inline value is just the SSR/first-paint fallback.
          right: isCollapsed ? '12px' : `${DEFAULT_WIDTH - TOGGLE_OFFSET}px`,
          top: '24px',
          zIndex: 50,
          background: 'var(--surface-cream, #FAF6EE)',
          border: '1.5px solid var(--outline-variant, #e5e9ec)',
          color: 'var(--ink-charcoal, #1C1917)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s',
          transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 5px 15px rgba(127,119,221,0.18)';
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = 'var(--outline-variant, #e5e9ec)';
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
      </button>

      <aside
        className={`right-sidebar${isTutorOpen ? ' right-sidebar--open' : ''}${isCollapsed ? ' right-sidebar--collapsed' : ''}`}
        ref={sidebarRef}
      >
        {!isCollapsed && <div className="sidebar-resize-handle" onMouseDown={onMouseDown} />}

        <div className="tutor-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Tutor</h3>
              <p>Ask anything about this article</p>
            </div>
            <button
              className="mobile-close-btn"
              onClick={() => setTutorOpen(false)}
              aria-label="Close Chat"
            >
              <span className="material-symbols-outlined">close</span>
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
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                color: 'var(--ink-wash)',
                textAlign: 'center',
                padding: '2rem 1.25rem',
                marginTop: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
              <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>No article open</span>
              <span style={{ lineHeight: 1.5 }}>Generate or open an article from your history to start a conversation here.</span>
            </div>
          )}
        </div>

        <ChatInput onSend={sendMessage} disabled={!isChatReady || isGeneratingChat} />
      </aside>
    </>
  );
}
