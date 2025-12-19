'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';

interface FriendRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onIgnore: () => void;
  sharedBy: {
    _id: Id<'users'>;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

export function FriendRequestPopup({
  isOpen,
  onClose,
  onIgnore,
  sharedBy,
}: FriendRequestPopupProps) {
  const [isSending, setIsSending] = useState(false);
  const sendFriendRequest = useMutation(api.friends.mutations.sendFriendRequest);

  const displayName = sharedBy.firstName || sharedBy.username || 'Someone';

  const handleAddFriend = async () => {
    setIsSending(true);
    try {
      const result = await sendFriendRequest({ addresseeId: sharedBy._id });
      if (result.success) {
        toast.success(`Friend request sent to ${displayName}!`);
        onClose();
      } else {
        toast.error(result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  };

  const handleIgnore = () => {
    onIgnore();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-background rounded-2xl p-6 shadow-lg"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="text-center space-y-4">
              {/* Profile image */}
              <div className="flex justify-center">
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden">
                  {sharedBy.profileImageUrl ? (
                    <Image
                      src={sharedBy.profileImageUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {displayName} shared this look with you
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add them as a friend to see more of their looks
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleIgnore}
                  disabled={isSending}
                  className="flex-1 h-11 px-4 bg-surface hover:bg-surface-alt border border-border/50 rounded-full font-medium transition-colors disabled:opacity-50"
                >
                  Ignore
                </button>
                <button
                  onClick={handleAddFriend}
                  disabled={isSending}
                  className="flex-1 h-11 px-4 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

