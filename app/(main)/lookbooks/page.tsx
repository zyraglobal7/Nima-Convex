'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Heart, FolderOpen, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LookbookCard } from '@/components/lookbooks/LookbookCard';
import { CreateLookbookModal } from '@/components/lookbooks/CreateLookbookModal';
import { LookCard } from '@/components/discover';
import { ApparelItemCard, type ApparelItem } from '@/components/discover/ApparelItemCard';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import type { Look, Product } from '@/lib/mock-data';

// Extended Look type with generation status
interface LookWithStatus extends Look {
  isGenerating: boolean;
  generationFailed: boolean;
}

// Wrapper component that fetches cover image and item previews
function LookbookCardWithCover({ lookbook, index }: { lookbook: Doc<'lookbooks'>; index: number }) {
  const lookbookWithCover = useQuery(api.lookbooks.queries.getLookbookWithCover, {
    lookbookId: lookbook._id,
  });

  return (
    <LookbookCard
      lookbook={lookbook}
      coverImageUrl={lookbookWithCover?.coverImageUrl || null}
      itemImageUrls={lookbookWithCover?.itemImageUrls || []}
      index={index}
    />
  );
}

type TabType = 'saved-looks' | 'liked-items' | 'lookbooks';

export default function LookbooksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('saved-looks');

  const lookbooks = useQuery(api.lookbooks.queries.listUserLookbooks, { includeArchived: false });
  const savedLooksData = useQuery(api.looks.queries.getSavedLooks, { limit: 50 });

  // Query for liked items
  const likedItemsData = useQuery(api.items.likes.getLikedItems, { limit: 50 });
  const toggleLikeMutation = useMutation(api.items.likes.toggleLike);

  // Handle toggling item likes
  const handleToggleLike = useCallback(
    async (itemId: Id<'items'>) => {
      await toggleLikeMutation({ itemId });
    },
    [toggleLikeMutation],
  );

  // Transform liked items to ApparelItem format
  const likedItems: ApparelItem[] =
    likedItemsData?.map((item) => ({
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
    })) ?? [];

  // Transform saved looks data to LookWithStatus format
  const [savedLooks, setSavedLooks] = useState<LookWithStatus[]>([]);

  useEffect(() => {
    if (savedLooksData) {
      const heights: Array<'short' | 'medium' | 'tall' | 'extra-tall'> = ['medium', 'tall', 'short', 'extra-tall'];

      const transformedLooks: LookWithStatus[] = savedLooksData.map((lookData, index) => {
        const products: Product[] = lookData.items.map((itemData) => ({
          id: itemData.item._id,
          name: itemData.item.name,
          brand: itemData.item.brand || 'Unknown',
          category: itemData.item.category as Product['category'],
          price: itemData.item.price,
          currency: itemData.item.currency,
          imageUrl: itemData.primaryImageUrl || '',
          storeUrl: '#',
          storeName: itemData.item.brand || 'Store',
          color: itemData.item.colors[0] || 'Mixed',
        }));

        const imageUrl = lookData.lookImage?.imageUrl || '';
        const isGenerating =
          lookData.lookImage?.status === 'pending' ||
          lookData.lookImage?.status === 'processing' ||
          lookData.look.generationStatus === 'pending' ||
          lookData.look.generationStatus === 'processing';

        const generationFailed = lookData.lookImage?.status === 'failed' || lookData.look.generationStatus === 'failed';

        return {
          id: lookData.look._id,
          imageUrl,
          products,
          totalPrice: lookData.look.totalPrice,
          currency: lookData.look.currency,
          styleTags: lookData.look.styleTags,
          occasion: lookData.look.occasion || 'Everyday',
          nimaNote: lookData.look.nimaComment || 'A look curated just for you!',
          createdAt: new Date(lookData.look._creationTime),
          height: heights[index % heights.length],
          isLiked: false,
          isDisliked: false,
          isGenerating,
          generationFailed,
        };
      });
      setSavedLooks(transformedLooks);
    } else {
      setSavedLooks([]);
    }
  }, [savedLooksData]);

  const savedLooksCount = savedLooks.length;
  const likedItemsCount = likedItems.length;
  const lookbooksCount = lookbooks?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header removed - replaced by global Navigation */}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab switcher */}
        <div className="flex justify-center mb-6">
          <div className="relative bg-surface-alt rounded-full p-1 flex">
            {/* Sliding background */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-primary rounded-full"
              initial={false}
              animate={{
                x:
                  activeTab === 'saved-looks'
                    ? 0
                    : activeTab === 'liked-items'
                      ? 'calc(100% + 4px)'
                      : 'calc(200% + 8px)',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />

            {/* Buttons */}
            <button
              onClick={() => setActiveTab('saved-looks')}
              className={`
                relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${activeTab === 'saved-looks' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Looks</span>
              <span className="sm:hidden">Looks</span>
              <span
                className={`text-xs ${activeTab === 'saved-looks' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
              >
                ({savedLooksCount})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('liked-items')}
              className={`
                relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${activeTab === 'liked-items' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Liked Items</span>
              <span className="sm:hidden">Items</span>
              <span
                className={`text-xs ${activeTab === 'liked-items' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
              >
                ({likedItemsCount})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('lookbooks')}
              className={`
                relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${activeTab === 'lookbooks' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <FolderOpen className="w-4 h-4" />
              Lookbooks
              <span
                className={`text-xs ${activeTab === 'lookbooks' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
              >
                ({lookbooksCount})
              </span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'saved-looks' ? (
            <motion.div
              key="saved-looks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Saved Looks Grid */}
              {savedLooks.length > 0 ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                  {savedLooks.map((look, index) => (
                    <LookCard key={look.id} look={look} index={index} />
                  ))}
                </div>
              ) : savedLooksData && savedLooksData.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No saved looks yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    When you save looks from your virtual try-ons, they will appear here.
                  </p>
                  <Link
                    href="/discover"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Start Creating Looks
                  </Link>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Loading saved looks...</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'liked-items' ? (
            <motion.div
              key="liked-items"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Liked Items Grid */}
              {likedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {likedItems.map((item, index) => (
                    <ApparelItemCard
                      key={item._id}
                      item={item}
                      index={index}
                      isLiked={true}
                      onToggleLike={handleToggleLike}
                    />
                  ))}
                </div>
              ) : likedItemsData && likedItemsData.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No liked items yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Items you like from the Apparel section will appear here.
                  </p>
                  <Link
                    href="/discover?tab=apparel"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Browse Apparel
                  </Link>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Loading liked items...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="lookbooks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header section for lookbooks */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-serif text-foreground">Your Lookbooks</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Organize your looks into collections</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>

              {/* Lookbooks grid */}
              {lookbooks && lookbooks.length > 0 ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                  {lookbooks.map((lookbook, index) => (
                    <LookbookCardWithCover key={lookbook._id} lookbook={lookbook} index={index} />
                  ))}
                </div>
              ) : lookbooks && lookbooks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No lookbooks yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Create lookbooks to organize and save your favorite looks into collections.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Lookbook
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Loading lookbooks...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Lookbook Modal */}
      <CreateLookbookModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Mobile Nav removed - replaced by global Navigation */}
    </div>
  );
}
