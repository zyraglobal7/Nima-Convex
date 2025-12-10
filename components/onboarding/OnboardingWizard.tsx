'use client';

import { useState, useCallback, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { WelcomeStep } from './steps/WelcomeStep';
import { GenderAgeStep } from './steps/GenderAgeStep';
import { StyleVibeStep } from './steps/StyleVibeStep';
import { SizeFitStep } from './steps/SizeFitStep';
import { LocationBudgetStep } from './steps/LocationBudgetStep';
import { PhotoUploadStep } from './steps/PhotoUploadStep';
import { AccountStep } from './steps/AccountStep';
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

// Get existing token from localStorage or generate new one
function getOrCreateOnboardingToken(): string {
  if (typeof window === 'undefined') {
    return generateOnboardingToken();
  }
  
  const stored = localStorage.getItem('nima-onboarding-token');
  if (stored) {
    return stored;
  }
  
  const newToken = generateOnboardingToken();
  localStorage.setItem('nima-onboarding-token', newToken);
  return newToken;
}

const initialFormData: OnboardingFormData = {
  gender: '',
  age: '',
  stylePreferences: [],
  shirtSize: 'M', // Default to Medium
  waistSize: '32', // Default to 32 inches
  height: '170', // Default to 170cm
  heightUnit: 'cm',
  shoeSize: '40', // Default to EU 40
  shoeSizeUnit: 'EU',
  country: '',
  currency: '',
  budgetRange: 'mid',
  photos: [],
  uploadedImages: [],
  onboardingToken: '', // Will be set on mount
  email: '',
};

export function OnboardingWizard({ onComplete, onBack }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Set onboarding token on mount
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

  const handleBack = useCallback(() => {
    setDirection('back');
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBack();
    }
  }, [currentStep, onBack]);

  const stepProps = {
    formData,
    updateFormData,
    onNext: handleNext,
    onBack: handleBack,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep {...stepProps} />;
      case 1:
        return <GenderAgeStep {...stepProps} />;
      case 2:
        return <StyleVibeStep {...stepProps} />;
      case 3:
        return <SizeFitStep {...stepProps} />;
      case 4:
        return <LocationBudgetStep {...stepProps} />;
      case 5:
        return <PhotoUploadStep {...stepProps} />;
      case 6:
        return <AccountStep {...stepProps} />;
      case 7:
        return <SuccessStep {...stepProps} />;
      default:
        return null;
    }
  };

  // Show progress bar only for steps 1-6 (not welcome or success)
  const showProgressBar = currentStep > 0 && currentStep < TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Theme toggle - always visible in top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Header with progress */}
      {showProgressBar && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 pr-16">
            <ProgressBar currentStep={currentStep - 1} totalSteps={TOTAL_STEPS - 2} />
          </div>
        </header>
      )}

      {/* Step content with animation */}
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
