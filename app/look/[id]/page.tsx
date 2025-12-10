'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  ThumbsDown, 
  Bookmark, 
  Share2, 
  Sparkles,
  X,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { NimaChatBubble, ProductCard } from '@/components/discover';
import { formatPrice, mockLookbooks } from '@/lib/mock-data';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

// Transform product data for ProductCard component
interface TransformedProduct {
  id: string;
  name: string;
  brand: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  price: number;
  currency: string;
  imageUrl: string;
  storeUrl: string;
  storeName: string;
  color: string;
}

export default function LookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lookId = params.id as string;

  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showLookbookModal, setShowLookbookModal] = useState(false);
  const [savedToLookbooks, setSavedToLookbooks] = useState<string[]>([]);
  const [newLookbookName, setNewLookbookName] = useState('');

  // Fetch look data from Convex
  const lookData = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookId ? { lookId: lookId as Id<'looks'> } : 'skip'
  );

  // Transform items to products format
  const products: TransformedProduct[] = useMemo(() => {
    if (!lookData?.items) return [];
    
    return lookData.items.map((itemData) => {
      // Map category to expected type
      const categoryMap: Record<string, TransformedProduct['category']> = {
        top: 'top',
        bottom: 'bottom',
        shoes: 'shoes',
        accessory: 'accessory',
        outerwear: 'outerwear',
        dress: 'top', // Map dress to top for compatibility
        bag: 'accessory',
        jewelry: 'accessory',
      };

      return {
        id: itemData.item._id,
        name: itemData.item.name,
        brand: itemData.item.brand || 'Unknown Brand',
        category: categoryMap[itemData.item.category] || 'accessory',
        price: itemData.item.price,
        currency: itemData.item.currency,
        imageUrl: itemData.primaryImageUrl || 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&h=500&fit=crop',
        storeUrl: itemData.item.sourceUrl || '#',
        storeName: itemData.item.sourceStore || itemData.item.brand || 'Store',
        color: itemData.item.colors[0] || 'Mixed',
      };
    });
  }, [lookData?.items]);

  // Get the look image URL
  const lookImageUrl = useMemo(() => {
    if (lookData?.lookImage?.imageUrl) {
      return lookData.lookImage.imageUrl;
    }
    // Fallback to first item's image if no look image
    if (products.length > 0) {
      return products[0].imageUrl;
    }
    return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop';
  }, [lookData?.lookImage?.imageUrl, products]);

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
    } else {
      setIsLiked(true);
      setIsDisliked(false);
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      setIsLiked(false);
    }
  };

  const handleSaveToLookbook = (lookbookId: string) => {
    if (savedToLookbooks.includes(lookbookId)) {
      setSavedToLookbooks(savedToLookbooks.filter(id => id !== lookbookId));
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

  // Loading state
  if (lookData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading look...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (lookData === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">Look not found</p>
          <p className="text-muted-foreground mb-4">This look may have been removed or doesn&apos;t exist.</p>
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

  const { look } = lookData;

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
            <h1 className="text-lg font-medium text-foreground">Look Details</h1>

            {/* Actions */}
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
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden mb-6 bg-surface"
        >
          <img
            src={lookImageUrl}
            alt={`Look featuring ${look.styleTags.join(', ')}`}
            className="w-full aspect-[3/4] object-cover"
          />
          
          {/* Style tags overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
            {look.styleTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-full text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          {/* Dislike */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDislike}
            className={`
              flex flex-col items-center gap-1 p-4 rounded-2xl transition-all duration-200
              ${isDisliked 
                ? 'bg-destructive/10 border-2 border-destructive' 
                : 'bg-surface border-2 border-border/50 hover:border-destructive/50'
              }
            `}
          >
            <ThumbsDown className={`w-6 h-6 ${isDisliked ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium ${isDisliked ? 'text-destructive' : 'text-muted-foreground'}`}>
              Not for me
            </span>
          </motion.button>

          {/* Like */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`
              flex flex-col items-center gap-1 p-4 rounded-2xl transition-all duration-200
              ${isLiked 
                ? 'bg-destructive/10 border-2 border-destructive' 
                : 'bg-surface border-2 border-border/50 hover:border-destructive/50'
              }
            `}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}>
              Love it
            </span>
          </motion.button>

          {/* Save to lookbook */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLookbookModal(true)}
            className={`
              flex flex-col items-center gap-1 p-4 rounded-2xl transition-all duration-200
              ${savedToLookbooks.length > 0 
                ? 'bg-primary/10 border-2 border-primary' 
                : 'bg-surface border-2 border-border/50 hover:border-primary/50'
              }
            `}
          >
            <Bookmark className={`w-6 h-6 ${savedToLookbooks.length > 0 ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium ${savedToLookbooks.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              Save
            </span>
          </motion.button>
        </motion.div>

        {/* Nima's styling note */}
        {look.nimaComment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8"
          >
            <NimaChatBubble
              message={look.nimaComment}
              animate={true}
              size="md"
            />
          </motion.div>
        )}

        {/* Price summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border/30 mb-6"
        >
          <div>
            <p className="text-sm text-muted-foreground">Total for this look</p>
            <p className="text-2xl font-serif font-semibold text-foreground">
              {formatPrice(look.totalPrice, look.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{products.length} items</p>
            <p className="text-xs text-muted-foreground">
              {look.occasion ? `Perfect for ${look.occasion}` : 'Curated for you'}
            </p>
          </div>
        </motion.div>

        {/* Products list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-medium text-foreground mb-4">Shop this look</h3>
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </motion.div>
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <button className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium text-base transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Buy all {products.length} items • {formatPrice(look.totalPrice, look.currency)}
          </button>
        </div>
      </div>

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
