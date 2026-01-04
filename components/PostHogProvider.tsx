'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// Module-level deduplication (persists across component remounts)
let lastCapturedUrl: string | null = null;

// Initialize PostHog only once on the client side
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  const isDev = process.env.NODE_ENV === 'development';

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll capture pageviews manually for more control
      capture_pageleave: !isDev, // Disable in dev to reduce noise
      
      // Disable aggressive features in development to prevent rate limiting
      autocapture: !isDev, // Disable autocapture in dev (clicks, form submits, etc.)
      disable_scroll_properties: isDev, // Disable scroll tracking in dev
      disable_session_recording: isDev, // Disable session recording in dev (includes heatmaps)
      
      loaded: (posthog) => {
        if (isDev) {
          // Uncomment to debug in development
          // posthog.debug();
        }
      },
    });
  }
}

/**
 * Component that tracks page views on route changes
 * Uses module-level URL deduplication to prevent duplicate captures
 * (persists across component remounts and React Strict Mode)
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname;
      const params = searchParams?.toString();
      if (params) {
        url = url + `?${params}`;
      }
      
      // Only capture if URL has actually changed (module-level deduplication)
      if (url !== lastCapturedUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Capturing pageview:', url);
        }
        lastCapturedUrl = url;
        posthogClient.capture('$pageview', {
          $current_url: url,
        });
      }
    }
    // Note: posthogClient is excluded from deps - it's a stable singleton from the PostHog SDK
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

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

