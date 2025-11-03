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
    <div className="mx-auto max-w-3xl">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
          disabled={isLoading}
          className="bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary flex-1 resize-none rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none disabled:opacity-50"
          rows={1}
          style={{
            minHeight: '44px',
            maxHeight: '200px',
          }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />
        {isLoading ? (
          <Button variant="primary" onClick={onStop}>
            إيقاف
          </Button>
        ) : (
          <Button variant="primary" onClick={handleSend} disabled={!input.trim()}>
            إرسال
          </Button>
        )}
      </div>
    </div>
  );
}
