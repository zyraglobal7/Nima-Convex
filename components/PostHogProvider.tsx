'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// Initialize PostHog only once on the client side
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll capture pageviews manually for more control
      capture_pageleave: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          // Uncomment to debug in development
          // posthog.debug();
        }
      },
    });
  }
}

/**
 * Component that tracks page views on route changes
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthogClient.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, posthogClient]);

  return null;
}

/**
 * PostHog Provider component that wraps the application
 * Handles initialization and automatic pageview tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Check if PostHog key is configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // Return children without PostHog wrapper if not configured
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// Re-export posthog for direct usage
export { posthog };

