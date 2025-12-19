'use client';

import { motion } from 'framer-motion';

interface PersonalitySlideProps {
  personalityType: string;
  personalityDescription: string;
  trendsAhead: string[];
  trendsSkipped: string[];
}

export function PersonalitySlide({
  personalityType,
  personalityDescription,
  trendsAhead,
  trendsSkipped,
}: PersonalitySlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">🛍️</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Outfit Personality Type
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[#302B28]"
      >
        {personalityType}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-lg text-muted-foreground max-w-md mb-8"
      >
        {personalityDescription}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50">
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            🌍 Trend Explorer Score
          </p>

          {trendsAhead.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">You were ahead of:</p>
              <div className="flex flex-wrap gap-2">
                {trendsAhead.map((trend) => (
                  <motion.span
                    key={trend}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.3 }}
                    className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm"
                  >
                    ✓ {trend}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {trendsSkipped.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">But skipped:</p>
              <div className="flex flex-wrap gap-2">
                {trendsSkipped.map((trend) => (
                  <motion.span
                    key={trend}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1, duration: 0.3 }}
                    className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm"
                  >
                    ✕ {trend}
                  </motion.span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">(fair enough)</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

