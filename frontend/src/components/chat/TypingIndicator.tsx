// TypingIndicator — Animated three-dot ellipsis shown while the bot is generating.
// Pure presentational — no props, no context reads.
// Uses the @keyframes blink animation defined in index.css.

import type React from 'react';

const DOT_STYLE: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: 'var(--ink-wash)',
  display: 'inline-block',
};

export function TypingIndicator() {
  return (
    <div className="bubble-bot" role="status" aria-label="Bot is typing">
      <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <span style={{ ...DOT_STYLE, animation: 'blink 1.2s infinite' }} />
        <span style={{ ...DOT_STYLE, animation: 'blink 1.2s 0.4s infinite' }} />
        <span style={{ ...DOT_STYLE, animation: 'blink 1.2s 0.8s infinite' }} />
      </span>
    </div>
  );
}
