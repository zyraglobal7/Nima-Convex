'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface IntroSlideProps {
  year: number;
  firstName?: string;
}

export function IntroSlide({ year, firstName }: IntroSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[#302B28]"
      >
        Your Nima Wrapped {year}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="space-y-2"
      >
        <p className="text-xl text-muted-foreground">
          {firstName ? `Hey ${firstName}!` : 'Hey there!'}
        </p>
        <p className="text-lg text-muted-foreground max-w-md">
          Let&apos;s look back at your fashion journey this year.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-12 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <span>Swipe to continue</span>
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          →
        </motion.span>
      </motion.div>
    </div>
  );
}

