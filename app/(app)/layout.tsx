import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const hdrs = await headers();
  await getAppConfig(hdrs);

  return (
    <>
      <header className="fixed top-0 left-0 z-50 hidden w-full flex-row justify-between p-6 md:flex">
        <div className="scale-100 transition-transform duration-300">
          <span className="text-foreground font-mono text-lg font-bold tracking-wider">AraQ</span>
        </div>
        <span className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
          Built with AraQ
        </span>
      </header>

      {children}
    </>
  );
}
