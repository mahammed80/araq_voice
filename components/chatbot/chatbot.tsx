'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatInput } from '@/components/chatbot/chat-input';
import { ChatMessages } from '@/components/chatbot/chat-messages';
import { ChatSettings } from '@/components/chatbot/chat-settings';
import { ChatSidebar } from '@/components/chatbot/chat-sidebar';
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
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages or streaming content changes
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
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
        // Try to get error details from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            if (errorData.details) {
              console.error('API Error Details:', errorData.details);
            }
          } catch (parseError) {
            console.error('Error parsing JSON error response:', parseError);
            errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
          }
        } else {
          // Response is not JSON (likely HTML error page)
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 200));
          errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
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
    <div className="bg-background flex h-screen w-full" dir="rtl" lang="ar">
      {/* Right Sidebar - Settings (on right in RTL) */}
      <ChatSidebar settings={settings} onSettingsChange={setSettings} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-background/80 backdrop-blur-sm border-b px-6 py-4" dir="rtl" lang="ar">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-bold">محادثة</h1>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mt-4 flex items-center gap-2">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
              <span>🤖</span>
              <span>{settings.model === 'llama-3.1-8b-instant' ? 'Llama 3.1' : settings.model}</span>
            </button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-foreground"
              >
                🗑️ مسح المحادثة
              </Button>
            )}
          </div>
        </header>

        {/* Chat Messages Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
            <div className="mx-auto max-w-4xl">
              <ChatMessages
                messages={messages}
                streamingContent={streamingContent}
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-background/80 backdrop-blur-sm border-t px-6 py-4">
            <div className="mx-auto max-w-4xl">
              {isLoading && (
                <div className="mb-3 flex items-center justify-center gap-2">
                  <button
                    onClick={stopGeneration}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
                  >
                    <span>🔄</span>
                    <span>إيقاف الإجابة</span>
                  </button>
                </div>
              )}
              <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
