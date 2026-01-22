'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

export default function DiscardedLooksPage() {
  const discardedLooks = useQuery(api.looks.queries.getDiscardedLooks, { limit: 50 });
  const restoreLook = useMutation(api.looks.mutations.restoreLook);
  
  const [restoringLookId, setRestoringLookId] = useState<Id<'looks'> | null>(null);

  const handleRestore = async (lookId: Id<'looks'>) => {
    setRestoringLookId(lookId);
    try {
      const result = await restoreLook({ lookId });
      if (result.success) {
        toast.success('Look restored to your lookbooks!');
      } else {
        toast.error(result.error || 'Failed to restore look');
      }
    } catch (error) {
      console.error('Failed to restore look:', error);
      toast.error('Failed to restore look');
    } finally {
      setRestoringLookId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link href="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </Link>

            {/* Page title - center */}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-muted-foreground" />
              Discarded Looks
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Loading state */}
        {discardedLooks === undefined && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading discarded looks...</p>
          </div>
        )}

        {/* Empty state */}
        {discardedLooks && discardedLooks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface-alt flex items-center justify-center">
              <Trash2 className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">
              No Discarded Looks
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              When you discard a look, it will appear here. You can restore it back to your lookbooks anytime.
            </p>
            <Link 
              href="/discover" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create New Looks
            </Link>
          </motion.div>
        )}

        {/* Looks grid */}
        {discardedLooks && discardedLooks.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {discardedLooks.length} discarded look{discardedLooks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="columns-2 md:columns-3 gap-4">
              <AnimatePresence mode="popLayout">
                {discardedLooks.map((lookData, index) => {
                  const imageUrl = lookData.lookImage?.imageUrl;
                  const isRestoring = restoringLookId === lookData.look._id;
                  
                  return (
                    <motion.div
                      key={lookData.look._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="break-inside-avoid mb-4"
                    >
                      <div className="relative group overflow-hidden rounded-2xl bg-surface border border-border/30">
                        {/* Image */}
                        <div className="relative aspect-[3/4] overflow-hidden">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={lookData.look.name || 'Discarded look'}
                              fill
                              className="object-cover"
                              unoptimized={imageUrl.includes('convex.cloud') || imageUrl.includes('convex.site')}
                            />
                          ) : (
                            <div className="w-full h-full bg-surface-alt flex items-center justify-center">
                              <Trash2 className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                          {/* Discarded badge */}
                          <div className="absolute top-3 left-3 px-2 py-1 bg-destructive/80 backdrop-blur-sm rounded-full">
                            <span className="text-xs font-medium text-destructive-foreground">Discarded</span>
                          </div>

                          {/* Price badge */}
                          <div className="absolute top-3 right-3 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full">
                            <span className="text-xs font-medium text-foreground">
                              {lookData.look.currency} {lookData.look.totalPrice.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Footer with restore button */}
                        <div className="p-3 space-y-3">
                          {/* Items preview */}
                          <div className="flex -space-x-2">
                            {lookData.items.slice(0, 4).map((itemData, i) => (
                              <div 
                                key={itemData.item._id} 
                                className="w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-surface-alt"
                                style={{ zIndex: 4 - i }}
                              >
                                {itemData.primaryImageUrl ? (
                                  <Image
                                    src={itemData.primaryImageUrl}
                                    alt={itemData.item.name}
                                    width={32}
                                    height={32}
                                    className="object-cover"
                                    unoptimized={itemData.primaryImageUrl.includes('convex.cloud') || itemData.primaryImageUrl.includes('convex.site')}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                    {itemData.item.category.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            ))}
                            {lookData.items.length > 4 && (
                              <div className="w-8 h-8 rounded-full border-2 border-background bg-surface-alt flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{lookData.items.length - 4}</span>
                              </div>
                            )}
                          </div>

                          {/* Restore button */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRestore(lookData.look._id)}
                            disabled={isRestoring}
                            className={`
                              w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                              font-medium text-sm transition-all duration-200
                              ${isRestoring 
                                ? 'bg-primary/50 text-primary-foreground cursor-not-allowed' 
                                : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                              }
                            `}
                          >
                            {isRestoring ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Restoring...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                <span>Restore Look</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Bottom spacing for mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
}




