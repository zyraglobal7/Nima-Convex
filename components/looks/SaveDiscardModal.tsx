'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';

interface SaveDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookId: Id<'looks'>;
  lookImageUrl?: string | null;
  onSaved?: () => void;
  onDiscarded?: () => void;
}

export function SaveDiscardModal({
  isOpen,
  onClose,
  lookId,
  lookImageUrl,
  onSaved,
  onDiscarded,
}: SaveDiscardModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'save' | 'discard' | null>(null);

  const saveLook = useMutation(api.looks.mutations.saveLook);
  const discardLook = useMutation(api.looks.mutations.discardLook);

  const handleSave = async () => {
    setIsProcessing(true);
    setAction('save');
    try {
      const result = await saveLook({ lookId });
      if (result.success) {
        toast.success('Look saved to your lookbooks!');
        onSaved?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to save look');
      }
    } catch (error) {
      console.error('Failed to save look:', error);
      toast.error('Failed to save look');
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleDiscard = async () => {
    setIsProcessing(true);
    setAction('discard');
    try {
      const result = await discardLook({ lookId });
      if (result.success) {
        toast.success('Look discarded. You can restore it from Settings.');
        onDiscarded?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to discard look');
      }
    } catch (error) {
      console.error('Failed to discard look:', error);
      toast.error('Failed to discard look');
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="save-discard-modal"
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
            className="absolute inset-0 bg-black/60"
            onClick={!isProcessing ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6 overflow-hidden"
          >
            {/* Close button */}
            {!isProcessing && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors z-10"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {/* Modal content */}
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-2xl font-serif font-semibold text-foreground">
                  Your Look is Ready!
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Would you like to save this look to your lookbooks?
                </p>
              </div>

              {/* Look Preview */}
              {lookImageUrl && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface-alt mx-auto max-w-[280px]"
                >
                  <Image
                    src={lookImageUrl}
                    alt="Generated look preview"
                    fill
                    className="object-cover"
                  />
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Save Button */}
                <motion.button
                  whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                  whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                  onClick={handleSave}
                  disabled={isProcessing}
                  className={`
                    w-full flex items-center justify-center gap-3 p-4 rounded-xl font-medium
                    transition-all duration-200
                    ${isProcessing && action === 'save'
                      ? 'bg-primary/70 text-primary-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                    }
                    ${isProcessing && action !== 'save' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isProcessing && action === 'save' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      <span>Save to Lookbooks</span>
                    </>
                  )}
                </motion.button>

                {/* Discard Button */}
                <motion.button
                  whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                  whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                  onClick={handleDiscard}
                  disabled={isProcessing}
                  className={`
                    w-full flex items-center justify-center gap-3 p-4 rounded-xl font-medium
                    transition-all duration-200 border-2
                    ${isProcessing && action === 'discard'
                      ? 'bg-destructive/10 border-destructive text-destructive'
                      : 'bg-surface border-border/50 text-foreground hover:border-destructive/50 hover:text-destructive'
                    }
                    ${isProcessing && action !== 'discard' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isProcessing && action === 'discard' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Discarding...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>Discard</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-center text-muted-foreground">
                Discarded looks can be restored from Settings
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}




