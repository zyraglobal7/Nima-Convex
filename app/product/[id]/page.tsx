'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';

type TryOnStatus = 'idle' | 'starting' | 'pending' | 'processing' | 'completed' | 'failed';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as Id<'items'>;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [tryOnStatus, setTryOnStatus] = useState<TryOnStatus>('idle');
  const [tryOnId, setTryOnId] = useState<Id<'item_try_ons'> | null>(null);
  const [showTryOnResult, setShowTryOnResult] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Queries
  const itemData = useQuery(api.items.queries.getItemWithImage, { itemId });
  const itemImages = useQuery(api.items.queries.getItemImages, { itemId });
  const existingTryOn = useQuery(api.itemTryOns.queries.getItemTryOnForUser, { itemId });

  // Mutations
  const startTryOn = useMutation(api.workflows.index.startItemTryOn);
  const quickSave = useMutation(api.lookbooks.mutations.quickSave);
  const addToCart = useMutation(api.cart.mutations.addToCart);

  // Poll for try-on status if we have a tryOnId
  const tryOnResult = useQuery(
    api.itemTryOns.queries.getItemTryOnWithDetails,
    tryOnId ? { itemTryOnId: tryOnId } : 'skip'
  );

  // Check for existing completed try-on
  useEffect(() => {
    if (existingTryOn?.tryOn.status === 'completed' && existingTryOn.imageUrl) {
      setTryOnId(existingTryOn.tryOn._id);
      setTryOnStatus('completed');
    } else if (
      existingTryOn?.tryOn.status === 'pending' ||
      existingTryOn?.tryOn.status === 'processing'
    ) {
      setTryOnId(existingTryOn.tryOn._id);
      setTryOnStatus(existingTryOn.tryOn.status);
    }
  }, [existingTryOn]);

  // Watch for try-on completion
  useEffect(() => {
    if (tryOnResult?.tryOn.status === 'completed' && tryOnResult.imageUrl) {
      setTryOnStatus('completed');
      setShowTryOnResult(true);
    } else if (tryOnResult?.tryOn.status === 'failed') {
      setTryOnStatus('failed');
      toast.error(tryOnResult.tryOn.errorMessage || 'Try-on generation failed');
    } else if (tryOnResult?.tryOn.status === 'processing') {
      setTryOnStatus('processing');
    } else if (tryOnResult?.tryOn.status === 'pending') {
      setTryOnStatus('pending');
    }
  }, [tryOnResult]);

  const images = itemImages?.filter((img) => img.url) || [];
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleTryOn = async () => {
    if (tryOnStatus === 'completed') {
      setShowTryOnResult(true);
      return;
    }

    if (tryOnStatus === 'starting' || tryOnStatus === 'pending' || tryOnStatus === 'processing') {
      return;
    }

    setTryOnStatus('starting');

    try {
      const result = await startTryOn({ itemId });

      if (result.success && result.tryOnId) {
        setTryOnId(result.tryOnId);
        setTryOnStatus('pending');
        toast.success('Generating your try-on...');
      } else {
        setTryOnStatus('failed');
        toast.error(result.error || 'Failed to start try-on');
      }
    } catch (error) {
      setTryOnStatus('failed');
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleFavorite = async () => {
    try {
      await quickSave({
        itemId,
        itemType: 'item',
      });
      setIsLiked(true);
      toast.success('Added to favorites!');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: itemData?.item.name || 'Check out this item',
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      await addToCart({ itemId });
      toast.success('Added to cart!');
      setShowTryOnResult(false);
      router.push('/cart');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (!itemData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { item } = itemData;
  const currentImage = images[currentImageIndex]?.url || itemData.imageUrl;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-surface-alt transition-colors"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-full transition-colors ${
                isLiked ? 'text-destructive' : 'hover:bg-surface-alt'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`}
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Image Carousel */}
        <div className="relative aspect-[3/4] bg-surface">
          <AnimatePresence mode="wait">
            {currentImage && (
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Image
                  src={currentImage}
                  alt={item.name}
                  fill
                  priority
                  unoptimized={
                    currentImage.includes('convex.cloud') || currentImage.includes('convex.site')
                  }
                  className="object-cover"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carousel controls */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full border border-border shadow-lg hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full border border-border shadow-lg hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>

              {/* Image indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-primary w-4'
                        : 'bg-foreground/30 hover:bg-foreground/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 py-6 space-y-6">
          {/* Brand & Name */}
          <div>
            {item.brand && (
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {item.brand}
              </p>
            )}
            <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-foreground">
              {formatPrice(item.price, item.currency)}
            </span>
            {item.originalPrice && item.originalPrice > item.price && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(item.originalPrice, item.currency)}
                </span>
                <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-sm font-medium rounded-full">
                  {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          )}

          {/* Colors */}
          {item.colors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Colors</h3>
              <div className="flex flex-wrap gap-2">
                {item.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-border"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color.toLowerCase() }}
                    />
                    <span className="text-sm text-foreground">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {item.sizes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((size, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-surface rounded-lg border border-border text-sm text-foreground hover:border-primary cursor-pointer transition-colors"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Category & Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full capitalize">
              {item.category}
            </span>
            {item.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-surface text-muted-foreground text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Buy button */}
          {item.sourceUrl && (
            <Link
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-surface hover:bg-surface-alt border border-border rounded-xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">View at {item.sourceStore || 'Store'}</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={handleFavorite}
            disabled={isLiked}
            className={`flex-shrink-0 p-4 rounded-xl border transition-all ${
              isLiked
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-surface border-border hover:border-primary/30'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleTryOn}
            disabled={tryOnStatus === 'starting'}
            className={`
              flex-1 py-4 rounded-xl font-medium text-base transition-all duration-300
              flex items-center justify-center gap-2
              ${
                tryOnStatus === 'completed'
                  ? 'bg-green-600 text-white'
                  : tryOnStatus === 'starting' || tryOnStatus === 'pending' || tryOnStatus === 'processing'
                    ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                    : tryOnStatus === 'failed'
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]'
              }
            `}
          >
            {tryOnStatus === 'starting' || tryOnStatus === 'pending' || tryOnStatus === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : tryOnStatus === 'completed' ? (
              <>
                <Check className="w-5 h-5" />
                <span>View Try-On</span>
              </>
            ) : tryOnStatus === 'failed' ? (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Retry Try-On</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Try On</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Try-On Result Modal */}
      <AnimatePresence>
        {showTryOnResult && tryOnResult?.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowTryOnResult(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full bg-background rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Try-on image */}
              <div className="relative aspect-[3/4]">
                <Image
                  src={tryOnResult.imageUrl}
                  alt={`Try-on of ${item.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              {/* Info bar */}
              <div className="p-4 bg-surface border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price, item.currency)}
                    </p>
                  </div>
                  <button
                    onClick={handleFavorite}
                    className="p-2 rounded-full bg-background hover:bg-surface-alt transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`}
                    />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

