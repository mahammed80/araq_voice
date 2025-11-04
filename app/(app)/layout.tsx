import { headers } from 'next/headers';
import Link from 'next/link';
import { getAppConfig } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const hdrs = await headers();
  await getAppConfig(hdrs);

  return (
    <>
      <header className="fixed top-0 left-0 z-50 hidden w-full flex-row items-center justify-between p-6 md:flex">
        <Link href="/" className="scale-100 transition-transform duration-300 hover:scale-105">
          <span className="text-foreground font-mono text-lg font-bold tracking-wider">AraQ</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/chat"
            className="text-foreground hover:text-primary font-mono text-sm font-medium tracking-wider transition-colors"
          >
            Chat
          </Link>
          <span className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
            Built with AraQ
          </span>
        </div>
      </header>

      {children}
    </>
  );
}
