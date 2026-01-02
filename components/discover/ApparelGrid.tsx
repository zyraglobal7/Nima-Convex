'use client';

import { motion } from 'framer-motion';
import { ApparelItemCard, type ApparelItem } from './ApparelItemCard';
import type { Id } from '@/convex/_generated/dataModel';

interface ApparelGridProps {
  items: ApparelItem[];
  isSelectionMode?: boolean;
  selectedItems?: Set<Id<'items'>>;
  onItemSelect?: (itemId: Id<'items'>) => void;
  isLoading?: boolean;
}

export function ApparelGrid({
  items,
  isSelectionMode = false,
  selectedItems = new Set(),
  onItemSelect,
  isLoading = false,
}: ApparelGridProps) {
  if (isLoading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="break-inside-avoid mb-4">
            <div className="rounded-2xl bg-surface-alt border border-border/30 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-surface" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-surface rounded w-1/3" />
                <div className="h-4 bg-surface rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No items yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Check back soon for new apparel items.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="columns-2 md:columns-3 lg:columns-4 gap-4"
    >
      {items.map((item, index) => (
        <ApparelItemCard
          key={item._id}
          item={item}
          index={index}
          isSelectionMode={isSelectionMode}
          isSelected={selectedItems.has(item._id)}
          onSelect={onItemSelect}
        />
      ))}
    </motion.div>
  );
}

