'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  ThumbsDown, 
  Bookmark, 
  Share2, 
  Sparkles,
  X,
  Loader2,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import { NimaChatBubble, ProductCard } from '@/components/discover';
import { ShareLookModal } from '@/components/looks/ShareLookModal';
import { FriendRequestPopup } from '@/components/friends/FriendRequestPopup';
import { RecreateLookButton } from '@/components/looks/RecreateLookButton';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id, Doc } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';

// Simple price formatter that displays price as stored in database (no conversion)
function formatPrice(price: number, currency: string = 'KES'): string {
  return `${currency} ${price.toLocaleString()}`;
}

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

// Wrapper component for lookbook option with cover image
function LookbookOption({
  lookbook,
  isSaved,
  onToggle,
  disabled,
}: {
  lookbook: Doc<'lookbooks'>;
  isSaved: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const lookbookWithCover = useQuery(api.lookbooks.queries.getLookbookWithCover, {
    lookbookId: lookbook._id,
  });

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
        ${isSaved
          ? 'bg-primary/10 border-2 border-primary'
          : 'bg-surface border-2 border-border/50 hover:border-primary/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Cover image */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0 relative">
        {lookbookWithCover?.coverImageUrl ? (
          <Image
            src={lookbookWithCover.coverImageUrl}
            alt={lookbook.name}
            fill
            unoptimized={lookbookWithCover.coverImageUrl.includes('convex.cloud') || lookbookWithCover.coverImageUrl.includes('convex.site')}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{lookbook.name}</p>
        <p className="text-xs text-muted-foreground">
          {lookbook.itemCount} {lookbook.itemCount === 1 ? 'look' : 'looks'}
        </p>
      </div>

      {/* Check indicator */}
      {isSaved && (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function LookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lookId = params.id as string;
  const sharedByUserId = searchParams.get('sharedBy');

  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showLookbookModal, setShowLookbookModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFriendRequestPopup, setShowFriendRequestPopup] = useState(false);
  const [newLookbookName, setNewLookbookName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch user's lookbooks
  const userLookbooks = useQuery(api.lookbooks.queries.listUserLookbooks, { includeArchived: false });
  const lookData = useQuery(
    api.looks.queries.getLookWithFullDetails,
    lookId ? { lookId: lookId as Id<'looks'> } : 'skip'
  );
  // Check which lookbooks this look is saved to
  const savedStatus = useQuery(
    api.lookbooks.queries.isItemSaved,
    lookData?.look ? { itemType: 'look' as const, lookId: lookData.look._id } : 'skip'
  );

  // Mutations for lookbook operations
  const addToLookbookMutation = useMutation(api.lookbooks.mutations.addToLookbook);
  const createLookbookMutation = useMutation(api.lookbooks.mutations.createLookbook);

  // Fetch current user
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Fetch share metadata if sharedBy param exists
  const shareMetadata = useQuery(
    api.looks.queries.getLookWithShareMetadataByPublicId,
    lookId && sharedByUserId
      ? {
          publicId: lookId as string,
          sharedByUserId: sharedByUserId as Id<'users'>,
        }
      : 'skip'
  );

  // Show friend request popup if shared by non-friend
  useEffect(() => {
    if (shareMetadata && !shareMetadata.areFriends && sharedByUserId) {
      setShowFriendRequestPopup(true);
    }
  }, [shareMetadata, sharedByUserId]);

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

  // Check if image is being generated
  const isGenerating = lookData?.look?.generationStatus === 'pending' || 
                     lookData?.look?.generationStatus === 'processing';

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

  const handleSaveToLookbook = async (lookbookId: Id<'lookbooks'>) => {
    if (isSaving) return;
    
    const isCurrentlySaved = savedStatus?.lookbookIds.includes(lookbookId);
    
    if (isCurrentlySaved) {
      // Already saved - for now just show a toast that it's already saved
      // Full unsave would require finding the lookbook_item ID and using removeFromLookbook
      toast.info('Already saved to this lookbook');
      return;
    }

    if (!lookData?.look) {
      toast.error('Look data not available');
      return;
    }

    setIsSaving(true);
    try {
      await addToLookbookMutation({
        lookbookId,
        itemType: 'look',
        lookId: lookData.look._id,
      });
      toast.success('Saved to lookbook!');
    } catch (error) {
      console.error('Failed to save to lookbook:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLookbook = async () => {
    if (!newLookbookName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newLookbookId = await createLookbookMutation({
        name: newLookbookName.trim(),
      });
      
      // Auto-add the current look to the new lookbook
      if (lookData?.look) {
      await addToLookbookMutation({
        lookbookId: newLookbookId,
        itemType: 'look',
          lookId: lookData.look._id,
      });
      }
      
      toast.success(`Created "${newLookbookName}" and saved look!`);
      setNewLookbookName('');
    } catch (error) {
      console.error('Failed to create lookbook:', error);
      const message = error instanceof Error ? error.message : 'Failed to create lookbook';
      toast.error(message);
    } finally {
      setIsCreating(false);
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
              onClick={safeGoBack}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            {/* Title */}
            <h1 className="text-lg font-medium text-foreground">Look Details</h1>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MessagesIcon />
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-full hover:bg-surface transition-colors"
              >
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
          <div className="relative w-full aspect-[3/4]">

            {isGenerating ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium text-foreground">Generating your look...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
              </div>
            ) : (
              <Image
                src={lookImageUrl}
                alt={`Look featuring ${look.styleTags.join(', ')}`}
                fill
                unoptimized={true}
                className="object-cover"
              />
            )}

          </div>
          
          {/* Style tags overlay - only show if not generating */}
          {!isGenerating && (
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
          )}
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
              ${savedStatus?.isSaved 
                ? 'bg-primary/10 border-2 border-primary' 
                : 'bg-surface border-2 border-border/50 hover:border-primary/50'
              }
            `}
          >
            <Bookmark className={`w-6 h-6 ${savedStatus?.isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium ${savedStatus?.isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
              {savedStatus?.isSaved ? 'Saved' : 'Save'}
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

        {/* Recreate Look Button */}
        {look.creatorUserId && currentUser && look.creatorUserId !== currentUser._id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-8 flex justify-center"
          >
            <RecreateLookButton
              lookId={look._id}
              creatorUserId={look.creatorUserId}
              currentUserId={currentUser._id}
            />
          </motion.div>
        )}
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
                  {userLookbooks === undefined ? (
                    // Loading state
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : userLookbooks.length === 0 ? (
                    // Empty state
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-alt flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No lookbooks yet. Create one below!
                      </p>
                    </div>
                  ) : (
                    // Lookbook list
                    userLookbooks.map((lookbook) => (
                      <LookbookOption
                        key={lookbook._id}
                        lookbook={lookbook}
                        isSaved={savedStatus?.lookbookIds.includes(lookbook._id) ?? false}
                        onToggle={() => handleSaveToLookbook(lookbook._id)}
                        disabled={isSaving}
                      />
                    ))
                  )}
                </div>

                {/* Create new lookbook */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Create new Lookbook</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLookbookName}
                      onChange={(e) => setNewLookbookName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateLookbook();
                        }
                      }}
                      placeholder="e.g., Summer Vacation"
                      disabled={isCreating}
                      className="flex-1 h-12 px-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <button
                      onClick={handleCreateLookbook}
                      disabled={!newLookbookName.trim() || isCreating}
                      className="h-12 px-4 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {isCreating ? 'Creating...' : 'Create'}
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

      {/* Share Modal */}
      {lookData && (
        <ShareLookModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          lookId={lookData.look._id}
          lookPublicId={lookData.look.publicId}
          isPublic={lookData.look.isPublic ?? false}
          sharedWithFriends={lookData.look.sharedWithFriends ?? false}
          creatorUserId={lookData.look.creatorUserId}
          currentUserId={currentUser?._id}
        />
      )}

      {/* Friend Request Popup */}
      {shareMetadata?.sharedBy && (
        <FriendRequestPopup
          isOpen={showFriendRequestPopup}
          onClose={() => setShowFriendRequestPopup(false)}
          onIgnore={() => {
            // Remove sharedBy param from URL
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('sharedBy');
            const newUrl = newSearchParams.toString() ? `?${newSearchParams.toString()}` : '';
            router.replace(`/look/${lookId}${newUrl}`);
          }}
          sharedBy={shareMetadata.sharedBy}
        />
      )}
    </div>
  );
}
