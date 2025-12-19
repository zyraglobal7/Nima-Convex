'use client';

import { motion } from 'framer-motion';

interface MoodData {
  quarter: string;
  months: string;
  mood: string;
  topTag: string;
}

interface MoodSwingsSlideProps {
  moodSwings: MoodData[];
}

// Quarter emojis
const quarterEmojis: Record<string, string> = {
  Q1: '❄️',
  Q2: '🌸',
  Q3: '☀️',
  Q4: '🍂',
};

export function MoodSwingsSlide({ moodSwings }: MoodSwingsSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">🧵</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Your Fashion Mood Swings
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-8 text-[#302B28]"
      >
        A Year in Style
      </motion.h2>

      <div className="w-full max-w-md space-y-4">
        {moodSwings.map((mood, index) => (
          <motion.div
            key={mood.quarter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.2, duration: 0.4 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl">{quarterEmojis[mood.quarter] || '📅'}</span>
              <span className="text-xs text-muted-foreground mt-1">{mood.quarter}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground">{mood.months}</p>
              <p className="font-semibold text-lg text-accent-foreground">{mood.mood}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="mt-8 text-sm text-muted-foreground italic max-w-sm"
      >
        Your style evolved with the seasons. That&apos;s called growth! 💫
      </motion.p>
    </div>
  );
}

