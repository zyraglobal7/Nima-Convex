'use client';

import { SelectionProvider } from '@/lib/contexts/SelectionContext';

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SelectionProvider>{children}</SelectionProvider>;
}



