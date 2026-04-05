'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { StepProps } from '../types';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackOnboardingCompleted, trackStartExploringClicked } from '@/lib/analytics';

export function SuccessStep({ formData }: StepProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);

  const userLooks = useQuery(api.looks.queries.getUserGeneratedLooks, { limit: 3 });

  useEffect(() => {
    trackOnboardingCompleted({
      style_count: formData.stylePreferences.length,
      budget_range: formData.budgetRange || undefined,
      photo_count: formData.uploadedImages?.length || 0,
    });
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleCheckItOut = () => {
    trackStartExploringClicked();
    router.push('/discover');
  };

  // Extract look preview images — prefer the try-on look image, fall back to item image
  const lookPreviews = (userLooks ?? []).map((entry) => {
    const tryOnUrl = entry.lookImage?.imageUrl ?? null;
    const itemUrl = entry.items[0]?.primaryImageUrl ?? null;
    return { id: entry.look._id, url: tryOnUrl ?? itemUrl };
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden min-h-screen">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-sm w-full text-center space-y-8">
        {/* Sparkle icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={showContent ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            Your Looks are ready
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full">
            <span className="text-lg">🎁</span>
            <p className="text-sm font-medium text-secondary">
              You have also been gifted <span className="font-bold">5 FREE CREDITS</span>
            </p>
          </div>
        </motion.div>

        {/* Look previews — 3 overlapping circles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={showContent ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center"
        >
          {lookPreviews.length > 0 ? (
            <div className="flex items-center -space-x-6">
              {lookPreviews.map((preview, i) => (
                <div
                  key={preview.id}
                  className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-surface shadow-md"
                  style={{ zIndex: lookPreviews.length - i }}
                >
                  {preview.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.url}
                      alt={`Look ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Placeholder circles while looks load
            <div className="flex items-center -space-x-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-24 h-24 rounded-full border-4 border-background bg-gradient-to-br from-primary/20 to-secondary/20 shadow-md animate-pulse"
                  style={{ zIndex: 3 - i }}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={showContent ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            onClick={handleCheckItOut}
            size="lg"
            className="w-full max-w-xs h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Check it Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
