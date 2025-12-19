'use client';

import { motion } from 'framer-motion';
import { Heart, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Look } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils/format';

// Extended look type with generation status
interface LookWithStatus extends Look {
  isGenerating?: boolean;
  generationFailed?: boolean;
}

interface LookCardProps {
  look: LookWithStatus;
  index: number;
}

const heightClasses = {
  short: 'h-[200px]',
  medium: 'h-[280px]',
  tall: 'h-[340px]',
  'extra-tall': 'h-[400px]',
};

export function LookCard({ look, index }: LookCardProps) {
  const hasImage = look.imageUrl && look.imageUrl.length > 0;
  const isGenerating = look.isGenerating || (!hasImage && !look.generationFailed);
  const generationFailed = look.generationFailed;

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
      <Link href={`/look/${look.id}`}>
        <div className="group relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          {/* Image or Generating State */}
          <div className={`relative ${heightClasses[look.height]} overflow-hidden`}>
            {hasImage ? (
              <>
                <img
                  src={look.imageUrl}
                  alt={`Look featuring ${look.styleTags.join(', ')}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : isGenerating ? (
              /* Generating State UI */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary"
                  />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Generating look...</p>
              </div>
            ) : generationFailed ? (
              /* Failed State UI */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Generation failed</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tap to retry</p>
              </div>
            ) : (
              /* Fallback - show items preview */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center p-4">
                <div className="flex flex-wrap gap-1 justify-center mb-2">
                  {look.products.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="w-12 h-12 rounded-lg bg-surface border border-border/50 overflow-hidden"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          {product.category.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{look.products.length} items</p>
              </div>
            )}
            
            {/* Price badge - always show */}
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border/50">
              <span className="text-xs font-medium text-foreground">
                {formatPrice(look.totalPrice, look.currency)}
              </span>
            </div>
            
            {/* Quick like button - shows on hover (only when image is ready) */}
            {hasImage && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute top-3 left-3 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={(e) => {
                  e.preventDefault();
                  // Handle like
                }}
              >
                <Heart className={`w-4 h-4 ${look.isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
              </motion.button>
            )}

            {/* Style tags - shows on hover (only when image is ready) */}
            {hasImage && (
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {look.styleTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-full text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card footer - minimal info */}
          <div className="p-3">
            <p className="text-xs text-muted-foreground">
              {look.occasion} • {look.products.length} items
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

