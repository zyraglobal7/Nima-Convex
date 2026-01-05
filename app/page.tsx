'use client';

import { useState, useEffect } from 'react';
import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { GateSplash, OnboardingWizard } from '@/components/onboarding';
import { useOnboardingCompletion } from '@/lib/hooks/useOnboardingCompletion';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';
import { Loader2 } from 'lucide-react';

type View = 'gate' | 'onboarding' | 'app';


function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMobile, setIsMobile] = useState(false) // Added this state
 
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isApple = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    setIsIOS(isApple);
    setIsMobile(isApple || isAndroid); // Detects any mobile device
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, [])
 
  // 1. Don't show if already installed
  // 2. Don't show if we're on a Desktop (unless you want a desktop button too)
  if (isStandalone || !isIOS || !isMobile) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 w-[min(96%,560px)] bg-surface border border-border rounded-xl p-3 shadow-md flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">N</div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Install App</h3>
      
            <p className="mt-1 text-xs text-muted-foreground">Tap the share button and choose <strong>Add to Home Screen</strong>.</p>
          
        </div>
      </div>

    
    </div>
  )
}
 


export default function Home() {
  const [view, setView] = useState<View>('gate');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleGetStarted = () => {
    setView('onboarding');
  };

  const handleBackToGate = () => {
    setView('gate');
  };

  const handleOnboardingComplete = () => {
    // This will redirect to auth via the AccountStep
    // After auth, the user will be redirected back and
    // the AuthenticatedContent component will handle the rest
    setView('app');
  };

  // Show loading during SSR/initial hydration before AuthKitProvider is mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        {view === 'gate' && <GateSplash onGetStarted={handleGetStarted} />}
        {view === 'onboarding' && (
          <OnboardingWizard onComplete={handleOnboardingComplete} onBack={handleBackToGate} />
        )}
        {view === 'app' && <OnboardingCompletePlaceholder />}
      </Unauthenticated>
          <InstallPrompt />
    </>
  );
}

/**
 * Content shown to authenticated users
 * Handles onboarding completion and redirects to main feed
 */
function AuthenticatedContent() {
  // Get WorkOS user and pass to hook (useAuth is safe here since we're after mount check)
  const { user: workosUser } = useAuth();
  const { user, isProcessing, error, needsOnboarding } = useOnboardingCompletion(workosUser);

  // Show loading while processing onboarding
  if (isProcessing || user === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Show error if onboarding failed
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

  // If user needs onboarding (signed up but didn't complete onboarding flow)
  if (needsOnboarding) {
    return <NeedsOnboardingPrompt />;
  }

  // Main feed for authenticated users with completed onboarding
  return <MainFeedPlaceholder />;
}

/**
 * Prompt shown when user is authenticated but hasn't completed onboarding
 */
function NeedsOnboardingPrompt() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <span className="text-3xl">👋</span>
        </div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">
          Welcome to Nima!
        </h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your style profile so I can show you outfits you&apos;ll love.
        </p>
        <a
          href="/onboarding"
          onClick={() => {
            // Clear any stale data and reload to start fresh onboarding
            localStorage.removeItem('nima-onboarding-data');
          }}
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
        >
          Complete Your Profile
        </a>
      </div>
    </div>
  );
}

/**
 * Placeholder for the main feed (to be implemented)
 */
function MainFeedPlaceholder() {
  const user = useQuery(api.users.queries.getCurrentUser);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Your personalized feed is coming soon. Check back later!
        </p>

        {/* Profile Summary */}
        {user && (
          <div className="bg-surface rounded-xl p-4 text-left space-y-2 text-sm">
            <p className="font-medium text-foreground">Your Profile</p>
            {user.stylePreferences.length > 0 && (
              <p className="text-muted-foreground">
                Style: {user.stylePreferences.slice(0, 3).join(', ')}
              </p>
            )}
            {user.budgetRange && (
              <p className="text-muted-foreground">
                Budget:{' '}
                {user.budgetRange === 'low'
                  ? 'Smart Saver'
                  : user.budgetRange === 'mid'
                    ? 'Best of Both'
                    : 'Treat Yourself'}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <a
            href="/discover"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
          >
            Explore Looks
          </a>
          <a
            href="/sign-out"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder after completing onboarding - redirects to sign-up
 */
function OnboardingCompletePlaceholder() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-3xl font-serif font-semibold text-foreground">You&apos;re all set!</h1>
        <p className="text-muted-foreground">
          Your style profile has been created. The main feed experience is coming soon!
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/sign-up"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
          >
            Complete Sign Up
          </a>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
