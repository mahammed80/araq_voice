'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChatInput } from '@/components/chatbot/chat-input';
import { ChatMessages } from '@/components/chatbot/chat-messages';
import { ChatSettings } from '@/components/chatbot/chat-settings';
import { Button } from '@/components/livekit/button';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSettings {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  model: string;
  useRAGData: boolean;
}

const DEFAULT_SETTINGS: ChatSettings = {
  systemPrompt: '', // Will use default Arabic prompt from API
  temperature: 1,
  maxTokens: 1024,
  topP: 1,
  model: 'llama-3.1-8b-instant',
  useRAGData: true,
};

export function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    // Add placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      },
    ]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          model: settings.model,
          temperature: settings.temperature,
          max_completion_tokens: settings.maxTokens,
          top_p: settings.topP,
          system_prompt: settings.systemPrompt || undefined,
          use_rag_data: settings.useRAGData,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);

                // Update the assistant message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                );
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }

      setStreamingContent('');
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        // Remove the empty assistant message if aborted
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId || msg.content.trim() !== '')
        );
      } else {
        console.error('Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: `Error: ${errorMessage}` } : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent('');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="bg-background border-b px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-primary text-foreground font-mono text-sm font-medium tracking-wider transition-colors"
            >
              ← Home
            </Link>
            <h1 className="text-xl font-semibold">محادثة مع مساعد AI</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? 'إخفاء' : 'إظهار'} الإعدادات
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                مسح المحادثة
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ChatMessages
              messages={messages}
              streamingContent={streamingContent}
              isLoading={isLoading}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-background border-t px-4 py-4">
            <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} />
          </div>
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setShowSettings(false)}
            />
            {/* Settings Panel */}
            <div className="bg-background fixed top-0 right-0 z-50 h-full w-80 overflow-y-auto border-l shadow-xl transition-transform duration-300 ease-out">
              <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 shadow-sm">
                <h2 className="text-lg font-semibold">الإعدادات</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  ✕
                </Button>
              </div>
              <div className="p-4">
                <ChatSettings settings={settings} onSettingsChange={setSettings} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
