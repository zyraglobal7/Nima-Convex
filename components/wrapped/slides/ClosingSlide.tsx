'use client';

import { motion } from 'framer-motion';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface ClosingSlideProps {
  year: number;
  shareToken: string;
  totalLooksSaved: number;
  totalTryOns: number;
  totalLookbooks: number;
}

export function ClosingSlide({
  year,
  shareToken,
  totalLooksSaved,
  totalTryOns,
  totalLookbooks,
}: ClosingSlideProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/wrapped/${year}?token=${shareToken}`
      : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Nima Wrapped ${year}`,
          text: `Check out my fashion year in review! 👗✨`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <span className="text-6xl">✨</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-4 max-w-md text-[#302B28]"
      >
        &ldquo;You didn&apos;t just get dressed this year.
        <br />
        You told a story.&rdquo;
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="grid grid-cols-3 gap-4 my-8 w-full max-w-sm"
      >
        <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50">
          <p className="text-2xl font-bold text-accent-foreground">{totalLooksSaved}</p>
          <p className="text-xs text-muted-foreground">Looks Saved</p>
        </div>
        <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50">
          <p className="text-2xl font-bold text-accent-foreground">{totalTryOns}</p>
          <p className="text-xs text-muted-foreground">Try-Ons</p>
        </div>
        <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50">
          <p className="text-2xl font-bold text-accent-foreground">{totalLookbooks}</p>
          <p className="text-xs text-muted-foreground">Lookbooks</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="space-y-4 w-full max-w-sm"
      >
        <Button onClick={handleShare} size="lg" className="w-full gap-2">
          <Share2 className="h-5 w-5" />
          Share Your Nima Wrapped
        </Button>

        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="lg"
          className="w-full gap-2 text-accent-foreground"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" />
              Copy Link
            </>
          )}
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-8 text-sm text-muted-foreground"
      >
        Thanks for an amazing {year} with Nima! 💖
      </motion.p>
    </div>
  );
}

