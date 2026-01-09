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
  /** User's gender for showing opposite-gender category first */
  userGender?: 'male' | 'female' | 'prefer-not-to-say';
}

export function CategoryCarousel({ isInlineVariant = false, userGender }: CategoryCarouselProps) {
  // Use gender-aware query if user gender is provided
  const categorySamples = useQuery(
    api.items.queries.getCategorySamplesWithGender,
    { userGender }
  );

  // Loading skeleton - different for mobile vs desktop
  if (categorySamples === undefined) {
    return (
      <>
        {/* Mobile: Vertical full-width skeleton cards */}
        <div className="md:hidden">
          <div className={`${isInlineVariant ? 'py-4' : 'mb-6'}`}>
            {!isInlineVariant && (
              <h3 className="text-lg font-medium text-foreground mb-3">Shop by Category</h3>
            )}
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-full h-40 rounded-2xl bg-surface-alt animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal carousel skeleton */}
        <div className="hidden md:block">
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
        </div>
      </>
    );
  }

  // No categories to show
  if (!categorySamples || categorySamples.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Full-width vertical cards (Pinterest-style) */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`${isInlineVariant ? 'py-6 border-y border-border/30' : 'mb-6'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">
              {isInlineVariant ? 'Explore Categories' : 'Shop by Category'}
            </h3>
          </div>

          {/* Vertical full-width cards */}
          <div className="flex flex-col gap-4">
            {categorySamples.map((category, index) => {
              const isGenderCategory = category.isGenderCategory;
              const href = isGenderCategory 
                ? `/discover/gender/${category.category}`
                : `/discover/category/${category.category}`;

              return (
                <Link key={category.category} href={href}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="relative w-full h-40 rounded-2xl overflow-hidden group"
                  >
                    {/* Background image */}
                    {category.sampleImageUrl ? (
                      <Image
                        src={category.sampleImageUrl}
                        alt={category.label}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-alt" />
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

                    {/* Centered text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl font-serif font-medium drop-shadow-lg">
                        {category.label}
                      </span>
                    </div>

                    {/* Item count badge */}
                    <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">
                        {category.itemCount} items
                      </span>
                    </div>

                    {/* Featured badge for gender categories */}
                    {isGenderCategory && (
                      <div className="absolute top-3 left-3 bg-primary px-3 py-1 rounded-full">
                        <span className="text-primary-foreground text-xs font-medium">
                          Featured
                        </span>
                      </div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Desktop: Horizontal carousel (unchanged) */}
      <div className="hidden md:block">
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
            {categorySamples.map((category, index) => {
              const isGenderCategory = category.isGenderCategory;
              const href = isGenderCategory 
                ? `/discover/gender/${category.category}`
                : `/discover/category/${category.category}`;

              return (
                <Link
                  key={category.category}
                  href={href}
                  className="flex-shrink-0 group"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="w-28"
                  >
                    {/* Image container */}
                    <div className={`relative aspect-square rounded-xl overflow-hidden bg-surface-alt border transition-all duration-200 group-hover:shadow-md ${
                      isGenderCategory 
                        ? 'border-primary/50 group-hover:border-primary' 
                        : 'border-border/30 group-hover:border-primary/50'
                    }`}>
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

                      {/* Special badge for gender category */}
                      {isGenderCategory && (
                        <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-primary-foreground">
                          Featured
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <span className={`text-sm font-medium transition-colors ${
                        isGenderCategory 
                          ? 'text-primary group-hover:text-primary-hover' 
                          : 'text-foreground group-hover:text-primary'
                      }`}>
                        {category.label}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -ml-0.5" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </>
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
    // Gender categories
    male: '👔',
    female: '👗',
  };
  return emojis[category] || '✨';
}
