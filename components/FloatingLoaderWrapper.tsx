'use client';

import { FloatingLoaderProvider } from '@/components/discover';

export function FloatingLoaderWrapper({ children }: { children: React.ReactNode }) {
  return <FloatingLoaderProvider>{children}</FloatingLoaderProvider>;
}

