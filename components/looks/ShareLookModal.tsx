'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Users, MessageSquare, Link2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ShareLookViaDMModal } from './ShareLookViaDMModal';

interface ShareLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookId: Id<'looks'>;
  lookPublicId: string;
  isPublic?: boolean;
  sharedWithFriends?: boolean;
  creatorUserId?: Id<'users'>;
  currentUserId?: Id<'users'>;
}

export function ShareLookModal({
  isOpen,
  onClose,
  lookId,
  lookPublicId,
  isPublic = false,
  sharedWithFriends = false,
  creatorUserId,
  currentUserId,
}: ShareLookModalProps) {
  const isOwner = currentUserId && creatorUserId && currentUserId === creatorUserId;
  const [isSharing, setIsSharing] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);
  
  const shareLookPublicly = useMutation(api.looks.mutations.shareLookPublicly);
  const shareLookWithFriends = useMutation(api.looks.mutations.shareLookWithFriends);
  const unshareLookPublicly = useMutation(api.looks.mutations.unshareLookPublicly);
  const unshareLookWithFriends = useMutation(api.looks.mutations.unshareLookWithFriends);

  const handleSharePublicly = async () => {
    setIsSharing(true);
    try {
      const result = await shareLookPublicly({ lookId });
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to share publicly:', error);
      toast.error('Failed to share look publicly');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareWithFriends = async () => {
    setIsSharing(true);
    try {
      const result = await shareLookWithFriends({ lookId });
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to share with friends:', error);
      toast.error('Failed to share look with friends');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareViaDM = () => {
    setShowDMModal(true);
  };

  const handleUnsharePublicly = async () => {
    setIsSharing(true);
    try {
      const result = await unshareLookPublicly({ lookId });
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to unshare publicly:', error);
      toast.error('Failed to unshare look publicly');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshareWithFriends = async () => {
    setIsSharing(true);
    try {
      const result = await unshareLookWithFriends({ lookId });
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to unshare with friends:', error);
      toast.error('Failed to unshare look with friends');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const currentUserId = creatorUserId;
    const baseUrl = window.location.origin;
    const link = currentUserId
      ? `${baseUrl}/look/${lookPublicId}?sharedBy=${currentUserId}`
      : `${baseUrl}/look/${lookPublicId}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
      onClose();
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="share-look-modal"
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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Modal content */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-serif font-semibold text-foreground">Share Look</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how you want to share this look
                </p>
              </div>

              {/* Share options */}
              <div className="space-y-2">
                {/* Share Publicly / Unshare Publicly - Only show if user owns the look */}
                {isOwner && (
                  <>
                    {isPublic ? (
                  <button
                    onClick={handleUnsharePublicly}
                    disabled={isSharing}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                      bg-primary/10 border-2 border-primary
                      ${isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/20'}
                    `}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Unshare Publicly</p>
                      <p className="text-xs text-muted-foreground">
                        Remove from Explore page
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleSharePublicly}
                    disabled={isSharing}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                      bg-surface border-2 border-border/50 hover:border-primary/30
                      ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
                      <Globe className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Share Publicly</p>
                      <p className="text-xs text-muted-foreground">
                        Make visible to everyone
                      </p>
                    </div>
                  </button>
                )}

                {/* Share with Friends / Unshare with Friends */}
                {sharedWithFriends ? (
                  <button
                    onClick={handleUnshareWithFriends}
                    disabled={isSharing}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                      bg-primary/10 border-2 border-primary
                      ${isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/20'}
                    `}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Unshare with Friends</p>
                      <p className="text-xs text-muted-foreground">
                        Remove from friends&apos; feed
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleShareWithFriends}
                    disabled={isSharing}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                      bg-surface border-2 border-border/50 hover:border-primary/30
                      ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Share with Friends</p>
                      <p className="text-xs text-muted-foreground">
                        Visible to your friends
                      </p>
                    </div>
                  </button>
                    )}
                  </>
                )}

                {/* Share via DM */}
                <button
                  onClick={handleShareViaDM}
                  disabled={isSharing}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                    bg-surface border-2 border-border/50 hover:border-primary/30
                    ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Share via DM</p>
                    <p className="text-xs text-muted-foreground">Send in a direct message</p>
                  </div>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  disabled={isSharing}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                    bg-surface border-2 border-border/50 hover:border-primary/30
                    ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Copy Link</p>
                    <p className="text-xs text-muted-foreground">Share via any platform</p>
                  </div>
                </button>
              </div>

              {isSharing && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Sharing...</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Share via DM Modal */}
      <ShareLookViaDMModal
        isOpen={showDMModal}
        onClose={() => {
          setShowDMModal(false);
          onClose();
        }}
        lookId={lookId}
       
      />
    </>
  );
}

