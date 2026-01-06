'use client';

import { useState, useEffect } from 'react';
import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { OnboardingWizard } from '@/components/onboarding';
import { useRouter } from 'next/navigation';
import { useOnboardingCompletion } from '@/lib/hooks/useOnboardingCompletion';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';
import { Loader2 } from 'lucide-react';

/**
 * Inner component for authenticated users with route protection
 */
function AuthenticatedOnboardingContent() {
  const router = useRouter();
  const { user: workosUser } = useAuth();
  const { isProcessing, error, onboardingState } = useOnboardingCompletion(workosUser);

  // Query current user to check completion status
  const user = useQuery(api.users.queries.getCurrentUser);

  const handleComplete = () => {
    router.push('/discover');
  };

  const handleBack = () => {
    router.push('/');
  };

  // Show loading while checking status
  if (isProcessing || user === undefined || onboardingState === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Checking your profile...</p>
        </div>
      </div>
    );
  }

  // ROUTE PROTECTION: If user has BOTH profile data AND images, redirect to discover
  // They don't need to go through onboarding again
  if (onboardingState.hasProfileData && onboardingState.hasImages) {
    // Redirect to discover - onboarding is already complete
    router.replace('/discover');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Redirecting to your feed...</p>
        </div>
      </div>
    );
  }

  // Show error state if processing failed
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // User needs to complete onboarding - show the wizard
  return <OnboardingWizard onComplete={handleComplete} onBack={handleBack} />;
}

/**
 * Inner component for unauthenticated users
 */
function UnauthenticatedOnboardingContent() {
  const router = useRouter();

  const handleComplete = () => {
    router.push('/discover');
  };

  const handleBack = () => {
    router.push('/');
  };

  return <OnboardingWizard onComplete={handleComplete} onBack={handleBack} />;
}

/**
 * Inner component that safely uses useAuth (only rendered after mount when AuthKitProvider is available)
 */
function OnboardingContent() {
  return (
    <>
      <Authenticated>
        <AuthenticatedOnboardingContent />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedOnboardingContent />
      </Unauthenticated>
    </>
  );
}

/**
 * Main component that waits for client-side mount before rendering auth-dependent content.
 * This ensures AuthKitProvider is available before useAuth is called.
 */
export default function OnboardingPageClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR and initial hydration (before AuthKitProvider is mounted)
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // After mount, render the content that uses useAuth
  return <OnboardingContent />;
}
