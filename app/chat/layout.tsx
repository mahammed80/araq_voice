import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="ar">
      {children}
    </div>
  );
}
