'use client';

import { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { StepProps } from '../types';

const THOUGHTS = [
  'Cooking up your looks...',
  'Sautéing the vibes...',
  'Seasoning with style...',
  'Plating the outfits...',
  'Taste-testing the fits...',
  'Adding a pinch of flair...',
  'Almost ready to serve...',
];

export function LoadingStep({ formData, onNext }: StepProps) {
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const startedRef = useRef(false);

  const claimImages = useMutation(api.userImages.mutations.claimOnboardingImages);
  const startWorkflow = useMutation(api.workflows.index.startOnboardingWorkflow);
  const workflowStatus = useQuery(api.workflows.index.getOnboardingWorkflowStatus);

  // Rotate thought text every 2.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % THOUGHTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Claim images then start the workflow — runs once on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      // Step 1: Claim onboarding images so they're linked to the authenticated user
      if (formData.onboardingToken) {
        try {
          const claimed = await claimImages({ onboardingToken: formData.onboardingToken });
          console.log(`[LOADING_STEP] Claimed ${claimed.claimedCount} onboarding images`);
        } catch (err) {
          console.warn('[LOADING_STEP] claimOnboardingImages failed (non-fatal):', err);
        }
      }

      // Step 2: Start the look generation workflow
      try {
        const result = await startWorkflow({});
        if (!result.success) {
          console.warn('[LOADING_STEP] startOnboardingWorkflow:', result.error);
        }
      } catch (err) {
        console.warn('[LOADING_STEP] startOnboardingWorkflow failed (non-fatal):', err);
      }

      setHasStarted(true);
    };

    run();
  }, [claimImages, startWorkflow, formData.onboardingToken]);

  // Advance when looks are done
  useEffect(() => {
    if (!hasStarted) return;
    if (!workflowStatus) return;

    if (workflowStatus.isComplete && workflowStatus.completedCount > 0) {
      const timeout = setTimeout(() => onNext(), 800);
      return () => clearTimeout(timeout);
    }
  }, [workflowStatus, hasStarted, onNext]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 min-h-screen">
      <div className="flex flex-col items-center text-center space-y-8 max-w-xs">
        {/* Circular loader wrapping the mascot */}
        <div className="relative w-32 h-32">
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: '2.5s' }}
            viewBox="0 0 128 128"
            fill="none"
          >
            <circle cx="64" cy="64" r="58" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="64"
              cy="64"
              r="58"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="91 273"
              strokeDashoffset="0"
            />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nima-mascott.png"
            alt="Nima"
            className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] object-contain"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            Creating Your Looks...
          </h1>
          <p
            key={thoughtIndex}
            className="text-sm text-muted-foreground animate-in fade-in duration-500"
          >
            {THOUGHTS[thoughtIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
