'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Local storage keys
const ONBOARDING_STORAGE_KEY = 'nima-onboarding-data';
const ONBOARDING_TOKEN_KEY = 'nima-onboarding-token';

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

    // Check if data is too old (more than 1 hour)
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - data.savedAt > oneHour) {
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
 * Hook to handle onboarding completion after authentication
 * 
 * This hook:
 * 1. Checks if there's pending onboarding data in localStorage
 * 2. Gets or creates the user in Convex
 * 3. If onboarding is not complete, submits the stored data
 * 4. Claims any uploaded onboarding images and links them to the user
 * 5. Clears localStorage after successful submission
 */
export function useOnboardingCompletion() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // Get current user
  const user = useQuery(api.users.queries.getCurrentUser);

  // Mutations
  const getOrCreateUser = useMutation(api.users.mutations.getOrCreateUser);
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const claimOnboardingImages = useMutation(api.userImages.mutations.claimOnboardingImages);

  useEffect(() => {
    async function processOnboarding() {
      // Step 0: Ensure user exists in database (creates if missing, returns existing if present)
      // This handles the case where user is authenticated but webhook didn't create the DB record
      let currentUser = user;

      // If user query hasn't resolved yet, wait
      if (user === undefined) return;

      // If user is null, try to create/get them - this distinguishes between
      // "not authenticated" vs "authenticated but no DB record"
      if (user === null) {
        try {
          const createdUser = await getOrCreateUser();
          console.log('[ONBOARDING_COMPLETION] Created user:', JSON.stringify(createdUser, null, 2));
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

      // At this point, currentUser is guaranteed to exist
      if (!currentUser) {
        setCompleted(true);
        return;
      }

      // If onboarding already completed, clear any stored data and return
      if (currentUser.onboardingCompleted) {
        clearStoredOnboardingData();
        setCompleted(true);
        return;
      }

      // Check for stored onboarding data
      const storedData = getStoredOnboardingData();
      if (!storedData) {
        setCompleted(true);
        return;
      }

      // Validate stored data has required fields
      if (
        !storedData.gender ||
        !storedData.age ||
        !storedData.stylePreferences ||
        !storedData.shirtSize ||
        !storedData.waistSize ||
        !storedData.height ||
        !storedData.heightUnit ||
        !storedData.shoeSize ||
        !storedData.shoeSizeUnit ||
        !storedData.country ||
        !storedData.currency ||
        !storedData.budgetRange
      ) {
        console.log('Stored onboarding data is incomplete');
        clearStoredOnboardingData();
        setCompleted(true);
        return;
      }

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

        console.log('Profile data saved successfully');

        // Step 2: Claim uploaded onboarding images if there's a token
        if (storedData.onboardingToken) {
          try {
            const claimResult = await claimOnboardingImages({
              onboardingToken: storedData.onboardingToken,
            });
            console.log(`Claimed ${claimResult.claimedCount} onboarding images`);
          } catch (claimError) {
            // Log but don't fail the whole onboarding if image claiming fails
            console.error('Failed to claim onboarding images:', claimError);
            // Images can be re-uploaded later from settings
          }
        }

        // Clear stored data after successful submission
        clearStoredOnboardingData();
        setCompleted(true);

        console.log('Onboarding completed successfully');
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      } finally {
        setIsProcessing(false);
      }
    }

    processOnboarding();
  }, [user, getOrCreateUser, completeOnboarding, claimOnboardingImages]);

  return {
    user,
    isProcessing,
    error,
    completed,
    needsOnboarding: user !== null && user !== undefined && !user.onboardingCompleted,
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
