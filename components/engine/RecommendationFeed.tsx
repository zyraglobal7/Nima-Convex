'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { RecommendationCard } from './RecommendationCard';
import { WardrobeUploadSheet } from './WardrobeUploadSheet';
import { trackEvent } from '@/lib/analytics';
import { Sparkles, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface RecommendationFeedProps {
  userName?: string;
  /** Controlled from parent — determines which tab is active */
  activeTab: 'new' | 'wardrobe';
  onTabChange: (tab: 'new' | 'wardrobe') => void;
}

interface HydratedRec {
  _id: Id<'recommendations'>;
  occasion: string;
  nimaComment: string;
  status: string;
  isWardrobeMix?: boolean;
  items: Array<{
    _id: Id<'items'>;
    name: string;
    brand?: string;
    imageUrl?: string | null;
    price: number;
    currency: string;
    category: string;
  }>;
  wardrobeItems?: Array<{
    _id: Id<'items'>;
    name: string;
    imageUrl?: string | null;
    price: number;
    currency: string;
    category: string;
  }>;
}

export function RecommendationFeed({ userName, activeTab, onTabChange }: RecommendationFeedProps) {
  const recommendations = useQuery(api.recommendations.queries.getWeeklyRecommendations, {
    includeWardrobe: activeTab === 'wardrobe',
  }) as HydratedRec[] | undefined;

  const wardrobeCount = useQuery(api.wardrobe.queries.getWardrobeItemCount);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDefaultSource, setUploadDefaultSource] = useState<'single_upload' | 'closet_scan'>('single_upload');

  // Track tab views
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      trackEvent('recommendation_feed_viewed', {
        tab: activeTab,
        count: recommendations.length,
      });
    }
  }, [recommendations, activeTab]);

  const handleTabChange = (tab: 'new' | 'wardrobe') => {
    if (tab === activeTab) return;
    trackEvent('recommendation_tab_switched', { tab });
    onTabChange(tab);
  };

  const openUpload = (source: 'single_upload' | 'closet_scan') => {
    setUploadDefaultSource(source);
    setUploadSheetOpen(true);
  };

  const displayName = userName ? userName.split(' ')[0] : 'there';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-serif font-semibold text-text-primary">
          Hey, {displayName} 👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here are some recommendations based on your style profile
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 p-1 bg-surface rounded-xl border border-border/50">
          <button
            onClick={() => handleTabChange('new')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            New
          </button>
          <button
            onClick={() => handleTabChange('wardrobe')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'wardrobe'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            My Wardrobe
            {wardrobeCount !== undefined && wardrobeCount > 0 && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'wardrobe'
                    ? 'bg-primary-foreground/20'
                    : 'bg-border text-text-secondary'
                }`}
              >
                {wardrobeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-36">
        <FeedContent
          recommendations={recommendations}
          activeTab={activeTab}
          wardrobeCount={wardrobeCount}
          onUpload={openUpload}
        />

        {/* "Add item" button when wardrobe tab has items */}
        {activeTab === 'wardrobe' && wardrobeCount !== undefined && wardrobeCount > 0 && (
          <button
            onClick={() => openUpload('single_upload')}
            className="fixed bottom-[90px] right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
            aria-label="Add wardrobe item"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Wardrobe upload sheet */}
      <WardrobeUploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        defaultSource={uploadDefaultSource}
      />
    </div>
  );
}

function FeedContent({
  recommendations,
  activeTab,
  wardrobeCount,
  onUpload,
}: {
  recommendations: HydratedRec[] | undefined;
  activeTab: 'new' | 'wardrobe';
  wardrobeCount: number | undefined;
  onUpload: (source: 'single_upload' | 'closet_scan') => void;
}) {
  // Wardrobe tab — show the wardrobe grid (handles its own loading/empty states)
  if (activeTab === 'wardrobe') {
    return <WardrobeTabContent onUpload={onUpload} recommendations={recommendations} />;
  }

  // "New" tab loading skeleton
  if (recommendations === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border/60 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-border/40" />
            <div className="p-4 space-y-3">
              <div className="h-3 bg-border/40 rounded-full w-20" />
              <div className="h-4 bg-border/40 rounded-full w-3/4" />
              <div className="h-10 bg-border/40 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // "New" tab — no recommendations yet
  if (recommendations.length === 0) {
    return <RecommendationsEmptyState />;
  }

  return (
    <div className="space-y-5">
      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec._id}
          id={rec._id}
          items={rec.items ?? []}
          wardrobeItems={rec.wardrobeItems ?? []}
          occasion={rec.occasion}
          nimaComment={rec.nimaComment}
          isWardrobeMix={rec.isWardrobeMix}
        />
      ))}
    </div>
  );
}

// ── Wardrobe tab content ───────────────────────────────────────────────────────

interface WardrobeItem {
  _id: Id<'wardrobeItems'>;
  description: string;
  category: string;
  imageUrl?: string | null;
  formality: string;
  color: string;
}

const CATEGORIES = ['All', 'tops', 'bottoms', 'shoes', 'outerwear', 'accessories', 'dresses'];

function WardrobeTabContent({
  onUpload,
  recommendations,
}: {
  onUpload: (source: 'single_upload' | 'closet_scan') => void;
  recommendations: HydratedRec[] | undefined;
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const removeItem = useMutation(api.wardrobe.mutations.removeWardrobeItem);

  const wardrobeItems = useQuery(api.wardrobe.queries.getWardrobeItems, {
    category: activeCategory === 'All' ? undefined : activeCategory,
  }) as WardrobeItem[] | undefined;

  if (wardrobeItems === undefined) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square rounded-xl bg-surface border border-border/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (wardrobeItems.length === 0 && activeCategory === 'All') {
    return <WardrobeEmptyState onUpload={onUpload} />;
  }

  const handleRemove = (itemId: Id<'wardrobeItems'>, index: number) => {
    removeItem({ itemId });
    // If we removed the last item, close viewer; otherwise clamp index
    if (wardrobeItems.length <= 1) {
      setViewerIndex(null);
    } else if (index >= wardrobeItems.length - 1) {
      setViewerIndex(index - 1);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Item count */}
        <p className="text-xs text-text-secondary">
          {wardrobeItems.length} {wardrobeItems.length === 1 ? 'item' : 'items'}
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
        </p>

        {/* 3-column grid */}
        {wardrobeItems.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">No {activeCategory} yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {wardrobeItems.map((item, index) => (
              <WardrobeItemTile
                key={item._id}
                item={item}
                onOpen={() => setViewerIndex(index)}
                onRemove={() => handleRemove(item._id, index)}
              />
            ))}
          </div>
        )}

        {/* Wardrobe-mix recommendations (when they exist) */}
        {recommendations && recommendations.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-text-primary mb-3">Styled with your wardrobe</p>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec._id}
                  id={rec._id}
                  items={rec.items ?? []}
                  wardrobeItems={rec.wardrobeItems ?? []}
                  occasion={rec.occasion}
                  nimaComment={rec.nimaComment}
                  isWardrobeMix={rec.isWardrobeMix}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen item viewer */}
      {viewerIndex !== null && wardrobeItems.length > 0 && (
        <WardrobeItemViewer
          items={wardrobeItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onRemove={(itemId, index) => handleRemove(itemId, index)}
        />
      )}
    </>
  );
}

function WardrobeItemTile({
  item,
  onOpen,
  onRemove,
}: {
  item: WardrobeItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden bg-surface border border-border/40 cursor-pointer"
      onClick={() => {
        if (showDelete) {
          setShowDelete(false);
        } else {
          onOpen();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowDelete((v) => !v);
      }}
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.description}
          fill
          className="object-cover"
          sizes="33vw"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>
      )}

      {/* Description overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <p className="text-white text-[10px] leading-tight line-clamp-2">{item.description}</p>
      </div>

      {/* Delete overlay — long-press / right-click */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2.5 bg-destructive rounded-full text-white"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Full-screen wardrobe item viewer ─────────────────────────────────────────

function WardrobeItemViewer({
  items,
  initialIndex,
  onClose,
  onRemove,
}: {
  items: WardrobeItem[];
  initialIndex: number;
  onClose: () => void;
  onRemove: (itemId: Id<'wardrobeItems'>, index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const item = items[currentIndex];

  const goTo = (index: number) => {
    if (index >= 0 && index < items.length) setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only treat as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0">
        <span className="text-white/60 text-sm">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 min-h-0 relative">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.description}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">👗</div>
        )}

        {/* Prev / Next arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => goTo(currentIndex - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white"
            aria-label="Previous item"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white"
            aria-label="Next item"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom info + delete */}
      <div className="flex-shrink-0 px-4 pt-4 pb-12 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white font-medium text-base">{item.description}</p>
        <p className="text-white/60 text-sm mt-0.5 capitalize">
          {item.category}{item.color ? ` · ${item.color}` : ''}{item.formality ? ` · ${item.formality}` : ''}
        </p>
        <button
          onClick={() => onRemove(item._id, currentIndex)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/40 text-red-400 text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Remove from wardrobe
        </button>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-6 flex-shrink-0">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/40'
              }`}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-serif font-semibold text-text-primary mb-2">
        Nima is curating your looks
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        Your personalised weekly recommendations will appear here every Monday. Check back soon!
      </p>
    </div>
  );
}

function WardrobeEmptyState({
  onUpload,
}: {
  onUpload: (source: 'single_upload' | 'closet_scan') => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="text-5xl mb-4">🗂️</div>
      <h3 className="font-serif font-semibold text-text-primary mb-2">Your wardrobe is empty</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-6">
        Upload items from your closet so Nima can style them into new outfit combinations.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => onUpload('single_upload')}
          className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Upload an Item
        </button>
        <button
          onClick={() => onUpload('closet_scan')}
          className="py-3 px-6 border border-border rounded-xl font-medium text-sm text-text-primary hover:bg-surface transition-colors"
        >
          Scan My Closet
        </button>
      </div>
    </div>
  );
}
