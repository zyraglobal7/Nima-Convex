'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import type { Id } from '@/convex/_generated/dataModel';

export interface ApparelItem {
  _id: Id<'items'>;
  publicId: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  currency: string;
  originalPrice?: number;
  colors: string[];
  primaryImageUrl: string | null;
  isFeatured?: boolean;
}

interface ApparelItemCardProps {
  item: ApparelItem;
  index: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (itemId: Id<'items'>) => void;
  isInfiniteScrollLoad?: boolean; // Flag for items loaded via infinite scroll
  isLiked?: boolean; // Whether the item is liked by the current user
  onToggleLike?: (itemId: Id<'items'>) => Promise<void>; // Callback to toggle like
}

export function ApparelItemCard({
  item,
  index,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  isInfiniteScrollLoad = false,
  isLiked = false,
  onToggleLike,
}: ApparelItemCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const hasImage = item.primaryImageUrl && item.primaryImageUrl.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onSelect) {
      e.preventDefault();
      onSelect(item._id);
    }
  };

  // For infinite scroll items, use faster animation with no stagger delay
  // For initial load, use stagger but cap at first 8 items to avoid long delays
  const animationDelay = isInfiniteScrollLoad ? 0 : Math.min(index, 7) * 0.05;
  const animationDuration = isInfiniteScrollLoad ? 0.3 : 0.5;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: animationDuration,
        delay: animationDelay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="break-inside-avoid mb-4"
    >
      <div
        onClick={handleClick}
        className={`
          group relative overflow-hidden rounded-2xl bg-surface border transition-all duration-300
          ${isSelectionMode ? 'cursor-pointer' : ''}
          ${isSelected
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-border/30 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1'
          }
        `}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {hasImage ? (
            <>
              <Image
                src={item.primaryImageUrl!}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading={index < 4 ? 'eager' : 'lazy'}
                priority={index < 2}
                unoptimized={
                  item.primaryImageUrl!.includes('convex.cloud') ||
                  item.primaryImageUrl!.includes('convex.site')
                }
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full bg-surface-alt flex items-center justify-center">
              <span className="text-3xl text-muted-foreground/40">
                {item.category.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Selection checkbox */}
          {isSelectionMode && (
            <div
              className={`
                absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                ${isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-background/90 border-border/50 group-hover:border-primary/50'
                }
              `}
            >
              {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
            </div>
          )}

          {/* Price badge */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border/50">
            <span className="text-xs font-medium text-foreground">
              {formatPrice(item.price, item.currency)}
            </span>
          </div>

          {/* Quick like button - shows on hover or if liked (not in selection mode) */}
          {!isSelectionMode && hasImage && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLiking}
              className={`
                absolute bottom-3 right-3 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 
                transition-all duration-300
                ${isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                disabled:opacity-50
              `}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggleLike && !isLiking) {
                  setIsLiking(true);
                  try {
                    await onToggleLike(item._id);
                  } finally {
                    setIsLiking(false);
                  }
                }
              }}
            >
              {isLiking ? (
                <Loader2 className="w-4 h-4 text-foreground animate-spin" />
              ) : (
                <Heart 
                  className={`w-4 h-4 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-foreground'}`} 
                />
              )}
            </motion.button>
          )}

          {/* Sale badge */}
          {item.originalPrice && item.originalPrice > item.price && (
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-destructive/90 backdrop-blur-sm rounded-full">
              <span className="text-xs font-medium text-destructive-foreground">
                {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="p-3">
          {item.brand && (
            <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
          )}
          <h4 className="font-medium text-foreground text-sm truncate mt-0.5">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            {item.colors.length > 0 && (
              <div className="flex items-center gap-1">
                {item.colors.slice(0, 3).map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full border border-border/50"
                    style={{ backgroundColor: color.toLowerCase() }}
                    title={color}
                  />
                ))}
                {item.colors.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{item.colors.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // If in selection mode, don't wrap in link
  if (isSelectionMode) {
    return cardContent;
  }

  return <Link href={`/product/${item._id}`}>{cardContent}</Link>;
}

