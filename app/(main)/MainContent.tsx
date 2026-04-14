'use client';

import { usePathname } from 'next/navigation';

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Engine page is self-contained (h-dvh overflow-hidden) and must not have
  // the bottom padding that would push total height beyond the viewport.
  const noBottomPad = pathname === '/engine';
  return (
    <div className={noBottomPad ? '' : 'pb-20 md:pb-0'}>
      {children}
    </div>
  );
}
