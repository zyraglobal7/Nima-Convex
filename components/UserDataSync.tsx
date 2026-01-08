'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';

// Module-level state - survives component remounts (e.g., when ConvexClientProvider remounts)
// This is the key fix for preventing duplicate syncs after the provider remount
let hasSyncedForUser: string | null = null;
let isSyncing = false;

/**
 * Component to sync user profile data from WorkOS to Convex.
 * 
 * This addresses the issue where WorkOS JWT tokens don't include
 * user profile data (email, name, picture). The WorkOS user object
 * available on the client via useAuth() has this data, so we sync
 * it to Convex when users log in.
 * 
 * This component should be rendered inside AuthKitProvider.
 * 
 * NOTE: Uses module-level state instead of refs to survive component remounts
 * that occur when ConvexClientProvider switches from SSR to client mode.
 */
export function UserDataSync() {
  const { user: workosUser, loading } = useAuth();
  const convexUser = useQuery(api.users.queries.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);

  useEffect(() => {
    async function syncUserData() {
      // Don't run while loading
      if (loading) return;
      
      // Only sync if we have a WorkOS user (authenticated)
      if (!workosUser) {
        // Reset module-level state when user logs out
        hasSyncedForUser = null;
        return;
      }

      // Skip if already synced for this user or currently syncing
      if (hasSyncedForUser === workosUser.id || isSyncing) {
        return;
      }

      // If Convex user exists and has all profile data, no need to sync
      if (convexUser !== undefined) {
        const hasAllData = convexUser !== null && 
          convexUser.email && 
          convexUser.firstName;
        
        if (hasAllData) {
          hasSyncedForUser = workosUser.id;
          return;
        }
      }

      // Wait for Convex user query to resolve
      if (convexUser === undefined) {
        return;
      }

      // Lock to prevent concurrent syncs
      isSyncing = true;

      // Sync user data to Convex
      try {
        console.log('[USER_DATA_SYNC] Syncing WorkOS user data to Convex:', {
          id: workosUser.id,
          email: workosUser.email,
          firstName: workosUser.firstName,
          lastName: workosUser.lastName,
          hasProfilePicture: !!workosUser.profilePictureUrl,
        });

        await getOrCreateUser({
          email: workosUser.email || undefined,
          emailVerified: workosUser.emailVerified || false,
          firstName: workosUser.firstName || undefined,
          lastName: workosUser.lastName || undefined,
          profileImageUrl: workosUser.profilePictureUrl || undefined,
        });

        hasSyncedForUser = workosUser.id;
        console.log('[USER_DATA_SYNC] Successfully synced user data');
      } catch (err) {
        console.error('[USER_DATA_SYNC] Failed to sync user data:', err);
        // Don't mark as synced so we can retry
      } finally {
        isSyncing = false;
      }
    }

    syncUserData();
  }, [workosUser, loading, convexUser, getOrCreateUser]);

  // This component doesn't render anything
  return null;
}



