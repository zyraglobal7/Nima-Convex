'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StepProps } from '../types';
import { Sparkles, Check } from 'lucide-react';
import { trackOnboardingCompleted, trackStartExploringClicked } from '@/lib/analytics';

export function SuccessStep({ formData }: StepProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Track onboarding completion
    trackOnboardingCompleted({
      gender: formData.gender || undefined,
      age: formData.age || undefined,
      style_count: formData.stylePreferences.length,
      country: formData.country || undefined,
      budget_range: formData.budgetRange || undefined,
      photo_count: formData.uploadedImages?.length || formData.photos?.length || 0,
    });

    // Staggered animation
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowDetails(true), 800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [formData]);

  const handleStartExploring = () => {
    trackStartExploringClicked();
    // Redirect to discover page
    router.push('/discover');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Celebration background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md text-center space-y-8">
        {/* Success icon */}
        <div
          className={`
            mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary 
            flex items-center justify-center
            transition-all duration-700 ease-out
            ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        >
          <Sparkles className="w-12 h-12 text-white" />
        </div>

        {/* Heading */}
        <div
          className={`
            space-y-3 transition-all duration-700 ease-out delay-200
            ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <h1 className="text-4xl font-serif font-semibold text-foreground">
            You&apos;re in!
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to the club.
          </p>
        </div>

        {/* Profile summary */}
        <div
          className={`
            bg-surface rounded-2xl p-6 text-left space-y-4
            transition-all duration-700 ease-out delay-500
            ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Your style profile is ready
          </p>
          <div className="space-y-3 text-sm">
            {formData.stylePreferences.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Style:</span>
                <span className="text-foreground">
                  {formData.stylePreferences.slice(0, 3).join(', ')}
                  {formData.stylePreferences.length > 3 && ` +${formData.stylePreferences.length - 3} more`}
                </span>
              </div>
            )}
            {formData.shirtSize && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Size:</span>
                <span className="text-foreground">
                  {formData.shirtSize} top, {formData.waistSize} waist
                </span>
              </div>
            )}
            {formData.country && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Location:</span>
                <span className="text-foreground">{formData.country}</span>
              </div>
            )}
            {formData.photos.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Photos:</span>
                <span className="text-foreground">{formData.photos.length} uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* What's next */}
        <div
          className={`
            text-sm text-muted-foreground
            transition-all duration-700 ease-out delay-700
            ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <p>I&apos;m already curating outfits just for you...</p>
        </div>

        {/* CTA */}
        <div
          className={`
            transition-all duration-700 ease-out delay-1000
            ${showDetails ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <Button
            onClick={handleStartExploring}
            size="lg"
            className="w-full max-w-xs h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Start Exploring
          </Button>
        </div>
      </div>
    </div>
  );
}

