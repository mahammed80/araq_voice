'use client';

import Link from 'next/link';
import { ChatSettings } from './chat-settings';
import type { ChatSettings as ChatSettingsType } from './chatbot';

interface ChatSidebarProps {
  settings: ChatSettingsType;
  onSettingsChange: (settings: ChatSettingsType) => void;
}

export function ChatSidebar({ settings, onSettingsChange }: ChatSidebarProps) {
  return (
    <div className="bg-sidebar border-sidebar-border flex h-screen w-80 flex-col border-l" dir="rtl" lang="ar">
      {/* Branding */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
          <span className="text-primary-foreground font-mono text-lg font-bold">AQ</span>
        </div>
        <span className="text-sidebar-foreground font-mono text-lg font-bold">AraQ</span>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <h2 className="text-sidebar-foreground mb-6 text-xl font-semibold text-right">الإعدادات</h2>
          <ChatSettings settings={settings} onSettingsChange={onSettingsChange} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-sidebar-border border-t px-6 py-4">
        <Link
          href="/"
          className="text-sidebar-foreground hover:text-sidebar-primary text-sm font-medium transition-colors text-right"
        >
          العودة للرئيسية →
        </Link>
      </div>
    </div>
  );
}

