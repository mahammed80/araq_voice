'use client';

import { KeyboardEvent, useState } from 'react';
import { Button } from '@/components/livekit/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-3" dir="rtl" lang="ar">
      <div className="bg-background border-border flex flex-1 items-end gap-3 rounded-xl border px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
          disabled={isLoading}
          dir="rtl"
          lang="ar"
          className="text-foreground placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-right focus:outline-none disabled:opacity-50"
          rows={1}
          style={{
            minHeight: '24px',
            maxHeight: '200px',
          }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />
      </div>
      {!isLoading && (
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={!input.trim()}
          className="h-12 w-12 rounded-xl px-0 shadow-sm"
        >
          <span className="text-lg">←</span>
        </Button>
      )}
      {isLoading && (
        <Button
          variant="destructive"
          onClick={onStop}
          className="h-12 w-12 rounded-xl px-0 shadow-sm"
        >
          <span className="text-lg">⏹</span>
        </Button>
      )}
    </div>
  );
}
