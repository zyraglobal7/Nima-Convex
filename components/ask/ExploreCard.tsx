'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ExploreCardProps {
  className?: string;
}

/**
 * ExploreCard - Shown when no matching items are found
 * Provides a CTA to explore public looks
 */
export function ExploreCard({ className = '' }: ExploreCardProps) {
  // Log when card is displayed
  useEffect(() => {
    console.log('[Chat:UI] ExploreCard displayed', {
      reason: 'no_matches',
      timestamp: Date.now(),
    });
  }, []);

  const handleClick = () => {
    console.log('[Chat:UI] ExploreCard clicked', {
      destination: '/explore',
      timestamp: Date.now(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 bg-surface/50 rounded-2xl border border-border/30 ${className}`}
    >
      <Link
        href="/explore"
        onClick={handleClick}
        className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl hover:from-primary/20 hover:to-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Explore Public Looks</p>
            <p className="text-xs text-muted-foreground">See what others are wearing</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground" />
      </Link>
    </motion.div>
  );
}

