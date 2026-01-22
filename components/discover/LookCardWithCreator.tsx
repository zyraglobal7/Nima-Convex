'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, AlertCircle, UserPlus, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { Look } from '@/lib/mock-data';
import { toast } from 'sonner';

// Extended look type with generation status and creator info
interface LookWithCreator extends Look {
  isGenerating?: boolean;
  generationFailed?: boolean;
  creator?: {
    _id: Id<'users'>;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  } | null;
  isFriend?: boolean;
  hasPendingRequest?: boolean;
  // Interaction data
  loveCount?: number;
  saveCount?: number;
  isLovedByUser?: boolean;
}

interface LookCardWithCreatorProps {
  look: LookWithCreator;
  index: number;
}

const heightClasses = {
  short: 'h-[200px]',
  medium: 'h-[280px]',
  tall: 'h-[340px]',
  'extra-tall': 'h-[400px]',
};

export function LookCardWithCreator({ look, index }: LookCardWithCreatorProps) {
  const hasImage = look.imageUrl && look.imageUrl.length > 0;
  const isGenerating = look.isGenerating || (!hasImage && !look.generationFailed);
  const generationFailed = look.generationFailed;

  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(look.hasPendingRequest || false);
  const [isTogglingLove, setIsTogglingLove] = useState(false);
  const sendFriendRequest = useMutation(api.friends.mutations.sendFriendRequest);
  const toggleLoveMutation = useMutation(api.lookInteractions.mutations.toggleLove);
  
  // Handle love toggle
  const handleToggleLove = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isTogglingLove) return;
    
    setIsTogglingLove(true);
    try {
      await toggleLoveMutation({ lookId: look.id as Id<'looks'> });
    } catch (error) {
      console.error('Failed to toggle love:', error);
      toast.error('Failed to save your reaction');
    } finally {
      setIsTogglingLove(false);
    }
  }, [isTogglingLove, toggleLoveMutation, look.id]);

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!look.creator || look.isFriend || requestSent || isSendingRequest) return;

    setIsSendingRequest(true);
    try {
      await sendFriendRequest({ addresseeId: look.creator._id });
      setRequestSent(true);
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="break-inside-avoid mb-4"
    >
      <div className="group relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Creator info header - Instagram-style */}
        {look.creator && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden relative flex-shrink-0">
                {look.creator.profileImageUrl ? (
                  <Image
                    src={look.creator.profileImageUrl}
                    alt={look.creator.firstName || 'User'}
                    fill
                    sizes="32px"
                    unoptimized={
                      look.creator.profileImageUrl.includes('convex.cloud') ||
                      look.creator.profileImageUrl.includes('convex.site') ||
                      look.creator.profileImageUrl.includes('workoscdn.com')
                    }
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-foreground">
                      {(look.creator.firstName || look.creator.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {look.creator.firstName || look.creator.username || 'User'}
                </p>
                {look.isFriend && (
                  <p className="text-xs text-muted-foreground">Friend</p>
                )}
              </div>
            </div>

            {/* Add Friend button - only show if not already friends */}
            {!look.isFriend && (
              <button
                onClick={handleAddFriend}
                disabled={isSendingRequest || requestSent}
                className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-200
                  ${
                    requestSent
                      ? 'bg-surface-alt text-muted-foreground cursor-default'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }
                `}
              >
                {isSendingRequest ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : requestSent ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Requested</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Image or Generating State */}
        <Link href={`/look/${look.id}`}>
          <div className={`relative ${heightClasses[look.height]} overflow-hidden`}>
            {hasImage ? (
              <>
                <Image
                  src={look.imageUrl}
                  alt={`Look featuring ${look.styleTags.join(', ')}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading={index < 4 ? 'eager' : 'lazy'}
                  priority={index < 2}
                  unoptimized={
                    look.imageUrl.includes('convex.cloud') || 
                    look.imageUrl.includes('convex.site') ||
                    look.imageUrl.includes('workoscdn.com')
                  }
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : isGenerating ? (
              /* Generating State UI */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary"
                  />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Generating look...</p>
              </div>
            ) : generationFailed ? (
              /* Failed State UI */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Generation failed</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tap to retry</p>
              </div>
            ) : (
              /* Fallback - show items preview */
              <div className="w-full h-full bg-gradient-to-br from-surface-alt to-surface flex flex-col items-center justify-center p-4">
                <div className="flex flex-wrap gap-1 justify-center mb-2">
                  {look.products.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="w-12 h-12 rounded-lg bg-surface border border-border/50 overflow-hidden relative"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="48px"
                          unoptimized={
                            product.imageUrl.includes('convex.cloud') ||
                            product.imageUrl.includes('convex.site') ||
                            product.imageUrl.includes('workoscdn.com')
                          }
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          {product.category.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{look.products.length} items</p>
              </div>
            )}

            {/* Quick like button - shows on hover (only when image is ready) */}
            {hasImage && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`absolute top-3 left-3 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 transition-all duration-300 ${
                  look.isLovedByUser ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={handleToggleLove}
                disabled={isTogglingLove}
              >
                {isTogglingLove ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Heart
                    className={`w-4 h-4 ${look.isLovedByUser ? 'fill-destructive text-destructive' : 'text-foreground'}`}
                  />
                )}
              </motion.button>
            )}
            
            {/* Love count badge - shows when has loves */}
            {hasImage && look.loveCount !== undefined && look.loveCount > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium">
                <Heart className="w-3 h-3 fill-destructive text-destructive" />
                <span>{look.loveCount}</span>
              </div>
            )}

            {/* Style tags - shows on hover (only when image is ready) */}
            {hasImage && (
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {look.styleTags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-full text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Card footer - minimal info */}
        <div className="p-3">
          <p className="text-xs text-muted-foreground">
            {look.occasion} • {look.products.length} items
          </p>
        </div>
      </div>
    </motion.div>
  );
}

