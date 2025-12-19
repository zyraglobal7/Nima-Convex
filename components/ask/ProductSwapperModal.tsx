'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProductItemCompact } from './ProductItem';
import Image from 'next/image';
import type { Product } from '@/lib/mock-data';

interface ProductSwapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: Product | null;
  alternatives: Product[];
  onSwap: (newProductId: string) => void;
}

type CategoryFilter = 'all' | Product['category'];

export function ProductSwapperModal({
  isOpen,
  onClose,
  currentProduct,
  alternatives,
  onSwap,
}: ProductSwapperModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Filter alternatives by category
  const filteredAlternatives = alternatives.filter((product) => {
    if (categoryFilter === 'all') return true;
    return product.category === categoryFilter;
  });

  // Get unique categories from alternatives
  const categories: CategoryFilter[] = [
    'all',
    ...Array.from(new Set(alternatives.map((p) => p.category))),
  ];

  const handleSwap = () => {
    if (selectedProductId) {
      onSwap(selectedProductId);
      setSelectedProductId(null);
      onClose();
    }
  };

  const handleSelect = (productId: string) => {
    setSelectedProductId(productId === selectedProductId ? null : productId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-serif flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-secondary" />
              Swap Item
            </SheetTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(85vh-80px)]">
          {/* Current product preview */}
          {currentProduct && (
            <div className="p-4 bg-surface/50 border-b border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Currently selected:</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-alt relative">
                  <Image
                    src={currentProduct.imageUrl}
                    alt={currentProduct.name}
                    fill
                    unoptimized={currentProduct.imageUrl.includes('convex.cloud') || currentProduct.imageUrl.includes('convex.site')}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{currentProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{currentProduct.brand}</p>
                </div>
              </div>
            </div>
          )}

          {/* Category filter tabs */}
          <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide border-b border-border/30">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                  transition-all duration-200
                  ${categoryFilter === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface text-muted-foreground hover:text-foreground border border-border/50'
                  }
                `}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Alternatives grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredAlternatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Shuffle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No alternatives available</p>
                <p className="text-sm text-muted-foreground/70">
                  Try a different category filter
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredAlternatives.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <ProductItemCompact
                        product={product}
                        isSelected={selectedProductId === product.id}
                        onClick={() => handleSelect(product.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-4 border-t border-border/50 bg-background">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-full border border-border/50 text-foreground font-medium hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSwap}
                disabled={!selectedProductId}
                className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
              >
                Swap Item
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

