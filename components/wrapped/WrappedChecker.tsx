'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/convex/_generated/api';

/**
 * WrappedChecker - Auto-redirects users to their wrapped experience
 * 
 * This component checks if the user has an unseen wrapped experience available.
 * If so, it redirects them to the wrapped page. Once they've viewed it,
 * they won't be redirected again.
 * 
 * Place this component in the main app layout or ConvexClientProvider.
 */
export function WrappedChecker() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Get current year for wrapped check
  const currentYear = new Date().getFullYear();

  // Check if wrapped is available and should be shown
  const wrappedStatus = useQuery(api.wrapped.queries.isWrappedAvailable, {
    year: currentYear,
  });

  useEffect(() => {
    // Don't run if:
    // - Already on a wrapped page
    // - Already redirected in this session
    // - On onboarding pages
    // - On auth pages
    // - Query hasn't loaded yet
    if (
      hasRedirected ||
      pathname?.startsWith('/wrapped') ||
      pathname?.startsWith('/onboarding') ||
      pathname?.startsWith('/auth') ||
      pathname?.startsWith('/admin') ||
      pathname === '/' ||
      wrappedStatus === undefined
    ) {
      return;
    }

    // If wrapped should be shown (active, has data, not viewed)
    if (wrappedStatus.shouldShow) {
      console.log('[WrappedChecker] Redirecting to wrapped experience...');
      setHasRedirected(true);
      router.push(`/wrapped/${currentYear}`);
    }
  }, [wrappedStatus, pathname, hasRedirected, router, currentYear]);

  // This component renders nothing - it's purely for side effects
  return null;
}
