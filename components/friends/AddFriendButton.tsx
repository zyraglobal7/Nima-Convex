'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import Image from 'next/image';
import { UserFriendStatus } from './UserFriendStatus';

export function AddFriendButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState<Id<'users'> | null>(null);

  const sendFriendRequest = useMutation(api.friends.mutations.sendFriendRequest);
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  
  // Search users by username or email
  const searchUsers = useQuery(
    api.users.queries.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery } : 'skip'
  );

  const handleSendRequest = async (userId: Id<'users'>) => {
    if (isSending) return;
    
    setIsSending(userId);
    try {
      const result = await sendFriendRequest({ addresseeId: userId });
      if (result.success) {
        toast.success('Friend request sent!');
        setSearchQuery('');
        setIsOpen(false);
      } else {
        toast.error(result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setIsSending(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary-hover transition-colors text-xs sm:text-base"
      >
        <UserPlus className="w-4 h-4" />
        Add Friend
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-background rounded-t-3xl sm:rounded-2xl p-6 max-h-[80vh] flex flex-col"
            >
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Header */}
              <div className="mb-4">
                <h3 className="text-xl font-serif font-semibold text-foreground">Add Friend</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Search for users by email
                </p>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Type at least 2 characters to search</p>
                  </div>
                ) : searchUsers === undefined ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchUsers
                      .filter((user) => user._id !== currentUser?._id) // Exclude current user
                      .map((user) => (
                        <motion.div
                          key={user._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-3 rounded-xl bg-surface border border-border/50 hover:border-primary/30 transition-colors"
                        >
                          {/* Profile image */}
                          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden flex-shrink-0">
                            {user.profileImageUrl ? (
                              <Image
                                src={user.profileImageUrl}
                                alt={user.firstName || user.username || 'User'}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-primary-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {user.firstName || user.username || user.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.username || user.email}
                            </p>
                          </div>

                          {/* Friend status button */}
                          <UserFriendStatus
                            userId={user._id}
                            onSendRequest={() => handleSendRequest(user._id)}
                            isSending={isSending === user._id}
                          />
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

