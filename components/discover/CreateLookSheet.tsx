'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Check, AlertCircle, Share2, Globe, Users, Link as LinkIcon, ExternalLink, Heart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { ApparelItem } from './ApparelItemCard';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';

interface CreateLookSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ApparelItem[];
  onClearSelection: () => void;
}

type GenerationStatus = 'idle' | 'creating' | 'generating' | 'completed' | 'failed';

export function CreateLookSheet({
  isOpen,
  onClose,
  selectedItems,
  onClearSelection,
}: CreateLookSheetProps) {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [lookId, setLookId] = useState<Id<'looks'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [sharingOption, setSharingOption] = useState<'private' | 'friends' | 'public'>('private');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const createLookFromItems = useMutation(api.looks.mutations.createLookFromSelectedItems);
  const updateLookVisibility = useMutation(api.looks.mutations.updateLookVisibility);
  const saveLookMutation = useMutation(api.looks.mutations.saveLook);
  const discardLookMutation = useMutation(api.looks.mutations.discardLook);

  // Poll for look status when we have a lookId
  const lookStatus = useQuery(
    api.looks.queries.getLookGenerationStatus,
    lookId ? { lookId } : 'skip'
  );

  // Calculate total price
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const currency = selectedItems[0]?.currency || 'USD';

  // Watch for look completion
  useEffect(() => {
    if (lookStatus?.status === 'completed' && lookId) {
      setStatus('completed');
      if (lookStatus.imageUrl) {
        setGeneratedImageUrl(lookStatus.imageUrl);
      }
    } else if (lookStatus?.status === 'failed') {
      setStatus('failed');
      setError(lookStatus.errorMessage || 'Look generation failed');
    } else if (lookStatus?.status === 'processing' || lookStatus?.status === 'pending') {
      setStatus('generating');
    }
  }, [lookStatus, lookId]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setLookId(null);
      setError(null);
      setGeneratedImageUrl(null);
      setSharingOption('private');
      setIsSaved(false);
      setIsSaving(false);
      setIsDiscarding(false);
    }
  }, [isOpen]);

  const handleSaveLook = async () => {
    if (!lookId) return;
    
    setIsSaving(true);
    try {
      const result = await saveLookMutation({ lookId });
      if (result.success) {
        setIsSaved(true);
        toast.success('Look saved to your lookbooks!');
      } else {
        toast.error(result.error || 'Failed to save look');
      }
    } catch (err) {
      toast.error('Failed to save look');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardLook = async () => {
    if (!lookId) return;
    
    setIsDiscarding(true);
    try {
      const result = await discardLookMutation({ lookId });
      if (result.success) {
        toast.success('Look discarded. You can restore it from Settings.');
        onClearSelection();
        onClose();
      } else {
        toast.error(result.error || 'Failed to discard look');
      }
    } catch (err) {
      toast.error('Failed to discard look');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleGenerateLook = async () => {
    if (selectedItems.length < 2 || selectedItems.length > 6) {
      setError('Please select 2-6 items to create a look');
      return;
    }

    setStatus('creating');
    setError(null);

    try {
      const result = await createLookFromItems({
        itemIds: selectedItems.map((item) => item._id),
      });

      if (result.success && result.lookId) {
        setLookId(result.lookId);
        setStatus('generating');
      } else {
        setStatus('failed');
        setError(result.error || 'Failed to create look');
      }
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleShare = async (option: 'private' | 'friends' | 'public') => {
    if (!lookId) return;
    
    setSharingOption(option);
    
    try {
      await updateLookVisibility({
        lookId,
        isPublic: option === 'public',
        sharedWithFriends: option === 'friends' || option === 'public',
      });
      toast.success(
        option === 'public' 
          ? 'Look shared publicly!' 
          : option === 'friends'
          ? 'Look shared with friends!'
          : 'Look set to private'
      );
    } catch (err) {
      toast.error('Failed to update sharing settings');
    }
  };

  const handleCopyLink = async () => {
    if (!lookId) return;
    
    const url = `${window.location.origin}/look/${lookId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleViewLook = () => {
    onClearSelection();
    onClose();
    if (lookId) {
      router.push(`/look/${lookId}`);
    }
  };

  const handleGoToMyLooks = () => {
    onClearSelection();
    onClose();
    router.push('/profile?tab=my-looks&filter=user');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={status !== 'completed' ? onClose : undefined}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {status === 'completed' ? 'Your Look is Ready! ✨' : 'Create Your Look'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {status === 'completed' 
                  ? 'Share it with the world or keep it private'
                  : `${selectedItems.length} items selected`
                }
              </p>
            </div>
            <button
              onClick={() => {
                if (status === 'completed') {
                  onClearSelection();
                }
                onClose();
              }}
              className="p-2 rounded-full hover:bg-surface-alt transition-colors"
              disabled={status === 'creating' || status === 'generating'}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Completed state - show generated image and save/discard/share options */}
            {status === 'completed' && generatedImageUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Generated look image */}
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border">
                  <Image
                    src={generatedImageUrl}
                    alt="Your generated look"
                    fill
                    unoptimized={
                      generatedImageUrl.includes('convex.cloud') ||
                      generatedImageUrl.includes('convex.site')
                    }
                    className="object-cover"
                  />
                  {/* Success/Saved overlay */}
                  <div className={`absolute top-3 right-3 px-3 py-1.5 ${isSaved ? 'bg-primary/90' : 'bg-green-500/90'} backdrop-blur-sm rounded-full flex items-center gap-1.5`}>
                    {isSaved ? (
                      <>
                        <Heart className="w-4 h-4 text-white fill-white" />
                        <span className="text-sm font-medium text-white">Saved!</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">Generated!</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Save/Discard options - shown before saving */}
                {!isSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="text-center mb-2">
                      <h3 className="font-medium text-foreground">What would you like to do?</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Save this look to your lookbooks or discard it
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleSaveLook}
                        disabled={isSaving || isDiscarding}
                        className={`
                          py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                          ${isSaving 
                            ? 'bg-primary/70 text-primary-foreground cursor-not-allowed' 
                            : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                          }
                        `}
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Heart className="w-5 h-5" />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        onClick={handleDiscardLook}
                        disabled={isSaving || isDiscarding}
                        className={`
                          py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                          border-2
                          ${isDiscarding 
                            ? 'border-destructive bg-destructive/10 text-destructive cursor-not-allowed' 
                            : 'border-border text-foreground hover:border-destructive/50 hover:text-destructive'
                          }
                        `}
                      >
                        {isDiscarding ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                        <span>{isDiscarding ? 'Discarding...' : 'Discard'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Share options - shown after saving */}
                {isSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-5 h-5 text-primary" />
                      <h3 className="font-medium text-foreground">Share Your Look</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleShare('private')}
                        className={`
                          p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5
                          ${sharingOption === 'private'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <span className="text-xl">🔒</span>
                        <span className="text-xs font-medium text-foreground">Private</span>
                      </button>
                      <button
                        onClick={() => handleShare('friends')}
                        className={`
                          p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5
                          ${sharingOption === 'friends'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Friends</span>
                      </button>
                      <button
                        onClick={() => handleShare('public')}
                        className={`
                          p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5
                          ${sharingOption === 'public'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">Public</span>
                      </button>
                    </div>

                    {/* Copy link button */}
                    <button
                      onClick={handleCopyLink}
                      className="w-full py-3 px-4 rounded-xl border border-border hover:bg-surface-alt transition-colors flex items-center justify-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Copy Link</span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <>
                {/* Selected items grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {selectedItems.map((item) => (
                    <div
                      key={item._id}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border"
                    >
                      {item.primaryImageUrl ? (
                        <Image
                          src={item.primaryImageUrl}
                          alt={item.name}
                          fill
                          unoptimized={
                            item.primaryImageUrl.includes('convex.cloud') ||
                            item.primaryImageUrl.includes('convex.site')
                          }
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-alt flex items-center justify-center">
                          <span className="text-2xl text-muted-foreground/40">
                            {item.category.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white truncate">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price summary */}
                <div className="flex items-center justify-between p-4 bg-surface rounded-xl mb-4">
                  <span className="text-sm text-muted-foreground">Total price</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatPrice(totalPrice, currency)}
                  </span>
                </div>

                {/* Status messages */}
                <AnimatePresence mode="wait">
                  {status === 'creating' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-3 p-4 bg-surface rounded-xl mb-4"
                    >
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Creating your look...</span>
                    </motion.div>
                  )}

                  {status === 'generating' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-3 p-4 bg-primary/10 rounded-xl mb-4"
                    >
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                      <span className="text-sm text-primary">
                        Nima is styling your look... This may take a moment
                      </span>
                    </motion.div>
                  )}

                  {status === 'failed' && error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl mb-4"
                    >
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-background">
            {status === 'completed' && isSaved ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onClearSelection();
                    onClose();
                    router.push('/lookbooks');
                  }}
                  className="flex-1 py-4 rounded-2xl font-medium text-base transition-all bg-surface border border-border text-foreground hover:bg-surface-alt flex items-center justify-center gap-2"
                >
                  Go to Lookbooks
                </button>
                <button
                  onClick={handleViewLook}
                  className="flex-1 py-4 rounded-2xl font-medium text-base transition-all bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Look
                </button>
              </div>
            ) : status === 'completed' && !isSaved ? (
              <p className="text-center text-xs text-muted-foreground">
                Save or discard your look to continue
              </p>
            ) : (
              <>
                <button
                  onClick={handleGenerateLook}
                  disabled={
                    status === 'creating' ||
                    status === 'generating' ||
                    selectedItems.length < 2
                  }
                  className={`
                    w-full py-4 rounded-2xl font-medium text-base transition-all duration-300
                    flex items-center justify-center gap-2
                    ${
                      status === 'creating' || status === 'generating'
                        ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                        : status === 'failed'
                          ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                          : 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]'
                    }
                  `}
                >
                  {status === 'creating' || status === 'generating' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : status === 'failed' ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Try Again</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Look</span>
                    </>
                  )}
                </button>

                {selectedItems.length < 2 && (
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Select at least 2 items to create a look
                  </p>
                )}

                {selectedItems.length > 6 && (
                  <p className="text-center text-xs text-destructive mt-2">
                    Maximum 6 items per look
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
