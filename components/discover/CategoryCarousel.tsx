'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ChevronRight } from 'lucide-react';

interface CategoryCarouselProps {
  /** Whether this carousel appears inline within the grid (for mobile) */
  isInlineVariant?: boolean;
}

export function CategoryCarousel({ isInlineVariant = false }: CategoryCarouselProps) {
  const categorySamples = useQuery(api.items.queries.getCategorySamples);

  // Loading skeleton
  if (categorySamples === undefined) {
    return (
      <div className={`${isInlineVariant ? 'py-4' : 'mb-6'}`}>
        {!isInlineVariant && (
          <h3 className="text-lg font-medium text-foreground mb-3">Shop by Category</h3>
        )}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 animate-pulse"
            >
              <div className="aspect-square rounded-xl bg-surface-alt" />
              <div className="mt-2 h-4 bg-surface-alt rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No categories to show
  if (!categorySamples || categorySamples.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${isInlineVariant ? 'py-6 border-y border-border/30' : 'mb-6'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-foreground">
          {isInlineVariant ? 'Explore Categories' : 'Shop by Category'}
        </h3>
        {!isInlineVariant && (
          <span className="text-xs text-muted-foreground">
            {categorySamples.length} categories
          </span>
        )}
      </div>

      {/* Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {categorySamples.map((category, index) => (
          <Link
            key={category.category}
            href={`/discover/category/${category.category}`}
            className="flex-shrink-0 group"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="w-28"
            >
              {/* Image container */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-alt border border-border/30 group-hover:border-primary/50 transition-all duration-200 group-hover:shadow-md">
                {category.sampleImageUrl ? (
                  <Image
                    src={category.sampleImageUrl}
                    alt={category.label}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="112px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-alt">
                    <span className="text-3xl opacity-50">
                      {getCategoryEmoji(category.category)}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Item count badge */}
                <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {category.itemCount} items
                </div>
              </div>

              {/* Label */}
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {category.label}
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    top: '👕',
    bottom: '👖',
    dress: '👗',
    outfit: '🎭',
    outerwear: '🧥',
    shoes: '👟',
    accessory: '🎀',
    bag: '👜',
    jewelry: '💎',
  };
  return emojis[category] || '✨';
}

