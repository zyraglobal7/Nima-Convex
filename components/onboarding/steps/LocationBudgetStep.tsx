'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepProps, COUNTRIES, BUDGET_OPTIONS, BudgetRange } from '../types';
import { ArrowLeft, Check, MapPin, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function LocationBudgetStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  const isComplete = formData.country && formData.budgetRange;

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      updateFormData({
        country: country.code,
        currency: country.currency,
      });
    }
  };

  // Get selected country for display
  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country);

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
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Where are you based?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                And what&apos;s your shopping style?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-8">
          {/* Nima Chat Bubble */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative"
          >
            <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  This helps me show you prices in your currency and find pieces 
                  within your budget — no surprises at checkout!
                </p>
              </div>
            </div>
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/80 border-b border-r border-border/50 transform rotate-45" />
          </motion.div>

          {/* Location */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Your Country
            </label>
            <Select value={formData.country} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-full h-14 rounded-xl bg-surface border-border hover:border-primary/50 transition-colors text-left">
                <SelectValue placeholder="Select your country">
                  {selectedCountry && (
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{selectedCountry.emoji}</span>
                      <span className="font-medium">{selectedCountry.name}</span>
                      <span className="text-muted-foreground text-sm">
                        ({selectedCountry.phoneCode})
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {COUNTRIES.map((country) => (
                  <SelectItem 
                    key={country.code} 
                    value={country.code} 
                    className="rounded-lg py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{country.emoji}</span>
                      <span className="font-medium">{country.name}</span>
                      <span className="text-muted-foreground text-sm">
                        ({country.phoneCode})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.currency && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span>💵</span> Prices will be shown in {formData.currency}
              </p>
            )}
          </motion.div>

          {/* Budget Range */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="text-lg">💰</span>
              Budget Range
            </label>
            <div className="grid gap-3">
              {BUDGET_OPTIONS.map((option, index) => {
                const isSelected = formData.budgetRange === option.value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    onClick={() => updateFormData({ budgetRange: option.value as BudgetRange })}
                    className={`
                      relative w-full p-4 rounded-xl border-2 text-left
                      transition-all duration-300 ease-out
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-surface hover:border-primary/30 hover:bg-surface-alt'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <p className="font-medium text-foreground">{option.label}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                          <p className="text-xs text-secondary font-medium mt-1">
                            {option.range}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center
                          transition-all duration-300
                          ${isSelected
                            ? 'border-primary bg-primary'
                            : 'border-border'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Note */}
          <motion.div 
            className="bg-surface-alt rounded-xl p-4 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7 }}
          >
            <p>
              🔄 Don&apos;t stress — you can always change this later. I&apos;ll mix in options 
              from all ranges when it makes sense. 
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={onNext}
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
