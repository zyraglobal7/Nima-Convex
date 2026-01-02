'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StepProps, STYLE_OUTFIT_IMAGES } from '../types';
import { ArrowLeft, Heart, Check } from 'lucide-react';
import { trackStepCompleted, trackBackClicked, trackStylePreferenceToggled, ONBOARDING_STEPS } from '@/lib/analytics';

export function StyleVibeStep({ updateFormData, onNext, onBack }: StepProps) {
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);

  const toggleOutfit = (outfitId: string) => {
    const isCurrentlySelected = selectedOutfits.includes(outfitId);
    const outfit = STYLE_OUTFIT_IMAGES.find((o) => o.id === outfitId);
    
    // Track style preference toggle
    if (outfit) {
      outfit.tags.forEach((tag) => {
        trackStylePreferenceToggled(tag, !isCurrentlySelected);
      });
    }
    
    setSelectedOutfits((prev) =>
      isCurrentlySelected
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const handleContinue = () => {
    // Extract unique style tags from selected outfits
    const selectedTags = new Set<string>();
    selectedOutfits.forEach((outfitId) => {
      const outfit = STYLE_OUTFIT_IMAGES.find((o) => o.id === outfitId);
      outfit?.tags.forEach((tag) => selectedTags.add(tag));
    });
    const stylePreferences = Array.from(selectedTags);
    
    trackStepCompleted(ONBOARDING_STEPS.STYLE_VIBE, {
      style_count: stylePreferences.length,
      styles: stylePreferences,
      outfits_selected: selectedOutfits.length,
    });
    
    updateFormData({ stylePreferences });
    onNext();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 py-6 border-b border-border/50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => {
                trackBackClicked(ONBOARDING_STEPS.STYLE_VIBE);
                onBack?.();
              }}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                What&apos;s your vibe?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tap outfits that make you say &quot;THAT&apos;S me!&quot;
              </p>
            </div>
          </div>
          
          {/* Selection counter */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedOutfits.length} selected {selectedOutfits.length > 0 && '✓'}
            </p>
            <p className="text-xs text-muted-foreground">
              Select at least 3
            </p>
          </div>
        </div>
      </div>

      {/* Outfit Grid */}
      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {STYLE_OUTFIT_IMAGES.map((outfit, index) => {
              const isSelected = selectedOutfits.includes(outfit.id);
              return (
                <button
                  key={outfit.id}
                  onClick={() => toggleOutfit(outfit.id)}
                  className={`
                    relative aspect-[3/4] rounded-xl overflow-hidden 
                    transition-all duration-300 ease-out
                    ${isSelected 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[0.98]' 
                      : 'hover:scale-[1.02]'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Outfit image */}
                  <img 
                    src={outfit.url}
                    alt={outfit.tags.join(', ')}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Style tags overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex flex-wrap gap-1">
                      {outfit.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="text-[10px] px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`
                      absolute top-3 right-3 w-8 h-8 rounded-full 
                      flex items-center justify-center
                      transition-all duration-300
                      ${isSelected 
                        ? 'bg-primary text-primary-foreground scale-100' 
                        : 'bg-white/30 backdrop-blur-sm text-white scale-90'
                      }
                    `}
                  >
                    {isSelected ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleContinue}
            disabled={selectedOutfits.length < 3}
            size="lg"
            className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] hover:shadow-lg"
          >
            {selectedOutfits.length < 3 
              ? `Select ${3 - selectedOutfits.length} more` 
              : 'Continue'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

