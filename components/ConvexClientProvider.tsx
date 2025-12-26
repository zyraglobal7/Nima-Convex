'use client';

import { ReactNode, useCallback, useState, useEffect } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { AuthKitProvider, useAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { WrappedChecker } from '@/components/wrapped/WrappedChecker';
import { UserDataSync } from '@/components/UserDataSync';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  });

  // Defer AuthKitProvider mounting until after initial render
  // This prevents the "Router action dispatched before initialization" error
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Always use ConvexProviderWithAuth to ensure <Authenticated>/<Unauthenticated> components work
  // During SSR/initial render, provide auth context that shows "loading"
  // After mount, wrap with AuthKitProvider for actual auth
  if (!isMounted) {
    return (
      <ConvexProviderWithAuth client={convex} useAuth={useLoadingAuth}>
        {children}
      </ConvexProviderWithAuth>
    );
  }

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        <UserDataSync />
        <WrappedChecker />
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

// Auth hook that always returns loading state (for SSR/initial render)
// This allows <Authenticated>/<Unauthenticated> components to work
// by showing neither (loading state) until real auth is determined
function useLoadingAuth() {
  return {
    isLoading: true,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

// Actual auth hook using WorkOS AuthKit
function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}): Promise<string | null> => {
      if (!user) {
        return null;
      }

      try {
        if (forceRefreshToken) {
          return (await refresh()) ?? null;
        }

        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
      }
    },
    [user, refresh, getAccessToken],
  );

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}
