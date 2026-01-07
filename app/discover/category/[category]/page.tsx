'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { ApparelItemCard, type ApparelItem } from '@/components/discover/ApparelItemCard';
import { CreateLookSheet } from '@/components/discover/CreateLookSheet';
import { Settings, Sparkles, User, Shirt, ArrowLeft, Loader2 } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useStableValue } from '@/lib/hooks/useStableValue';

// Items per page for infinite scroll
const ITEMS_PER_PAGE = 8;

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses',
  outfit: 'Outfits',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
  bag: 'Bags',
  jewelry: 'Jewelry',
};

// Type for valid categories
type CategoryType = 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryParam = params.category as string;
  
  // Validate category
  const isValidCategory = Object.keys(CATEGORY_LABELS).includes(categoryParam);
  const category = isValidCategory ? (categoryParam as CategoryType) : null;
  const categoryLabel = category ? CATEGORY_LABELS[category] : 'Unknown';

  // Infinite scroll state
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<ApparelItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Selection mode for Create a Look
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<Id<'items'>>>(new Set());
  const [showCreateLookSheet, setShowCreateLookSheet] = useState(false);

  // Fetch items with category filter
  const rawItemsData = useQuery(
    api.items.queries.listItemsWithImages,
    category 
      ? { category, limit: ITEMS_PER_PAGE, cursor: cursor ?? undefined }
      : 'skip'
  );
  const itemsData = useStableValue(rawItemsData, { items: [], nextCursor: null, hasMore: false });

  // Accumulate items as they come in from paginated queries
  useEffect(() => {
    if (!itemsData?.items) return;
    
    const newItems: ApparelItem[] = itemsData.items.map((item) => ({
      _id: item._id,
      publicId: item.publicId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      currency: item.currency,
      originalPrice: item.originalPrice,
      colors: item.colors,
      primaryImageUrl: item.primaryImageUrl,
      isFeatured: item.isFeatured,
    }));

    if (cursor === null) {
      // First page - replace items
      setAccumulatedItems(newItems);
    } else {
      // Subsequent pages - append items (avoiding duplicates)
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));
        const uniqueNewItems = newItems.filter((item) => !existingIds.has(item._id));
        return [...prev, ...uniqueNewItems];
      });
    }
    setIsLoadingMore(false);
  }, [itemsData, cursor]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && itemsData?.hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          setCursor(itemsData.nextCursor);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [itemsData?.hasMore, itemsData?.nextCursor, isLoadingMore]);

  // Handle item selection for Create a Look
  const handleItemSelect = useCallback((itemId: Id<'items'>) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else if (newSet.size < 6) {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Get selected items for CreateLookSheet
  const selectedItemsArray = accumulatedItems.filter((item) => selectedItems.has(item._id));

  // Invalid category - redirect
  if (!isValidCategory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-foreground mb-2">Category not found</h1>
          <p className="text-muted-foreground mb-4">The category &quot;{categoryParam}&quot; doesn&apos;t exist.</p>
          <Link 
            href="/discover"
            className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button and Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full hover:bg-surface transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <Link href="/discover" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-serif font-semibold text-foreground hidden md:inline">Nima</span>
              </Link>

              {/* Desktop Navigation - hidden on mobile */}
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <Link href="/discover" className="text-sm font-medium text-primary">
                  Discover
                </Link>
                <Link href="/ask" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Ask Nima
                </Link>
                <Link href="/lookbooks" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Lookbooks
                </Link>
                <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Profile
                </Link>
              </nav>
            </div>

            {/* Page title - center (mobile only) */}
            <h1 className="md:hidden absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground">
              {categoryLabel}
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="p-2 rounded-full hover:bg-surface transition-colors">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">
            {categoryLabel} ✨
          </h2>
          <p className="text-muted-foreground mt-1">
            {accumulatedItems.length > 0
              ? `${accumulatedItems.length} items${itemsData?.hasMore ? '+' : ''}`
              : 'Browse our collection'
            }
          </p>
        </motion.div>

        {/* Create a Look button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-6 flex justify-center"
        >
          <button
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedItems(new Set());
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`
              px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-200 flex items-center gap-2
              ${isSelectionMode
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            {isSelectionMode ? 'Cancel Selection' : 'Create a Look'}
          </button>
        </motion.div>

        {/* Selection mode indicator */}
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center mb-4"
          >
            <p className="text-sm text-primary font-medium">
              Select 2-6 items to create your look
              {selectedItems.size > 0 && ` (${selectedItems.size} selected)`}
            </p>
          </motion.div>
        )}

        {/* Items grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {accumulatedItems.length === 0 && rawItemsData === undefined ? (
            // Loading skeleton
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
          ) : accumulatedItems.length > 0 ? (
            <>
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {accumulatedItems.map((item, index) => (
                  <ApparelItemCard
                    key={item._id}
                    item={item}
                    index={index}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedItems.has(item._id)}
                    onSelect={handleItemSelect}
                  />
                ))}
              </div>

              {/* Load more trigger */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
                {!itemsData?.hasMore && accumulatedItems.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve seen all {accumulatedItems.length} {categoryLabel.toLowerCase()}
                  </p>
                )}
              </div>
            </>
          ) : (
            // Empty state
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                <Shirt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No {categoryLabel.toLowerCase()} yet
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Check back soon for new items in this category.
              </p>
              <Link 
                href="/discover"
                className="inline-flex mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Back to Discover
              </Link>
            </div>
          )}
        </motion.div>
      </main>

      {/* Floating "Try On Selected" button */}
      <AnimatePresence>
        {isSelectionMode && selectedItems.size >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-0 right-0 z-40 px-4"
          >
            <div className="max-w-md mx-auto">
              <button
                onClick={() => setShowCreateLookSheet(true)}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Try On Selected ({selectedItems.size})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Look Sheet */}
      <CreateLookSheet
        isOpen={showCreateLookSheet}
        onClose={() => setShowCreateLookSheet(false)}
        selectedItems={selectedItemsArray}
        onClearSelection={() => {
          setSelectedItems(new Set());
          setIsSelectionMode(false);
        }}
      />

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs text-primary font-medium">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

