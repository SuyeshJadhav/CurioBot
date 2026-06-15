// ChatMessage — Renders a single message bubble with Markdown support.
// Bot messages render with react-markdown; user messages stay plain text.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/curio';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot';
  return (
    <div className={isBot ? 'bubble-bot' : 'bubble-user'}>
      {isBot ? (
        <div className="prose-chat">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content ?? ''}
          </ReactMarkdown>
        </div>
      ) : (
        message.content
      )}
    </div>
  );
}
