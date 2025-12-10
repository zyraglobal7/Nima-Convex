'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Sparkles, ShoppingBag, X, Info, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { LookCarousel, ProductItem, ProductSwapperModal, BuyWithNimaSheet } from '@/components/ask';
import { NimaChatBubble } from '@/components/discover';
import {
  getSearchSessionById,
  getAllProductsInSession,
  type SearchSession,
  type FittingLook,
} from '@/lib/mock-chat-data';
import { formatPrice, mockLookbooks, type Product, type Lookbook } from '@/lib/mock-data';

export default function FittingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SearchSession | null>(null);
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swappingProduct, setSwappingProduct] = useState<Product | null>(null);
  const [showLookbookModal, setShowLookbookModal] = useState(false);
  const [savedToLookbooks, setSavedToLookbooks] = useState<string[]>([]);
  const [newLookbookName, setNewLookbookName] = useState('');
  const [showBuySheet, setShowBuySheet] = useState(false);

  // Load session from sessionStorage or mock data
  useEffect(() => {
    // Try sessionStorage first (for newly generated sessions)
    const storedSession = sessionStorage.getItem(`nima-session-${sessionId}`);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        // Convert date strings back to Date objects
        parsed.createdAt = new Date(parsed.createdAt);
        parsed.looks = parsed.looks.map((look: FittingLook) => ({
          ...look,
          createdAt: new Date(look.createdAt),
        }));
        setSession(parsed);
        return;
      } catch {
        // Fall through to mock data
      }
    }

    // Fall back to mock data
    const mockSession = getSearchSessionById(sessionId);
    if (mockSession) {
      setSession(mockSession);
    }
  }, [sessionId]);

  const currentLook = session?.looks[currentLookIndex];

  // Handlers
  const handleLikeLook = (lookId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        looks: prev.looks.map((look) =>
          look.id === lookId ? { ...look, isLiked: !look.isLiked } : look
        ),
      };
    });
  };

  const handleDislikeLook = (lookId: string) => {
    // Could remove from list or mark as disliked
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        looks: prev.looks.map((look) =>
          look.id === lookId ? { ...look, isLiked: false } : look
        ),
      };
    });
  };

  const handleSaveLook = (lookId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        looks: prev.looks.map((look) =>
          look.id === lookId ? { ...look, isSaved: !look.isSaved } : look
        ),
      };
    });
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
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        looks: prev.looks.map((look, index) => {
          if (index === currentLookIndex) {
            return {
              ...look,
              products: look.products.filter((p) => p.id !== productId),
              totalPrice: look.products
                .filter((p) => p.id !== productId)
                .reduce((sum, p) => sum + p.price, 0),
            };
          }
          return look;
        }),
      };
    });
  };

  const handleSwapConfirm = (newProductId: string) => {
    if (!swappingProduct || !session) return;

    const allProducts = getAllProductsInSession(session);
    const newProduct = allProducts.find((p) => p.id === newProductId);
    if (!newProduct) return;

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        looks: prev.looks.map((look, index) => {
          if (index === currentLookIndex) {
            const newProducts = look.products.map((p) =>
              p.id === swappingProduct.id ? newProduct : p
            );
            return {
              ...look,
              products: newProducts,
              totalPrice: newProducts.reduce((sum, p) => sum + p.price, 0),
            };
          }
          return look;
        }),
      };
    });

    setSwappingProduct(null);
    setShowSwapModal(false);
  };

  const handleSaveToLookbook = (lookbookId: string) => {
    if (savedToLookbooks.includes(lookbookId)) {
      setSavedToLookbooks(savedToLookbooks.filter((id) => id !== lookbookId));
    } else {
      setSavedToLookbooks([...savedToLookbooks, lookbookId]);
    }
  };

  const handleCreateLookbook = () => {
    if (newLookbookName.trim()) {
      const newId = `lookbook-new-${Date.now()}`;
      setSavedToLookbooks([...savedToLookbooks, newId]);
      setNewLookbookName('');
    }
  };

  // Get swappable products (same category, not in current look)
  const getSwappableProducts = (): Product[] => {
    if (!session || !swappingProduct) return [];
    const allProducts = getAllProductsInSession(session);
    const currentProductIds = new Set(currentLook?.products.map((p) => p.id) || []);
    return allProducts.filter(
      (p) => !currentProductIds.has(p.id) && p.category === swappingProduct.category
    );
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your looks...</p>
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
              onClick={() => router.back()}
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
              <button className="p-2 rounded-full hover:bg-surface transition-colors">
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
          looks={session.looks}
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
            onClick={() => setShowBuySheet(true)}
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

      {/* Lookbook Modal */}
      <AnimatePresence>
        {showLookbookModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowLookbookModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            >
              {/* Close button */}
              <button
                onClick={() => setShowLookbookModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Modal content */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif font-semibold text-foreground">Save to Lookbook</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organize your favorite looks into collections
                  </p>
                </div>

                {/* Existing lookbooks */}
                <div className="space-y-3">
                  {mockLookbooks.map((lookbook) => (
                    <button
                      key={lookbook.id}
                      onClick={() => handleSaveToLookbook(lookbook.id)}
                      className={`
                        w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                        ${savedToLookbooks.includes(lookbook.id)
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-surface border-2 border-border/50 hover:border-primary/30'
                        }
                      `}
                    >
                      {/* Cover image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                        {lookbook.coverImageUrl && (
                          <img
                            src={lookbook.coverImageUrl}
                            alt={lookbook.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">{lookbook.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lookbook.lookIds.length} looks
                        </p>
                      </div>

                      {/* Check indicator */}
                      {savedToLookbooks.includes(lookbook.id) && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Create new lookbook */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Create new Lookbook</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLookbookName}
                      onChange={(e) => setNewLookbookName(e.target.value)}
                      placeholder="e.g., Summer Vacation"
                      className="flex-1 h-12 px-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleCreateLookbook}
                      disabled={!newLookbookName.trim()}
                      className="h-12 px-4 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      Create
                    </button>
                  </div>
                </div>

                {/* Done button */}
                <button
                  onClick={() => setShowLookbookModal(false)}
                  className="w-full h-12 bg-surface hover:bg-surface-alt border border-border/50 rounded-full font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

