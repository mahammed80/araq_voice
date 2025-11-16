'use client';

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
    <div className="space-y-3 pb-4" dir="rtl" lang="ar">
      {messages.map((message) => {
        // User message layout (RIGHT side)
        if (message.role === 'user') {
          return (
            <div key={message.id} className="flex items-start gap-2 flex-row-reverse justify-start">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-primary/20 border-primary">
                <span className="text-xs">👤</span>
              </div>

              {/* Message Bubble */}
              <div className="rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground max-w-[75%]">
                <div className="break-words whitespace-pre-wrap leading-relaxed text-right">
                  {message.content}
                </div>
              </div>
            </div>
          );
        }

        // System/Assistant message layout (LEFT side)
        return (
          <div key={message.id} className="flex items-start gap-2 flex-row justify-start">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-primary/20 border-primary">
              <span className="text-xs">🤖</span>
            </div>

            {/* Message Bubble */}
            <div className="rounded-2xl px-4 py-2.5 bg-primary/40 text-foreground max-w-[75%]">
              <div className="break-words whitespace-pre-wrap leading-relaxed text-right">
                {message.content ||
                  (isLoading ? streamingContent : '')}
              </div>
              {isLoading && message.content && streamingContent && (
                <span className="mr-2 inline-block animate-pulse text-lg">▋</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}