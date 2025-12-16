'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StepProps, OnboardingFormData } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

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

export function AccountStep({ formData, updateFormData, onNext, onBack }: StepProps) {
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

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Save the current form data to localStorage
      saveOnboardingData(formData);

      // Redirect to WorkOS sign-up
      // The callback will read from localStorage and complete onboarding
      window.location.href = '/sign-up';
    } catch (err) {
      console.error('Error redirecting to sign-up:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Save the current form data to localStorage
      saveOnboardingData(formData);

      // Redirect to WorkOS sign-in
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
              onClick={onBack}
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
              {/* Sign Up with Google */}
              <Button
                onClick={handleSignUp}
                disabled={isLoading}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-medium rounded-xl bg-surface border-border hover:bg-surface-alt hover:border-primary/30 transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Email Sign Up */}
              <Button
                onClick={handleSignUp}
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
                  'Sign Up with Email'
                )}
              </Button>

              {/* Already have account */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={handleSignIn}
                    disabled={isLoading}
                    className="text-secondary hover:underline font-medium disabled:opacity-50"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{' '}
                <a href="#" className="text-secondary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-secondary hover:underline">
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
