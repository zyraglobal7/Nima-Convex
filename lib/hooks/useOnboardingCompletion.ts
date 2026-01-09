'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Type for WorkOS user object passed from component
interface WorkOSUser {
  email?: string | null;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

// Local storage keys
const ONBOARDING_STORAGE_KEY = 'nima-onboarding-data';
const ONBOARDING_TOKEN_KEY = 'nima-onboarding-token';

// Extend expiration to 24 hours (was 1 hour)
const STORAGE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

interface StoredOnboardingData {
  gender: 'male' | 'female' | 'prefer-not-to-say';
  age: string;
  stylePreferences: string[];
  shirtSize: string;
  waistSize: string;
  height: string;
  heightUnit: 'cm' | 'ft';
  shoeSize: string;
  shoeSizeUnit: 'EU' | 'US' | 'UK';
  country: string;
  currency: string;
  budgetRange: 'low' | 'mid' | 'premium';
  email?: string;
  // New fields for image tracking
  onboardingToken?: string;
  uploadedImageIds?: string[];
  savedAt: number;
}

/**
 * Get stored onboarding data from localStorage
 */
function getStoredOnboardingData(): StoredOnboardingData | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored) as StoredOnboardingData;

    // Check if data is too old (24 hours)
    if (Date.now() - data.savedAt > STORAGE_EXPIRATION_MS) {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_TOKEN_KEY);
      return null;
    }

    return data;
  } catch {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_TOKEN_KEY);
    return null;
  }
}

/**
 * Clear stored onboarding data from localStorage
 */
function clearStoredOnboardingData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  localStorage.removeItem(ONBOARDING_TOKEN_KEY);
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 500
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Hook to handle onboarding completion after authentication
 * 
 * This hook uses a SMART completion check:
 * - Instead of just checking `onboardingCompleted` flag, it checks:
 *   1. Whether user has profile data (gender, stylePreferences)
 *   2. Whether user has at least one image linked to their account
 * 
 * If user has BOTH profile data AND images, they are considered "complete"
 * even if the flag wasn't properly set (handles localStorage expiration,
 * different device sign-in, etc.)
 * 
 * @param workosUser - The WorkOS user object from useAuth(), passed from component level
 *                     to avoid calling useAuth inside this hook (which requires AuthKitProvider)
 */
export function useOnboardingCompletion(workosUser?: WorkOSUser | null) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const processingRef = useRef(false);

  // Get current user from Convex
  const user = useQuery(api.users.queries.getCurrentUser);
  
  // Get onboarding state (profile data + images check)
  const onboardingState = useQuery(api.users.queries.getOnboardingState);

  // Mutations
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const markOnboardingComplete = useMutation(api.users.mutations.markOnboardingComplete);
  const claimOnboardingImages = useMutation(api.userImages.mutations.claimOnboardingImages);

  const processOnboarding = useCallback(async () => {
    console.log('[ONBOARDING_COMPLETION] processOnboarding called', {
      processingRef: processingRef.current,
      user: user === undefined ? 'undefined' : user === null ? 'null' : 'exists',
      onboardingState: onboardingState === undefined ? 'undefined' : onboardingState,
    });
    
    // Prevent double processing
    if (processingRef.current) {
      console.log('[ONBOARDING_COMPLETION] Already processing, skipping');
      return;
    }
    
    // Wait for queries to resolve
    if (user === undefined || onboardingState === undefined) {
      console.log('[ONBOARDING_COMPLETION] Queries not resolved yet, waiting');
      return;
    }
    
    // If user is null, try to create/get them
    let currentUser = user;
    
    if (user === null) {
      try {
        const profileData = workosUser ? {
          email: workosUser.email || undefined,
          emailVerified: workosUser.emailVerified || false,
          firstName: workosUser.firstName || undefined,
          lastName: workosUser.lastName || undefined,
          profileImageUrl: workosUser.profilePictureUrl || undefined,
        } : {};

        console.log('[ONBOARDING_COMPLETION] Creating user with profile data');
        const createdUser = await getOrCreateUser(profileData);
        
        if (!createdUser) {
          // Truly not authenticated
          setCompleted(true);
          return;
        }
        currentUser = createdUser;
      } catch (err) {
        console.error('Failed to get or create user:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate');
        setCompleted(true);
        return;
      }
    }

    // At this point, currentUser should exist
    if (!currentUser) {
      setCompleted(true);
      return;
    }

    // SMART COMPLETION CHECK:
    // If user has BOTH profile data AND images, they're done
    // (even if onboardingCompleted flag is false due to localStorage issues)
    if (onboardingState?.hasProfileData && onboardingState?.hasImages) {
      console.log('[ONBOARDING_COMPLETION] User has both profile data and images - marking complete');
      
      // If flag is not set, set it now
      if (!currentUser.onboardingCompleted) {
        try {
          await markOnboardingComplete({});
          console.log('[ONBOARDING_COMPLETION] Flag was false, now marked complete');
        } catch (err) {
          console.error('Failed to mark onboarding complete:', err);
          // Non-fatal - user still has data
        }
      }
      
      clearStoredOnboardingData();
      setCompleted(true);
      return;
    }

    // If already completed (flag is true), just clear localStorage
    if (currentUser.onboardingCompleted) {
      clearStoredOnboardingData();
      setCompleted(true);
      return;
    }

    // Check for stored onboarding data
    const storedData = getStoredOnboardingData();
    console.log('[ONBOARDING_COMPLETION] Stored data from localStorage:', storedData);
    
    if (!storedData) {
      console.log('[ONBOARDING_COMPLETION] No localStorage data found - user needs to complete onboarding through UI');
      setCompleted(true);
      return;
    }

    // Validate stored data has required fields
    const missingFields: string[] = [];
    if (!storedData.gender) missingFields.push('gender');
    if (!storedData.age) missingFields.push('age');
    if (!storedData.stylePreferences) missingFields.push('stylePreferences');
    if (!storedData.shirtSize) missingFields.push('shirtSize');
    if (!storedData.waistSize) missingFields.push('waistSize');
    if (!storedData.height) missingFields.push('height');
    if (!storedData.heightUnit) missingFields.push('heightUnit');
    if (!storedData.shoeSize) missingFields.push('shoeSize');
    if (!storedData.shoeSizeUnit) missingFields.push('shoeSizeUnit');
    if (!storedData.country) missingFields.push('country');
    if (!storedData.currency) missingFields.push('currency');
    if (!storedData.budgetRange) missingFields.push('budgetRange');
    
    if (missingFields.length > 0) {
      console.log('[ONBOARDING_COMPLETION] Stored onboarding data is incomplete. Missing fields:', missingFields);
      console.log('[ONBOARDING_COMPLETION] Stored data values:', {
        gender: storedData.gender,
        age: storedData.age,
        stylePreferences: storedData.stylePreferences,
        shirtSize: storedData.shirtSize,
        waistSize: storedData.waistSize,
        height: storedData.height,
        heightUnit: storedData.heightUnit,
        shoeSize: storedData.shoeSize,
        shoeSizeUnit: storedData.shoeSizeUnit,
        country: storedData.country,
        currency: storedData.currency,
        budgetRange: storedData.budgetRange,
      });
      // Don't clear - let user resume from where they left off
      setCompleted(true);
      return;
    }

    // Start processing
    processingRef.current = true;
    
    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Complete onboarding with stored profile data
      await completeOnboarding({
        gender: storedData.gender,
        age: storedData.age,
        stylePreferences: storedData.stylePreferences,
        shirtSize: storedData.shirtSize,
        waistSize: storedData.waistSize,
        height: storedData.height,
        heightUnit: storedData.heightUnit,
        shoeSize: storedData.shoeSize,
        shoeSizeUnit: storedData.shoeSizeUnit,
        country: storedData.country,
        currency: storedData.currency,
        budgetRange: storedData.budgetRange,
      });

      console.log('[ONBOARDING_COMPLETION] Profile data saved successfully');

      // Step 2: Claim uploaded onboarding images if there's a token
      // Use retry logic to handle transient failures
      if (storedData.onboardingToken) {
        try {
          const claimResult = await retryWithBackoff(
            () => claimOnboardingImages({ onboardingToken: storedData.onboardingToken! }),
            3, // max retries
            500 // initial delay ms
          );
          console.log(`[ONBOARDING_COMPLETION] Claimed ${claimResult.claimedCount} onboarding images`);
        } catch (claimError) {
          // Log but don't fail - images can be uploaded later from profile settings
          console.error('[ONBOARDING_COMPLETION] Failed to claim onboarding images after retries:', claimError);
        }
      }

      // Clear stored data after successful submission
      clearStoredOnboardingData();
      setCompleted(true);

      console.log('[ONBOARDING_COMPLETION] Onboarding completed successfully');
    } catch (err) {
      console.error('[ONBOARDING_COMPLETION] Failed to complete onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [user, onboardingState, workosUser, getOrCreateUser, completeOnboarding, markOnboardingComplete, claimOnboardingImages]);

  useEffect(() => {
    processOnboarding();
  }, [user, onboardingState, processOnboarding]);

  // Compute needsOnboarding based on SMART check:
  // 1. If onboardingCompleted flag is TRUE, trust it (user explicitly completed)
  // 2. Otherwise, use derived checks (profile data + images)
  // This fixes the case where user completed onboarding but some data got cleared
  const needsOnboarding = 
    onboardingState !== undefined && 
    onboardingState.isAuthenticated &&
    onboardingState.hasUser &&
    !onboardingState.onboardingCompleted &&  // ← Trust explicit flag first!
    (!onboardingState.hasProfileData || !onboardingState.hasImages);

  return {
    user,
    isProcessing,
    error,
    completed,
    needsOnboarding,
    // Expose additional state for smarter UI
    onboardingState,
  };
}

/**
 * Check if there's pending onboarding data
 */
export function hasPendingOnboardingData(): boolean {
  return getStoredOnboardingData() !== null;
}

/**
 * Export clear function for use in components
 */
export { clearStoredOnboardingData };
