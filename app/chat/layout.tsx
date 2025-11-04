import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
