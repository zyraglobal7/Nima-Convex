'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';

/**
 * Component to sync user profile data from WorkOS to Convex.
 * 
 * This addresses the issue where WorkOS JWT tokens don't include
 * user profile data (email, name, picture). The WorkOS user object
 * available on the client via useAuth() has this data, so we sync
 * it to Convex when users log in.
 * 
 * This component should be rendered inside AuthKitProvider.
 */
export function UserDataSync() {
  const { user: workosUser, loading } = useAuth();
  const convexUser = useQuery(api.users.queries.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);
  
  // Track if we've already synced to avoid duplicate calls
  const hasSynced = useRef(false);
  const lastWorkosUserId = useRef<string | null>(null);

  useEffect(() => {
    async function syncUserData() {
      // Don't run while loading
      if (loading) return;
      
      // Only sync if we have a WorkOS user (authenticated)
      if (!workosUser) {
        hasSynced.current = false;
        lastWorkosUserId.current = null;
        return;
      }

      // Reset sync flag if user changed
      if (lastWorkosUserId.current !== workosUser.id) {
        hasSynced.current = false;
        lastWorkosUserId.current = workosUser.id;
      }

      // Skip if already synced for this user
      if (hasSynced.current) return;

      // If Convex user exists and has all profile data, no need to sync
      if (convexUser !== undefined) {
        const hasAllData = convexUser !== null && 
          convexUser.email && 
          convexUser.firstName;
        
        if (hasAllData) {
          hasSynced.current = true;
          return;
        }
      }

      // Wait for Convex user query to resolve
      if (convexUser === undefined) return;

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

        hasSynced.current = true;
        console.log('[USER_DATA_SYNC] Successfully synced user data');
      } catch (err) {
        console.error('[USER_DATA_SYNC] Failed to sync user data:', err);
        // Don't set hasSynced to true so we can retry
      }
    }

    syncUserData();
  }, [workosUser, loading, convexUser, getOrCreateUser]);

  // This component doesn't render anything
  return null;
}



