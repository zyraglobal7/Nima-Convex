'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { StepProps, STYLE_OUTFIT_IMAGES, BudgetRange, Gender } from '../types';
import { Heart, Check, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OCCASIONS = [
  'Work/Office',
  'Casual Hangouts',
  'Dates & Nights Out',
  'Events & Weddings',
  'Active/Fitness',
  'All of the above',
];

const BUDGET_OPTIONS: { value: BudgetRange; label: string; description: string; range: string }[] = [
  {
    value: 'low',
    label: 'Smart Saver',
    description: "Great finds that won't break the bank",
    range: 'Up to KES 2,000',
  },
  {
    value: 'mid',
    label: 'Best of Both',
    description: 'Quality meets value',
    range: 'KES 2,000 - 10,000',
  },
  {
    value: 'premium',
    label: 'Treat Yourself',
    description: "As long as it's nice",
    range: 'KES 10,000+',
  },
];

type ChatStage = 'gender' | 'style' | 'occasions' | 'budget' | 'saving';

const GENDER_OPTIONS = [
  { value: 'female' as Gender, label: "Women's Fashion", emoji: '👩' },
  { value: 'male' as Gender, label: "Men's Fashion", emoji: '👨' },
  { value: 'prefer-not-to-say' as Gender, label: 'Prefer not to say', emoji: '🤫' },
];

interface ChatMessage {
  from: 'nima' | 'user';
  content: React.ReactNode;
  key: string;
}

function NimaAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
      <MessageCircle className="w-4 h-4 text-primary-foreground" />
    </div>
  );
}

export function StyleChatStep({ formData, updateFormData, onNext }: StepProps) {
  const [stage, setStage] = useState<ChatStage>('gender');
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetRange | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'nima',
      key: 'intro',
      content: (
        <p className="text-sm leading-relaxed">
          Hi, I&apos;m Nima — I want to get to know you so I can recommend your best looks.
        </p>
      ),
    },
    {
      from: 'nima',
      key: 'gender-prompt',
      content: (
        <p className="text-sm leading-relaxed">
          First, what style are we shopping for?
        </p>
      ),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const completeOnboardingV2 = useMutation(api.users.mutations.completeOnboardingV2);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenderSelect = (gender: Gender) => {
    setSelectedGender(gender);
    updateFormData({ gender });

    const option = GENDER_OPTIONS.find((o) => o.value === gender)!;
    setMessages((prev) => [
      ...prev,
      {
        from: 'user',
        key: 'user-gender',
        content: <p className="text-sm">{option.emoji} {option.label}</p>,
      },
      {
        from: 'nima',
        key: 'style-prompt',
        content: (
          <p className="text-sm leading-relaxed">
            Love it! Now tap the looks that are <span className="font-semibold">SO you</span> — pick at least 2!
          </p>
        ),
      },
    ]);
    setStage('style');
  };

  const toggleOutfit = (id: string) => {
    setSelectedOutfits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleOccasion = (occasion: string) => {
    if (occasion === 'All of the above') {
      setSelectedOccasions((prev) =>
        prev.includes('All of the above') ? [] : OCCASIONS
      );
      return;
    }
    setSelectedOccasions((prev) =>
      prev.includes(occasion) ? prev.filter((x) => x !== occasion) : [...prev, occasion]
    );
  };

  const handleStyleConfirm = () => {
    if (selectedOutfits.length < 2) return;

    const tags = new Set<string>();
    const chosenImages = selectedOutfits
      .map((id) => STYLE_OUTFIT_IMAGES.find((o) => o.id === id))
      .filter(Boolean) as typeof STYLE_OUTFIT_IMAGES;
    chosenImages.forEach((o) => o.tags.forEach((t) => tags.add(t)));
    updateFormData({ stylePreferences: Array.from(tags) });

    setMessages((prev) => [
      ...prev,
      {
        from: 'user',
        key: 'user-style',
        content: (
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {chosenImages.map((outfit) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={outfit.id}
                  src={outfit.url}
                  alt={outfit.tags.join(', ')}
                  className="w-14 h-20 object-cover rounded-lg flex-shrink-0"
                />
              ))}
            </div>
            <p className="text-xs opacity-80">This feels like more of my style ✓</p>
          </div>
        ),
      },
      {
        from: 'nima',
        key: 'occasions-prompt',
        content: (
          <p className="text-sm leading-relaxed">
            Nice taste! Now help me style you right — what do you dress for most?
          </p>
        ),
      },
    ]);
    setStage('occasions');
  };

  const handleOccasionsConfirm = () => {
    if (selectedOccasions.length === 0) return;

    updateFormData({ occasions: selectedOccasions });

    setMessages((prev) => [
      ...prev,
      {
        from: 'user',
        key: 'user-occasions',
        content: (
          <p className="text-sm">
            {selectedOccasions.includes('All of the above')
              ? 'I dress for everything!'
              : selectedOccasions.join(', ')}
          </p>
        ),
      },
      {
        from: 'nima',
        key: 'budget-prompt',
        content: (
          <p className="text-sm leading-relaxed">
            Last thing — what&apos;s your budget vibe?
          </p>
        ),
      },
    ]);
    setStage('budget');
  };

  const handleBudgetSelect = async (budget: BudgetRange) => {
    setSelectedBudget(budget);
    updateFormData({ budgetRange: budget, country: 'KE', currency: 'KES' });

    const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === budget)?.label ?? budget;
    setMessages((prev) => [
      ...prev,
      {
        from: 'user',
        key: 'user-budget',
        content: <p className="text-sm">{budgetLabel} 👌</p>,
      },
    ]);
    setStage('saving');

    // Collect final preferences
    const tags = new Set<string>();
    selectedOutfits.forEach((id) => {
      STYLE_OUTFIT_IMAGES.find((o) => o.id === id)?.tags.forEach((t) => tags.add(t));
    });

    try {
      await completeOnboardingV2({
        stylePreferences: Array.from(tags),
        occasions: selectedOccasions,
        budgetRange: budget,
        ...(selectedGender ? { gender: selectedGender } : {}),
      });
      onNext();
    } catch (err) {
      console.error('Failed to save profile:', err);
      // Still advance — look generation can retry
      onNext();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat header */}
      <div className="px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <NimaAvatar />
          <div>
            <p className="text-sm font-semibold text-foreground">Nima</p>
            <p className="text-xs text-secondary">AI Stylist</p>
          </div>
          <div className="ml-auto">
            <p className="text-xs font-medium text-foreground text-right">Let&apos;s get to know you</p>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="max-w-md mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.from === 'nima' && <NimaAvatar />}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.from === 'nima'
                      ? 'bg-surface border border-border/50 rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Stage-specific interactive area */}
          {stage === 'gender' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleGenderSelect(option.value)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-border bg-surface hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left"
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{option.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          {stage === 'style' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OUTFIT_IMAGES.map((outfit) => {
                  const isSelected = selectedOutfits.includes(outfit.id);
                  return (
                    <button
                      key={outfit.id}
                      onClick={() => toggleOutfit(outfit.id)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[0.98]'
                          : 'hover:scale-[1.02]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={outfit.url}
                        alt={outfit.tags.join(', ')}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                        <div className="flex flex-wrap gap-1">
                          {outfit.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/30 backdrop-blur-sm text-white'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={handleStyleConfirm}
                disabled={selectedOutfits.length < 2}
                size="lg"
                className="w-full h-12 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                {selectedOutfits.length < 2
                  ? `Pick ${2 - selectedOutfits.length} more`
                  : 'These are SO me →'}
              </Button>
            </motion.div>
          )}

          {stage === 'occasions' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {OCCASIONS.map((occasion) => {
                const isSelected = selectedOccasions.includes(occasion);
                return (
                  <button
                    key={occasion}
                    onClick={() => toggleOccasion(occasion)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface hover:border-primary/30'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all duration-200 ${
                        isSelected ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">{occasion}</span>
                  </button>
                );
              })}
              <Button
                onClick={handleOccasionsConfirm}
                disabled={selectedOccasions.length === 0}
                size="lg"
                className="w-full h-12 rounded-full bg-primary text-primary-foreground disabled:opacity-50 mt-2"
              >
                {selectedOccasions.length === 0 ? 'Pick at least one' : 'Got it →'}
              </Button>
            </motion.div>
          )}

          {stage === 'budget' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {BUDGET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleBudgetSelect(option.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-border bg-surface hover:border-primary/50 hover:bg-surface-alt transition-all duration-200 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                    <p className="text-xs text-secondary font-medium mt-0.5">{option.range}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0 ml-3" />
                </button>
              ))}
            </motion.div>
          )}

          {stage === 'saving' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center py-4"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Building your style profile...
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
