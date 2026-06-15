// ChatInput — Textarea + send button at the bottom of TutorSidebar.
// Receives onSend and disabled as props from TutorSidebar.
// Owns only the local draft string — no global state needed here.

import { useState, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    setDraft('');
    await onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <textarea
          id="chat-draft"
          rows={2}
          placeholder="Ask a question..."
          aria-label="Ask the tutor"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          id="chat-send-btn"
          className="chat-send-btn"
          aria-label="Send message"
          disabled={disabled || !draft.trim()}
          onClick={handleSend}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            send
          </span>
        </button>
      </div>
    </div>
  );
}
