'use client';

import { motion } from 'framer-motion';
import { Lock, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Doc } from '@/convex/_generated/dataModel';

// Array of aesthetic gradient combinations for empty lookbooks
const emptyStateGradients = [
  'from-rose-100 via-purple-100 to-indigo-100 dark:from-rose-900/30 dark:via-purple-900/30 dark:to-indigo-900/30',
  'from-amber-100 via-orange-100 to-rose-100 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-rose-900/30',
  'from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30',
  'from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30',
  'from-pink-100 via-rose-100 to-orange-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-orange-900/30',
];

interface LookbookCardProps {
  lookbook: Doc<'lookbooks'>;
  coverImageUrl: string | null;
  itemImageUrls?: string[];
  index: number;
}

export function LookbookCard({ lookbook, coverImageUrl, itemImageUrls = [], index }: LookbookCardProps) {
  // Select a consistent gradient based on the lookbook name
  const gradientIndex = lookbook.name.charCodeAt(0) % emptyStateGradients.length;
  const emptyGradient = emptyStateGradients[gradientIndex];
  
  // Determine if we should show item grid (has items but no cover)
  const showItemGrid = !coverImageUrl && itemImageUrls.length > 0;
  
  // Get initials from lookbook name (first letter of first two words)
  const initials = lookbook.name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="break-inside-avoid mb-4"
    >
      <Link href={`/lookbooks/${lookbook._id}`}>
        <div className="group relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          {/* Cover Image */}
          <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
            {coverImageUrl ? (
              <Image
                src={coverImageUrl}
                alt={lookbook.name}
                fill
                unoptimized={coverImageUrl.includes('convex.cloud') || coverImageUrl.includes('convex.site')}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : showItemGrid ? (
              /* Show 2x2 grid of item images */
              <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-border/20">
                {itemImageUrls.slice(0, 4).map((imageUrl, imgIndex) => (
                  <div key={imgIndex} className="relative overflow-hidden bg-surface-alt">
                    <Image
                      src={imageUrl}
                      alt={`Item ${imgIndex + 1}`}
                      fill
                      unoptimized={imageUrl.includes('convex.cloud') || imageUrl.includes('convex.site')}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ))}
                {/* Fill remaining slots if less than 4 images */}
                {Array.from({ length: Math.max(0, 4 - itemImageUrls.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-surface-alt flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-border/30" />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state with gradient and initials */
              <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${emptyGradient} relative overflow-hidden`}>
                {/* Show initials for empty lookbooks */}
                <div className="w-20 h-20 rounded-2xl bg-white/30 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-serif font-bold text-foreground/60">
                    {initials || <Sparkles className="w-8 h-8" />}
                  </span>
                </div>
                
                <p className="mt-4 text-xs font-medium text-foreground/60">
                  Empty lookbook
                </p>
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Public/Private badge */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 flex items-center gap-1">
              {lookbook.isPublic ? (
                <>
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Private</span>
                </>
              )}
            </div>
          </div>

          {/* Card footer */}
          <div className="p-4">
            <h3 className="font-medium text-foreground mb-1 line-clamp-1">{lookbook.name}</h3>
            {lookbook.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lookbook.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {lookbook.itemCount} {lookbook.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

