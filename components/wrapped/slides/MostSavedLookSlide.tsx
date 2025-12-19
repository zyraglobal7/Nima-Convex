'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface MostSavedLookSlideProps {
  mostSavedLookId?: Id<'looks'>;
}

export function MostSavedLookSlide({ mostSavedLookId }: MostSavedLookSlideProps) {
  const lookDetails = useQuery(
    api.wrapped.queries.getMostSavedLookDetails,
    mostSavedLookId ? { lookId: mostSavedLookId } : 'skip'
  );

  if (!mostSavedLookId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <span className="text-5xl">📸</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl md:text-4xl font-serif font-bold mb-4 text-[#302B28]"
        >
          Keep Saving Looks!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-lg text-muted-foreground max-w-md"
        >
          Save more looks next year to see your favorites here.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">📸</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Your Most-Saved Look
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-6 text-[#302B28]"
      >
        The One That Got You
      </motion.h2>

      {lookDetails?.imageUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative w-64 h-80 rounded-2xl overflow-hidden shadow-xl mb-6"
        >
          <Image
            src={lookDetails.imageUrl}
            alt="Most saved look"
            fill
            unoptimized={lookDetails.imageUrl.includes('convex.cloud') || lookDetails.imageUrl.includes('convex.site')}
            className="object-cover"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-64 h-80 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6"
        >
          <span className="text-6xl">👗</span>
        </motion.div>
      )}

      {lookDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="space-y-2"
        >
          {lookDetails.look.name && (
            <p className="font-medium text-lg">{lookDetails.look.name}</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {lookDetails.look.styleTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {lookDetails.itemCount} items
          </p>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-6 text-sm text-muted-foreground italic"
      >
        Shared, saved, and absolutely stunning.
      </motion.p>
    </div>
  );
}

