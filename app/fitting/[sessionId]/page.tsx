'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Sparkles, ShoppingBag, Info, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ThemeToggle } from '@/components/theme-toggle';
import { LookCarousel, ProductItem, ProductSwapperModal, BuyWithNimaSheet } from '@/components/ask';
import { NimaChatBubble } from '@/components/discover';
import { ShareLookModal } from '@/components/looks/ShareLookModal';
import { ComingSoonModal } from '@/components/ui/ComingSoonModal';
import { ItemsUnavailableModal } from '@/components/ui/ItemsUnavailableModal';
import { formatPrice } from '@/lib/utils/format';
import { trackPurchaseAttempted, trackItemsUnavailableShown } from '@/lib/analytics';
import type { Product } from '@/lib/mock-data';

// Transform Convex look data to the format expected by components
interface FittingLook {
  id: string;
  publicId: string;
  imageUrl: string;
  userTryOnImageUrl: string;
  products: Product[];
  totalPrice: number;
  currency: string;
  styleTags: string[];
  occasion: string;
  nimaNote: string;
  createdAt: Date;
  height: 'short' | 'medium' | 'tall' | 'extra-tall';
  isLiked: boolean;
  isSaved: boolean;
}

interface FittingSession {
  id: string;
  chatId: string;
  query: string;
  looks: FittingLook[];
  createdAt: Date;
}

// Type for look data from Convex query
type LookData = {
  look: {
    _id: Id<'looks'>;
    _creationTime: number;
    publicId: string;
    totalPrice: number;
    currency: string;
    styleTags: string[];
    occasion?: string;
    nimaComment?: string;
  };
  lookImage: {
    _id: Id<'look_images'>;
    storageId?: Id<'_storage'>;
    imageUrl: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  } | null;
  items: Array<{
    item: {
      _id: Id<'items'>;
      name: string;
      brand?: string;
      category: string;
      price: number;
      currency: string;
      colors: string[];
      sourceUrl?: string;
      sourceStore?: string;
    };
    primaryImageUrl: string | null;
  }>;
} | null;

export default function FittingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Parse lookIds from sessionId (can be comma-separated for multiple looks)
  // Decode URL-encoded characters (e.g., %2C -> ,) before splitting
  const lookIds = useMemo(() => {
    const decodedSessionId = decodeURIComponent(sessionId);
    return decodedSessionId.split(',').filter(Boolean) as Id<'looks'>[];
  }, [sessionId]);

  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swappingProduct, setSwappingProduct] = useState<Product | null>(null);
  const [showBuySheet, setShowBuySheet] = useState(false);
  const [likedLooks, setLikedLooks] = useState<Set<string>>(new Set());
  const [savedLooks, setSavedLooks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showItemsUnavailableModal, setShowItemsUnavailableModal] = useState(false);
  const [unavailableItemsInfo, setUnavailableItemsInfo] = useState<{ unavailable: number; total: number }>({ unavailable: 0, total: 0 });

  // Mutations
  const quickSaveMutation = useMutation(api.lookbooks.mutations.quickSave);

  // Show toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch looks - for now we only support single look or first look from multi
  // TODO: Use getMultipleLooksWithDetails once API types are regenerated
  const firstLookId = lookIds[0];

  // Query saved status for first look (must be after firstLookId is defined)
  const savedStatus = useQuery(
    api.lookbooks.queries.isItemSaved,
    firstLookId ? { itemType: 'look' as const, lookId: firstLookId } : 'skip'
  );

  // Initialize saved state from query
  useEffect(() => {
    if (savedStatus?.isSaved && firstLookId) {
      setSavedLooks((prev) => new Set(prev).add(firstLookId));
    }
  }, [savedStatus?.isSaved, firstLookId]);
  const look1Data = useQuery(
    api.looks.queries.getLookWithFullDetails,
    firstLookId ? { lookId: firstLookId } : 'skip'
  );
  
  // Query additional looks if multiple IDs provided
  const look2Id = lookIds[1];
  const look2Data = useQuery(
    api.looks.queries.getLookWithFullDetails,
    look2Id ? { lookId: look2Id } : 'skip'
  );
  
  const look3Id = lookIds[2];
  const look3Data = useQuery(
    api.looks.queries.getLookWithFullDetails,
    look3Id ? { lookId: look3Id } : 'skip'
  );

  // Combine look data
  const allLookData = useMemo<LookData[]>(() => {
    const results: LookData[] = [];
    if (look1Data) results.push(look1Data as LookData);
    if (look2Data) results.push(look2Data as LookData);
    if (look3Data) results.push(look3Data as LookData);
    return results;
  }, [look1Data, look2Data, look3Data]);

  // Track if any look image is still generating
  const isGenerating = allLookData.some(
    (data) => data?.lookImage?.status === 'pending' || data?.lookImage?.status === 'processing'
  );
  const generationFailed = allLookData.length > 0 && allLookData.every(
    (data) => data?.lookImage?.status === 'failed'
  );

  // Transform Convex data to the format expected by components
  const session = useMemo<FittingSession | null>(() => {
    if (allLookData.length === 0) return null;

    // Transform each look to the expected format
    const looks: FittingLook[] = allLookData
      .filter((lookData): lookData is NonNullable<LookData> => lookData !== null)
      .map((lookData) => {
        // Transform items to products
        const products: Product[] = lookData.items.map((itemData) => ({
          id: itemData.item._id,
          name: itemData.item.name,
          brand: itemData.item.brand || 'Unknown',
          category: itemData.item.category as Product['category'],
          price: itemData.item.price,
          currency: itemData.item.currency,
          imageUrl: itemData.primaryImageUrl || '', // No placeholder - will show generating state
          storeUrl: itemData.item.sourceUrl || '#',
          storeName: itemData.item.sourceStore || itemData.item.brand || 'Store',
          color: itemData.item.colors[0] || 'Mixed',
        }));

        // Use the generated look image, or null if not ready (no placeholder)
        const imageUrl = lookData.lookImage?.imageUrl || null;

        return {
          id: lookData.look._id,
          publicId: lookData.look.publicId,
          imageUrl: imageUrl || '', // Will check isGenerating for UI state
          userTryOnImageUrl: imageUrl || '',
          products,
          totalPrice: lookData.look.totalPrice,
          currency: lookData.look.currency,
          styleTags: lookData.look.styleTags,
          occasion: lookData.look.occasion || 'Everyday',
          nimaNote: lookData.look.nimaComment || "I curated this look just for you! The pieces work beautifully together.",
          createdAt: new Date(lookData.look._creationTime),
          height: 'tall' as const,
          isLiked: likedLooks.has(lookData.look._id),
          isSaved: savedLooks.has(lookData.look._id),
        };
      });

    if (looks.length === 0) return null;

    return {
      id: sessionId,
      chatId: sessionId,
      query: looks.length > 1 ? 'Your personalized looks' : 'Your personalized look',
      looks,
      createdAt: looks[0].createdAt,
    };
  }, [allLookData, sessionId, likedLooks, savedLooks]);

  const currentLook = session?.looks[currentLookIndex];

  // Safe navigation helper
  const safeGoBack = useCallback(() => {
    requestAnimationFrame(() => {
      try {
        router.back();
      } catch (error) {
        console.warn('Router navigation failed, using fallback:', error);
        window.history.back();
      }
    });
  }, [router]);

  // Handlers
  const handleLikeLook = async (lookId: string) => {
    // Like = Save to lookbook
    const isCurrentlyLiked = likedLooks.has(lookId);
    
    // Update local state immediately for UI feedback
    setLikedLooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lookId)) {
        newSet.delete(lookId);
      } else {
        newSet.add(lookId);
      }
      return newSet;
    });

    // If liking (not un-liking), also save to lookbook
    if (!isCurrentlyLiked) {
      try {
        await quickSaveMutation({
          itemType: 'look',
          lookId: lookId as Id<'looks'>,
        });
        setSavedLooks((prev) => new Set(prev).add(lookId));
        showToast('Look saved to your lookbook! ❤️');
      } catch (error) {
        console.error('Failed to save look:', error);
        showToast('Failed to save look', 'error');
        // Revert like state on error
        setLikedLooks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lookId);
          return newSet;
        });
      }
    }
  };

  const handleDislikeLook = (lookId: string) => {
    setLikedLooks((prev) => {
      const newSet = new Set(prev);
      newSet.delete(lookId);
      return newSet;
    });
    
    // Move to next look if available
    if (session && currentLookIndex < session.looks.length - 1) {
      setCurrentLookIndex(currentLookIndex + 1);
      showToast('Got it! Showing next look');
    } else {
      showToast('Thanks for the feedback!');
    }
  };

  const handleSaveLook = async (lookId: string) => {
    const isCurrentlySaved = savedLooks.has(lookId);
    
    // Update local state immediately for UI feedback
    setSavedLooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lookId)) {
        newSet.delete(lookId);
      } else {
        newSet.add(lookId);
      }
      return newSet;
    });

    // Only call mutation when saving (not unsaving for now)
    if (!isCurrentlySaved) {
      try {
        await quickSaveMutation({
          itemType: 'look',
          lookId: lookId as Id<'looks'>,
        });
        showToast('Look saved to your lookbook! 📌');
      } catch (error) {
        console.error('Failed to save look:', error);
        showToast('Failed to save look', 'error');
        // Revert on error
        setSavedLooks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(lookId);
          return newSet;
        });
      }
    } else {
      showToast('Look removed from saved');
    }
  };

  const handleShareLook = () => {
    if (!currentLook) return;
    setShowShareModal(true);
  };

  const handleLikeProduct = (productId: string) => {
    setLikedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSaveProduct = (productId: string) => {
    setSavedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSwapProduct = (productId: string) => {
    const product = currentLook?.products.find((p) => p.id === productId);
    if (product) {
      setSwappingProduct(product);
      setShowSwapModal(true);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    // For now, just log - would need mutation to update look
    console.log('Remove product:', productId);
  };

  // Get swappable products (same category, from other looks)
  const getSwappableProducts = (): Product[] => {
    if (!session || !swappingProduct) return [];
    const currentProductIds = new Set(currentLook?.products.map((p) => p.id) || []);
    const allProducts: Product[] = [];
    
    session.looks.forEach((look) => {
      look.products.forEach((p) => {
        if (!currentProductIds.has(p.id) && p.category === swappingProduct.category) {
          if (!allProducts.some((ap) => ap.id === p.id)) {
            allProducts.push(p);
          }
        }
      });
    });
    
    return allProducts;
  };

  const handleSwapConfirm = (newProductId: string) => {
    // For now, just log - would need mutation to update look
    console.log('Swap product to:', newProductId);
    setSwappingProduct(null);
    setShowSwapModal(false);
  };

  // Handle buy button click
  const handleBuyClick = () => {
    if (!currentLook || !allLookData[currentLookIndex]) return;

    const currentLookData = allLookData[currentLookIndex];
    if (!currentLookData) return;

    // Check if items are unavailable by comparing original itemIds with fetched items
    // Note: The look schema has itemIds but we need to access it from the raw data
    const availableItems = currentLookData.items.length;
    const fetchedProducts = currentLook.products.length;
    
    // For fitting room, we check all looks in the session for unavailable items
    let totalUnavailable = 0;
    let totalItems = 0;
    
    allLookData.forEach((lookData) => {
      if (lookData) {
        // Each lookData.items already filters out inactive items
        // We need to compare with the original look's item count
        // For now, if products array length differs from items array, something is missing
        totalItems += lookData.items.length;
      }
    });

    // Since we don't have direct access to original itemIds from the query response,
    // we check if any look has zero products (which would indicate deleted items)
    const hasEmptyLook = session?.looks.some((look) => look.products.length === 0);
    
    if (hasEmptyLook) {
      // At least one look has no products available
      trackItemsUnavailableShown({
        source: 'fitting_room',
        look_id: currentLook.publicId,
        total_items: 1, // Approximate
        available_items: 0,
        unavailable_count: 1,
      });
      setUnavailableItemsInfo({ unavailable: 1, total: 1 });
      setShowItemsUnavailableModal(true);
    } else {
      // All items available - show coming soon modal
      const totalPrice = session?.looks.reduce((sum, look) => sum + look.totalPrice, 0) || 0;
      const totalItemCount = session?.looks.reduce((sum, look) => sum + look.products.length, 0) || 0;
      
      trackPurchaseAttempted({
        source: 'fitting_room',
        item_count: totalItemCount,
        total_price: totalPrice,
        currency: currentLook.currency,
        session_id: sessionId,
      });
      setShowComingSoonModal(true);
    }
  };

  // Loading state - wait for queries to load
  const isLoading = firstLookId && look1Data === undefined;
    
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your looks...</p>
        </div>
      </div>
    );
  }

  // Look not found state
  if (!session || session.looks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2">Look not found</h2>
          <p className="text-muted-foreground mb-6">
            This look may have been removed or is no longer available.
          </p>
          <Link
            href="/ask"
            className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Ask Nima for a new look
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <button
              onClick={safeGoBack}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-medium text-foreground">Fitting Room</h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button 
                onClick={handleShareLook}
                className="p-2 rounded-full hover:bg-surface transition-colors"
              >
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-40">
        {/* Nima's note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <NimaChatBubble
            message={currentLook?.nimaNote || "Here are some looks I've curated just for you! Swipe through and tap any items you want to swap out."}
            animate={false}
            size="sm"
          />
        </motion.div>

        {/* Look carousel */}
        <LookCarousel
          looks={session.looks.map((look) => ({
            id: look.id,
            imageUrl: look.userTryOnImageUrl,
            styleTags: look.styleTags,
            occasion: look.occasion,
            isLiked: look.isLiked,
            isSaved: look.isSaved,
            isGenerating,
            generationFailed,
          }))}
          currentIndex={currentLookIndex}
          onIndexChange={setCurrentLookIndex}
          onLikeLook={handleLikeLook}
          onDislikeLook={handleDislikeLook}
          onSaveLook={handleSaveLook}
          className="mb-8"
        />

        {/* Price summary */}
        {currentLook && (
          <motion.div
            key={currentLook.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border/30 mb-6"
          >
            <div>
              <p className="text-sm text-muted-foreground">Total for this look</p>
              <p className="text-2xl font-serif font-semibold text-foreground">
                {formatPrice(currentLook.totalPrice, currentLook.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{currentLook.products.length} items</p>
              <p className="text-xs text-muted-foreground">Perfect for {currentLook.occasion}</p>
            </div>
          </motion.div>
        )}

        {/* Products list */}
        {currentLook && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground mb-4">Items in this look</h3>
            {currentLook.products.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                index={index}
                isLiked={likedProducts.has(product.id)}
                isSaved={savedProducts.has(product.id)}
                onLike={handleLikeProduct}
                onSave={handleSaveProduct}
                onSwap={handleSwapProduct}
                onRemove={currentLook.products.length > 1 ? handleRemoveProduct : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4 z-40">
        <div className="max-w-3xl mx-auto">
          {/* Buy With Nima CTA */}
          <button
            onClick={handleBuyClick}
            className="w-full h-auto py-4 px-6 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary text-primary-foreground rounded-2xl font-medium transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Buy With Nima</p>
                  <p className="text-xs opacity-80 font-normal">We buy & deliver everything to you</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">From</p>
                <p className="font-semibold">{currentLook && formatPrice(currentLook.totalPrice, currentLook.currency)}</p>
              </div>
            </div>
          </button>
          
          {/* Info text */}
          <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Skip multiple checkouts. Nima handles it all.
          </p>
        </div>
      </div>

      {/* Buy With Nima Sheet */}
      <BuyWithNimaSheet
        isOpen={showBuySheet}
        onClose={() => setShowBuySheet(false)}
        looks={session.looks}
        currency={currentLook?.currency}
      />

      {/* Product Swapper Modal */}
      <ProductSwapperModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwappingProduct(null);
        }}
        currentProduct={swappingProduct}
        alternatives={getSwappableProducts()}
        onSwap={handleSwapConfirm}
      />

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-30">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
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
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`
              flex items-center gap-2 px-4 py-3 rounded-full shadow-lg backdrop-blur-md
              ${toast.type === 'success' 
                ? 'bg-surface border border-border/50 text-foreground' 
                : 'bg-destructive/90 text-white'
              }
            `}>
              {toast.type === 'success' ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Look Modal */}
      {currentLook && (
        <ShareLookModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          lookId={currentLook.id as Id<'looks'>}
          lookPublicId={currentLook.publicId}
        />
      )}

      {/* Coming Soon Modal */}
      <ComingSoonModal
        open={showComingSoonModal}
        onClose={() => setShowComingSoonModal(false)}
      />

      {/* Items Unavailable Modal */}
      <ItemsUnavailableModal
        open={showItemsUnavailableModal}
        onClose={() => setShowItemsUnavailableModal(false)}
        onGoBack={safeGoBack}
        unavailableCount={unavailableItemsInfo.unavailable}
        totalCount={unavailableItemsInfo.total}
      />
    </div>
  );
}
