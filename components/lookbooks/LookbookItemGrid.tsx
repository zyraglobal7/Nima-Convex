'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import type { Doc } from '@/convex/_generated/dataModel';

interface LookbookItemGridProps {
  items: Array<
    | {
        lookbookItem: Doc<'lookbook_items'>;
        type: 'look';
        look: {
          _id: string;
          publicId: string;
          totalPrice: number;
          currency: string;
          styleTags: string[];
          occasion?: string;
        };
        lookImageUrl: string | null;
      }
    | {
        lookbookItem: Doc<'lookbook_items'>;
        type: 'item';
        item: {
          _id: string;
          name: string;
          brand?: string;
          category: string;
          price: number;
          currency: string;
          colors: string[];
        };
        itemImageUrl: string | null;
      }
  >;
  onRemove?: (lookbookItemId: string) => void;
  canEdit?: boolean;
}

export function LookbookItemGrid({ items, onRemove, canEdit = false }: LookbookItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">This lookbook is empty</p>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
      {items.map((itemData, index) => {
        if (itemData.type === 'look') {
          const { lookbookItem, look, lookImageUrl } = itemData;
          return (
            <motion.div
              key={lookbookItem._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="break-inside-avoid mb-4 group relative"
            >
              <Link href={`/look/${look._id}`}>
                <div className="relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                  <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
                    {lookImageUrl ? (
                      <Image
                        src={lookImageUrl}
                        alt={`Look ${look.publicId}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <span className="text-muted-foreground/50">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">Look</span>
                      <span className="text-xs font-semibold text-foreground">
                        {formatPrice(look.totalPrice, look.currency)}
                      </span>
                    </div>
                    {look.styleTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {look.styleTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-surface-alt rounded-full text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {canEdit && onRemove && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(lookbookItem._id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>
          );
        } else {
          const { lookbookItem, item, itemImageUrl } = itemData;
          return (
            <motion.div
              key={lookbookItem._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="break-inside-avoid mb-4 group relative"
            >
              <Link href={`/items/${item._id}`}>
                <div className="relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                  <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
                    {itemImageUrl ? (
                      <Image
                        src={itemImageUrl}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <span className="text-muted-foreground/50">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {item.brand && (
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                        {item.brand}
                      </p>
                    )}
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{item.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {item.colors.length > 0 ? item.colors[0] : 'Mixed'}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {formatPrice(item.price, item.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              {canEdit && onRemove && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(lookbookItem._id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>
          );
        }
      })}
    </div>
  );
}

