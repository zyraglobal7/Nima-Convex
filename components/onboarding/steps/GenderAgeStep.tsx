'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepProps, GENDER_OPTIONS, Gender } from '../types';
import { ArrowLeft, Check, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackStepCompleted, trackBackClicked, trackGenderSelected, ONBOARDING_STEPS } from '@/lib/analytics';

export function GenderAgeStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  const isComplete = formData.gender !== '';

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                trackBackClicked(ONBOARDING_STEPS.GENDER_AGE);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Tell me about yourself
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                So I can personalize your experience
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-6">
        <div className="max-w-md mx-auto space-y-8">
          {/* Nima Chat Bubble */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  This helps me recommend styles that suit you best. Fashion is for everyone, 
                  and I want to show you looks you&apos;ll love!
                </p>
              </div>
            </div>
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/80 border-b border-r border-border/50 transform rotate-45" />
          </motion.div>

          {/* Gender Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              How do you identify?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GENDER_OPTIONS.map((option, index) => {
                const isSelected = formData.gender === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => {
                      trackGenderSelected(option.value);
                      updateFormData({ gender: option.value as Gender });
                    }}
                    className={`
                      relative p-4 rounded-xl border-2 text-left
                      transition-all duration-300 ease-out
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-surface hover:border-primary/30 hover:bg-surface-alt'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-medium text-foreground">{option.label}</span>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Age Input (Optional) */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="text-lg">🎂</span>
              How old are you?
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="e.g., 25"
                value={formData.age}
                onChange={(e) => updateFormData({ age: e.target.value })}
                min="13"
                max="100"
                className="h-12 rounded-xl bg-surface border-border hover:border-primary/50 focus:border-primary transition-colors text-lg pl-4 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                years
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              This helps me suggest age-appropriate trends
            </p>
          </motion.div>

          {/* Privacy Note */}
          <motion.div 
            className="bg-surface-alt rounded-xl p-4 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <p>
              🔒 Your information is private and only used to personalize your styling recommendations.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={() => {
              trackStepCompleted(ONBOARDING_STEPS.GENDER_AGE, {
                gender: formData.gender,
                age: formData.age || undefined,
              });
              onNext();
            }}
            disabled={!isComplete}
            size="lg"
            className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] hover:shadow-lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

