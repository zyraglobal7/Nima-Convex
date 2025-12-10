'use client';

import { motion } from 'framer-motion';
import { Heart, Bookmark, Shuffle, X, ExternalLink } from 'lucide-react';
import type { Product } from '@/lib/mock-data';
import { formatPrice } from '@/lib/mock-data';

interface ProductItemProps {
  product: Product;
  index: number;
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: (productId: string) => void;
  onSave?: (productId: string) => void;
  onSwap?: (productId: string) => void;
  onRemove?: (productId: string) => void;
  showActions?: boolean;
  className?: string;
}

export function ProductItem({
  product,
  index,
  isLiked = false,
  isSaved = false,
  onLike,
  onSave,
  onSwap,
  onRemove,
  showActions = true,
  className = '',
}: ProductItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group ${className}`}
    >
      <div className="flex gap-3 p-3 bg-surface rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-200">
        {/* Product image */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-alt">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                {product.brand}
              </p>
              <h4 className="text-sm font-medium text-foreground truncate">
                {product.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{product.color}</p>
            </div>
            <p className="text-sm font-semibold text-foreground whitespace-nowrap">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>

          {/* Actions row */}
          {showActions && (
            <div className="flex items-center justify-between mt-2">
              {/* Quick actions */}
              <div className="flex items-center gap-1">
                {/* Like */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onLike?.(product.id)}
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center
                    transition-colors
                    ${isLiked
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-surface-alt text-muted-foreground hover:text-red-500'
                    }
                  `}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                </motion.button>

                {/* Save */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSave?.(product.id)}
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center
                    transition-colors
                    ${isSaved
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-alt text-muted-foreground hover:text-primary'
                    }
                  `}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                </motion.button>

                {/* Swap */}
                {onSwap && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSwap(product.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-alt text-muted-foreground hover:text-secondary transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </motion.button>
                )}

                {/* Remove */}
                {onRemove && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onRemove(product.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-alt text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </div>

              {/* Shop link */}
              <a
                href={product.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Shop
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for swapper modal
export function ProductItemCompact({
  product,
  isSelected = false,
  onClick,
}: {
  product: Product;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex flex-col items-center p-2 rounded-xl border transition-all duration-200
        ${isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border/50 bg-surface hover:border-primary/30'
        }
      `}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-alt mb-2">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {product.brand}
      </p>
      <p className="text-xs font-medium text-foreground text-center line-clamp-1">
        {product.name}
      </p>
      <p className="text-xs text-secondary font-medium mt-0.5">
        {formatPrice(product.price, product.currency)}
      </p>
    </motion.button>
  );
}

