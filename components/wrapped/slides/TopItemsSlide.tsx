'use client';

import { motion } from 'framer-motion';

interface TopItem {
  itemId: string;
  name: string;
  count: number;
}

interface TopItemsSlideProps {
  topItems: TopItem[];
}

export function TopItemsSlide({ topItems }: TopItemsSlideProps) {
  // Emojis for ranking
  const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">🔥</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Top 5 Most-Loved Items
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-8 text-[#302B28]"
      >
        Your Wardrobe MVPs
      </motion.h2>

      <div className="w-full max-w-md space-y-3">
        {topItems.slice(0, 5).map((item, index) => (
          <motion.div
            key={item.itemId}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border/50"
          >
            <span className="text-2xl">{rankEmojis[index]}</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-accent-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.count}x saved/tried</p>
            </div>
          </motion.div>
        ))}
      </div>

      {topItems.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="mt-8 text-sm text-muted-foreground italic"
        >
          (You really know what you like! 👀)
        </motion.p>
      )}
    </div>
  );
}

