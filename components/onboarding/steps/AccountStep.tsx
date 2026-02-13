'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StepProps, OnboardingFormData } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { trackStepCompleted, trackBackClicked, trackSignupInitiated, trackCompleteProfileClicked, ONBOARDING_STEPS } from '@/lib/analytics';

// Local storage key for onboarding data
const ONBOARDING_STORAGE_KEY = 'nima-onboarding-data';

/**
 * Save onboarding data to localStorage
 * This persists the data across the auth redirect
 */
export function saveOnboardingData(formData: OnboardingFormData): void {
  // We can't store File objects in localStorage, so we exclude photos
  // But we DO store uploadedImages (already uploaded to Convex) and onboardingToken
  const dataToStore = {
    gender: formData.gender,
    age: formData.age,
    stylePreferences: formData.stylePreferences,
    shirtSize: formData.shirtSize,
    waistSize: formData.waistSize,
    height: formData.height,
    heightUnit: formData.heightUnit,
    shoeSize: formData.shoeSize,
    shoeSizeUnit: formData.shoeSizeUnit,
    country: formData.country,
    currency: formData.currency,
    budgetRange: formData.budgetRange,
    email: formData.email,
    // Store the onboarding token to claim uploaded images after auth
    onboardingToken: formData.onboardingToken,
    // Store uploaded image IDs (not the preview URLs - those won't survive the redirect)
    uploadedImageIds: formData.uploadedImages.map((img) => img.imageId),
    savedAt: Date.now(),
  };
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dataToStore));
}

/**
 * Get onboarding data from localStorage
 */
export function getOnboardingData(): Partial<OnboardingFormData> | null {
  const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear onboarding data from localStorage
 */
export function clearOnboardingData(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export function AccountStep({ formData, onNext, onBack }: StepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Save form data whenever it changes
  useEffect(() => {
    saveOnboardingData(formData);
  }, [formData]);

  // Handle completing profile for authenticated users
  const handleCompleteProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      trackCompleteProfileClicked();
      trackStepCompleted(ONBOARDING_STEPS.ACCOUNT, {
        method: 'complete_profile',
      });

      // Save the current form data to localStorage
      saveOnboardingData(formData);

      // Wait a moment to ensure data is saved and hook can process it
      // The useOnboardingCompletion hook will process the data in the background
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Advance to success step
      onNext();
    } catch (err) {
      console.error('Error completing profile:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleContinueToAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      trackSignupInitiated('email');
      trackStepCompleted(ONBOARDING_STEPS.ACCOUNT, {
        method: 'signup',
      });

      // Save the current form data to localStorage
      saveOnboardingData(formData);

      // Redirect directly to WorkOS sign-in (handles both sign-up and sign-in)
      // The callback will read from localStorage and complete onboarding
      window.location.href = '/sign-in';
    } catch (err) {
      console.error('Error redirecting to sign-in:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                trackBackClicked(ONBOARDING_STEPS.ACCOUNT);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
              aria-label="Go back"
              disabled={isLoading}
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">Almost there!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create your account to save your style profile
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Show Complete Profile button for authenticated users */}
          {currentUser ? (
            <Button
              onClick={handleCompleteProfile}
              disabled={isLoading}
              size="lg"
              className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving your profile...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          ) : (
            <>
              {/* Continue to Sign In - redirects to WorkOS which handles both sign-up and sign-in */}
              <Button
                onClick={handleContinueToAuth}
                disabled={isLoading}
                size="lg"
                className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Continue to Sign In'
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{' '}
                <a
                  href="/termsAndConditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacyPolicy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:underline"
                >
                  Privacy Policy
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
