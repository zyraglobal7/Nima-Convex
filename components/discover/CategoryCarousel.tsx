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
  const categorySamples = useQuery(api.items.queries.getCategorySamplesWithGender, { userGender });

  // Loading skeleton - different for mobile vs desktop
  if (categorySamples === undefined) {
    return (
      <>
        {/* Mobile: Vertical full-width skeleton cards */}
        <div className="md:hidden">
          <div className={`${isInlineVariant ? 'py-4' : 'mb-6'}`}>
            {!isInlineVariant && <h3 className="text-lg font-medium text-foreground mb-3">Shop by Category</h3>}
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-20 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-surface-alt" />
                  <div className="h-3 bg-surface-alt rounded w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: Horizontal carousel skeleton */}
        <div className="hidden md:block">
          <div className={`${isInlineVariant ? 'py-4' : 'mb-6'}`}>
            {!isInlineVariant && <h3 className="text-lg font-medium text-foreground mb-3">Shop by Category</h3>}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-28 animate-pulse">
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
      {/* Mobile: Horizontal scrolling circular categories */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`${isInlineVariant ? 'py-6 border-y border-border/30' : ''}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-foreground">
              {isInlineVariant ? 'Explore Categories' : 'Shop by Category'}
            </h3>
            <span className="text-xs text-muted-foreground">{categorySamples.length} categories</span>
          </div>

          {/* Horizontal scrolling circular categories */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {categorySamples.map((category, index) => {
              const isGenderCategory = category.isGenderCategory;
              // Include ?from=apparel to preserve selection state when navigating back
              const href = isGenderCategory
                ? `/discover/gender/${category.category}?from=apparel`
                : `/discover/category/${category.category}?from=apparel`;

              return (
                <Link key={category.category} href={href} className="flex-shrink-0 group">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex flex-col items-center gap-2 w-20"
                  >
                    {/* Circular image container */}
                    <div
                      className={`relative w-16 h-16 rounded-full overflow-hidden bg-surface-alt border-2 transition-all duration-200 group-hover:shadow-md ${
                        isGenderCategory
                          ? 'border-primary/50 group-hover:border-primary'
                          : 'border-border/30 group-hover:border-primary/50'
                      }`}
                    >
                      {category.sampleImageUrl ? (
                        <Image
                          src={category.sampleImageUrl}
                          alt={category.label}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-alt">
                          <span className="text-2xl opacity-60">{getCategoryEmoji(category.category)}</span>
                        </div>
                      )}

                      {/* Subtle gradient overlay for depth */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      {/* Featured dot indicator for gender categories */}
                      {isGenderCategory && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-xs font-medium text-center leading-tight transition-colors ${
                        isGenderCategory
                          ? 'text-primary group-hover:text-primary-hover'
                          : 'text-foreground group-hover:text-primary'
                      }`}
                    >
                      {category.label}
                    </span>
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
              <span className="text-xs text-muted-foreground">{categorySamples.length} categories</span>
            )}
          </div>

          {/* Carousel */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {categorySamples.map((category, index) => {
              const isGenderCategory = category.isGenderCategory;
              // Include ?from=apparel to preserve selection state when navigating back
              const href = isGenderCategory
                ? `/discover/gender/${category.category}?from=apparel`
                : `/discover/category/${category.category}?from=apparel`;

              return (
                <Link key={category.category} href={href} className="flex-shrink-0 group">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="w-28"
                  >
                    {/* Image container */}
                    <div
                      className={`relative aspect-square rounded-xl overflow-hidden bg-surface-alt border transition-all duration-200 group-hover:shadow-md ${
                        isGenderCategory
                          ? 'border-primary/50 group-hover:border-primary'
                          : 'border-border/30 group-hover:border-primary/50'
                      }`}
                    >
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
                          <span className="text-3xl opacity-50">{getCategoryEmoji(category.category)}</span>
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
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isGenderCategory
                            ? 'text-primary group-hover:text-primary-hover'
                            : 'text-foreground group-hover:text-primary'
                        }`}
                      >
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
    swimwear: '👙',
  };
  return emojis[category] || '✨';
}
