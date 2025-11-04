'use client';

import { useState } from 'react';
import { Button } from '@/components/livekit/button';
import { ChatSettings as ChatSettingsType } from './chatbot';
import { RAGDataManager } from './rag-data-manager';

interface ChatSettingsProps {
  settings: ChatSettingsType;
  onSettingsChange: (settings: ChatSettingsType) => void;
}

const MODELS = [
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
];

export function ChatSettings({ settings, onSettingsChange }: ChatSettingsProps) {
  const [activeTab, setActiveTab] = useState<'rag' | 'model'>('rag');

  const updateSetting = <K extends keyof ChatSettingsType>(key: K, value: ChatSettingsType[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4" dir="rtl" lang="ar">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('rag')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rag'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          بيانات الشركة
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'model'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          إعدادات النموذج
        </button>
      </div>

      {/* RAG Data Tab */}
      {activeTab === 'rag' && (
        <div className="space-y-4">
          <div className="bg-primary/10 border-primary/20 rounded-lg border p-3">
            <div className="mb-2 flex items-start gap-2">
              <input
                type="checkbox"
                id="use-rag"
                checked={settings.useRAGData}
                onChange={(e) => updateSetting('useRAGData', e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="use-rag" className="cursor-pointer text-sm font-medium">
                استخدام بيانات الشركة في الإجابات
              </label>
            </div>
            <p className="text-muted-foreground mr-6 text-xs">
              سيستخدم المساعد البيانات التي تضيفها للإجابة على أسئلة العملاء بالعربية
            </p>
          </div>
          <RAGDataManager />
        </div>
      )}

      {/* Model Settings Tab */}
      {activeTab === 'model' && (
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground mb-4 text-sm">
              المساعد سيجيب دائماً بالعربية كلغة دعم عملاء سعودية
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="mb-2 block text-sm font-medium">
              Model
            </label>
            <select
              id="model"
              value={settings.model}
              onChange={(e) => updateSetting('model', e.target.value)}
              className="bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
            >
              {MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt - Hidden/Read-only as it's always Arabic */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground mb-2 text-xs">
              <strong>ملاحظة:</strong> المساعد مُعد للرد دائماً بالعربية كلغة دعم عملاء سعودية. لا
              حاجة لتعديل هذا الإعداد.
            </p>
            {settings.systemPrompt && (
              <div className="text-muted-foreground text-xs">
                <strong>System Prompt الحالي:</strong>
                <pre className="bg-background mt-1 max-h-32 overflow-auto rounded p-2 text-xs">
                  {settings.systemPrompt}
                </pre>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div>
            <label htmlFor="temperature" className="mb-2 block text-sm font-medium">
              Temperature: {settings.temperature}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-muted-foreground mt-1 flex justify-between text-xs">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Controls randomness. Lower values make responses more focused and deterministic.
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label htmlFor="max-tokens" className="mb-2 block text-sm font-medium">
              Max Completion Tokens: {settings.maxTokens}
            </label>
            <input
              id="max-tokens"
              type="range"
              min="1"
              max="4096"
              step="128"
              value={settings.maxTokens}
              onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value, 10))}
              className="w-full"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Maximum number of tokens in the response
            </p>
          </div>

          {/* Top P */}
          <div>
            <label htmlFor="top-p" className="mb-2 block text-sm font-medium">
              Top P: {settings.topP}
            </label>
            <input
              id="top-p"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.topP}
              onChange={(e) => updateSetting('topP', parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Nucleus sampling: considers tokens with top_p probability mass
            </p>
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onSettingsChange({
                ...settings,
                systemPrompt: '',
                temperature: 1,
                maxTokens: 1024,
                topP: 1,
                model: 'llama-3.1-8b-instant',
              })
            }
            className="w-full"
          >
            إعادة تعيين الإعدادات
          </Button>
        </div>
      )}
    </div>
  );
}
