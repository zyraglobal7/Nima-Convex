'use client';

import { motion } from 'framer-motion';

interface StyleEraSlideProps {
  styleEra: string;
  styleEraDescription: string;
  dominantTags: string[];
}

export function StyleEraSlide({ styleEra, styleEraDescription, dominantTags }: StyleEraSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">👗</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Your Style Era
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl md:text-5xl font-serif font-bold mb-6 text-[#302B28]"
      >
        &ldquo;{styleEra}&rdquo;
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-lg text-muted-foreground max-w-md mb-8"
      >
        {styleEraDescription}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {dominantTags.slice(0, 4).map((tag, index) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
            className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
          >
            {tag}
          </motion.span>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-8 text-sm text-muted-foreground italic"
      >
        Based on what you liked, saved, and tried on
      </motion.p>
    </div>
  );
}

