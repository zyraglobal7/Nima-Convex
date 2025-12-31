'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { ApparelItem } from './ApparelItemCard';
import { formatPrice } from '@/lib/utils/format';

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

  const createLookFromItems = useMutation(api.looks.mutations.createLookFromSelectedItems);

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
      // Navigate to the look page after a brief delay
      setTimeout(() => {
        onClearSelection();
        onClose();
        router.push(`/look/${lookId}`);
      }, 1500);
    } else if (lookStatus?.status === 'failed') {
      setStatus('failed');
      setError(lookStatus.errorMessage || 'Look generation failed');
    } else if (lookStatus?.status === 'processing' || lookStatus?.status === 'pending') {
      setStatus('generating');
    }
  }, [lookStatus, lookId, onClearSelection, onClose, router]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setLookId(null);
      setError(null);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
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
              <h2 className="text-xl font-semibold text-foreground">Create Your Look</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedItems.length} items selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-alt transition-colors"
              disabled={status === 'creating' || status === 'generating'}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
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

              {status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-3 p-4 bg-green-500/10 rounded-xl mb-4"
                >
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600">Look created! Redirecting...</span>
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
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-background">
            <button
              onClick={handleGenerateLook}
              disabled={
                status === 'creating' ||
                status === 'generating' ||
                status === 'completed' ||
                selectedItems.length < 2
              }
              className={`
                w-full py-4 rounded-2xl font-medium text-base transition-all duration-300
                flex items-center justify-center gap-2
                ${
                  status === 'creating' || status === 'generating'
                    ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                    : status === 'completed'
                      ? 'bg-green-600 text-white'
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
              ) : status === 'completed' ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Done!</span>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

