// TutorSidebar — Right pane chat interface.
// Reads: messages, isGenerating, sendMessage from CurioContext.
// Width: 320px fixed, matches .main-content margin-right in CSS.

import { useCurio } from '../../contexts/CurioContext';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';

export function TutorSidebar() {
  const { messages, isGenerating, sendMessage } = useCurio();

  return (
    <aside className="right-sidebar">
      <div className="tutor-header">
        <h3>The Tutor</h3>
        <p>Interactive Guide</p>
      </div>

      <div className="chat-area" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isGenerating && <TypingIndicator />}
      </div>

      <ChatInput onSend={sendMessage} disabled={isGenerating} />
    </aside>
  );
}
