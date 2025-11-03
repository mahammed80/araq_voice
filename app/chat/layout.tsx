import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  await getAppConfig(hdrs);

  return <>{children}</>;
}

