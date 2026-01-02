'use client';

import { useState, useEffect } from 'react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { OnboardingWizard } from '@/components/onboarding';
import { useRouter } from 'next/navigation';
import { useOnboardingCompletion } from '@/lib/hooks/useOnboardingCompletion';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { Loader2 } from 'lucide-react';

/**
 * Inner component that safely uses useAuth (only rendered after mount when AuthKitProvider is available)
 */
function OnboardingContent() {
  const router = useRouter();
  
  // Now safe to call useAuth since we're only rendered after AuthKitProvider is mounted
  const { user: workosUser } = useAuth();
  
  // Pass the WorkOS user to the hook
  const { isProcessing, error } = useOnboardingCompletion(workosUser);

  const handleComplete = () => {
    // Redirect authenticated users to discover, unauthenticated will be handled by AccountStep
    router.push('/discover');
  };

  const handleBack = () => {
    router.push('/');
  };

  // Show loading state while hook is processing onboarding data
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Saving your profile...</p>
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

  return (
    <>
      <Authenticated>
        <OnboardingWizard onComplete={handleComplete} onBack={handleBack} />
      </Authenticated>
      <Unauthenticated>
        <OnboardingWizard onComplete={handleComplete} onBack={handleBack} />
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
