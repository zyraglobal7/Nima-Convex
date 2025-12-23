'use client';

import { motion } from 'framer-motion';

interface BrandData {
  brand: string;
  saveCount: number;
}

interface TopBrandsSlideProps {
  topBrands: BrandData[];
}

export function TopBrandsSlide({ topBrands }: TopBrandsSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">👠</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Your Go-To Brands
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-2 text-[#302B28]"
      >
        You couldn&apos;t resist:
      </motion.h2>

      <div className="w-full max-w-md mt-8 space-y-4">
        {topBrands.slice(0, 5).map((brand, index) => (
          <motion.div
            key={brand.brand}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
            className={`p-4 rounded-xl border ${
              index === 0
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-white/50 backdrop-blur-sm border-border/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {index === 0 && <span className="text-xl">👑</span>}
                <span className={`font-semibold text-accent-foreground ${index === 0 ? 'text-lg' : ''}`}>
                  {brand.brand}
                </span>
              </div>
              <span className="text-muted-foreground text-sm">
                {brand.saveCount} saves
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {topBrands.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="mt-8 text-sm text-muted-foreground italic"
        >
          (You saved looks from {topBrands[0]?.brand} {topBrands[0]?.saveCount} times 👀)
        </motion.p>
      )}
    </div>
  );
}

