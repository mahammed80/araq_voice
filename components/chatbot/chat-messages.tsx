'use client';

import { cn } from '@/lib/utils';
import { ChatMessage } from './chatbot';

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent?: string;
  isLoading: boolean;
}

export function ChatMessages({ messages, streamingContent, isLoading }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground text-lg">ابدأ محادثة مع مساعد AI</p>
          <p className="text-muted-foreground text-sm">
            اسأل أي شيء واحصل على إجابات فورية بالعربية
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
        >
          {/* Avatar */}
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {message.role === 'user' ? 'أنت' : 'مساعد'}
          </div>

          {/* Message Content */}
          <div
            className={cn(
              'flex-1 rounded-lg px-4 py-2',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                : 'bg-muted text-foreground mr-auto max-w-[80%]'
            )}
          >
            <div className="break-words whitespace-pre-wrap">
              {message.content ||
                (isLoading && message.role === 'assistant' ? streamingContent : '')}
            </div>
            {isLoading && message.role === 'assistant' && message.content && streamingContent && (
              <span className="ml-1 inline-block animate-pulse">▋</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
