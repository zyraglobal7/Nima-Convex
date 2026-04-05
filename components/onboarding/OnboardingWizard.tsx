'use client';

import { useState, useCallback, useEffect } from 'react';
import { PhotoUploadStep } from './steps/PhotoUploadStep';
import { StyleChatStep } from './steps/StyleChatStep';
import { LoadingStep } from './steps/LoadingStep';
import { SuccessStep } from './steps/SuccessStep';
import { OnboardingFormData, TOTAL_STEPS } from './types';
import { ThemeToggle } from '@/components/theme-toggle';

interface OnboardingWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

// Generate onboarding token for tracking uploads
function generateOnboardingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `onb_${result}`;
}

function getOrCreateOnboardingToken(): string {
  if (typeof window === 'undefined') {
    return generateOnboardingToken();
  }
  const stored = localStorage.getItem('nima-onboarding-token');
  if (stored) return stored;
  const newToken = generateOnboardingToken();
  localStorage.setItem('nima-onboarding-token', newToken);
  return newToken;
}

const initialFormData: OnboardingFormData = {
  gender: '',
  age: '',
  stylePreferences: [],
  occasions: [],
  shirtSize: 'M',
  waistSize: '32',
  height: '170',
  heightUnit: 'cm',
  shoeSize: '40',
  shoeSizeUnit: 'EU',
  country: 'KE',
  currency: 'KES',
  budgetRange: 'mid',
  photos: [],
  uploadedImages: [],
  onboardingToken: '',
  email: '',
};

export function OnboardingWizard({ onComplete, onBack: _onBack }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    const token = getOrCreateOnboardingToken();
    setFormData((prev) => ({ ...prev, onboardingToken: token }));
  }, []);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleNext = useCallback(() => {
    setDirection('forward');
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const stepProps = {
    formData,
    updateFormData,
    onNext: handleNext,
    onBack: undefined,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <PhotoUploadStep {...stepProps} />;
      case 1:
        return <StyleChatStep {...stepProps} />;
      case 2:
        return <LoadingStep {...stepProps} />;
      case 3:
        return <SuccessStep {...stepProps} />;
      default:
        return null;
    }
  };

  // No progress bar on loading/success steps
  const showProgressBar = currentStep < 2;

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Step indicator (dots) for photo + chat steps */}
      {showProgressBar && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 py-3 pr-16 flex justify-center gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        <div
          key={currentStep}
          className={`
            flex-1 flex flex-col
            animate-in duration-500 ease-out fill-mode-both
            ${direction === 'forward' ? 'fade-in slide-in-from-right-8' : 'fade-in slide-in-from-left-8'}
          `}
        >
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
