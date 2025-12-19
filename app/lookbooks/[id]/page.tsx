'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Trash2, 
  Globe, 
  Lock,
  Sparkles,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ThemeToggle } from '@/components/theme-toggle';
import { LookbookItemGrid } from '@/components/lookbooks/LookbookItemGrid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function LookbookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lookbookId = params.id as string;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const lookbook = useQuery(
    api.lookbooks.queries.getLookbook,
    lookbookId ? { lookbookId: lookbookId as Id<'lookbooks'> } : 'skip'
  );

  const items = useQuery(
    api.lookbooks.queries.getLookbookItemsWithDetails,
    lookbookId ? { lookbookId: lookbookId as Id<'lookbooks'> } : 'skip'
  );

  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const deleteLookbook = useMutation(api.lookbooks.mutations.deleteLookbook);
  const removeFromLookbook = useMutation(api.lookbooks.mutations.removeFromLookbook);

  const isOwner = currentUser && lookbook && currentUser._id === lookbook.userId;

  // Safe navigation helper
  const safeNavigate = useCallback((path: string) => {
    requestAnimationFrame(() => {
      try {
        router.push(path);
      } catch (error) {
        console.warn('Router navigation failed, using fallback:', error);
        window.location.href = path;
      }
    });
  }, [router]);

  const handleShare = async () => {
    if (!lookbook) return;

    const shareUrl = lookbook.isPublic
      ? `${window.location.origin}/lookbooks/${lookbook._id}`
      : lookbook.shareToken
      ? `${window.location.origin}/lookbooks/${lookbook._id}?token=${lookbook.shareToken}`
      : `${window.location.origin}/lookbooks/${lookbook._id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDelete = async () => {
    if (!lookbookId) return;
    try {
      await deleteLookbook({ lookbookId: lookbookId as Id<'lookbooks'> });
      safeNavigate('/lookbooks');
    } catch (error) {
      console.error('Failed to delete lookbook:', error);
      alert('Failed to delete lookbook. Please try again.');
    }
  };

  const handleRemoveItem = async (lookbookItemId: string) => {
    try {
      await removeFromLookbook({ lookbookItemId: lookbookItemId as Id<'lookbook_items'> });
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  if (!lookbook) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading lookbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/lookbooks"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
            <div className="flex-1 text-center px-4">
              <h1 className="text-sm font-medium text-foreground truncate">{lookbook.name}</h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-surface transition-colors"
                title="Share lookbook"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="p-2 rounded-full hover:bg-surface transition-colors"
                  title="Delete lookbook"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Lookbook info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
                {lookbook.name}
              </h2>
              {lookbook.description && (
                <p className="text-muted-foreground mb-3">{lookbook.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {lookbook.isPublic ? (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Private</span>
                    </>
                  )}
                </div>
                <span>•</span>
                <span>
                  {lookbook.itemCount} {lookbook.itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Items grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {items ? (
            <LookbookItemGrid
              items={items}
              onRemove={isOwner ? handleRemoveItem : undefined}
              canEdit={isOwner || false}
            />
          ) : (
            <div className="text-center py-16">
              <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading items...</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lookbook?</AlertDialogTitle>
            <AlertDialogDescription>
               This will permanently delete &quot;{lookbook.name}&quot; and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
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
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-primary font-medium">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

