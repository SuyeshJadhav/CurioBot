// ChatMessage — Renders a single message bubble.
// Pure presentational — receives a Message object as a prop.
// Applies .bubble-bot or .bubble-user class based on role.

import type { Message } from '../../types/curio';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot';
  return (
    <div className={isBot ? 'bubble-bot' : 'bubble-user'}>
      {message.content}
    </div>
  );
}
