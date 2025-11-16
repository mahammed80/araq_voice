'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatInput } from '@/components/chatbot/chat-input';
import { ChatMessages } from '@/components/chatbot/chat-messages';
import { ChatSettings } from '@/components/chatbot/chat-settings';
import { ChatSidebar } from '@/components/chatbot/chat-sidebar';
import { WhatsAppSettings } from '@/components/chatbot/whatsapp-settings';
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
  const [whatsappSettingsOpen, setWhatsappSettingsOpen] = useState(false);
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWhatsappSettingsOpen(true)}
              className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
              title="إعدادات واتساب"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-5"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </Button>
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

      {/* WhatsApp Settings Modal */}
      <WhatsAppSettings
        isOpen={whatsappSettingsOpen}
        onClose={() => setWhatsappSettingsOpen(false)}
      />
    </div>
  );
}
