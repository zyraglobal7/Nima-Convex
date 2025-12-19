'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Loader2, Users } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import Image from 'next/image';

interface ShareLookViaDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookId: Id<'looks'>;

}

export function ShareLookViaDMModal({
  isOpen,
  onClose,
  lookId,

}: ShareLookViaDMModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<Id<'users'> | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendDirectMessage = useMutation(api.directMessages.mutations.sendDirectMessage);
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  
  // Get friends list
  const friends = useQuery(api.friends.queries.getFriends);
  
  // Search users
  const searchUsers = useQuery(
    api.users.queries.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery } : 'skip'
  );

  const handleSend = async (userId: Id<'users'>) => {
    if (isSending) return;
    
    setIsSending(true);
    try {
      const result = await sendDirectMessage({ recipientId: userId, lookId });
      if (result.success) {
        toast.success('Look shared!');
        onClose();
        setSearchQuery('');
        setSelectedUserId(null);
      } else {
        toast.error(result.error || 'Failed to share look');
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      toast.error('Failed to share look');
    } finally {
      setIsSending(false);
    }
  };

  // Combine friends and search results
  const displayUsers = searchQuery.length >= 2 && searchUsers
    ? searchUsers.filter((user) => user._id !== currentUser?._id)
    : friends?.map((friendship) => ({
        _id: friendship.friend._id,
        firstName: friendship.friend.firstName,
        lastName: undefined, // Friends query doesn't return lastName
        username: friendship.friend.username,
        email: '', // Friends query doesn't return email
        profileImageUrl: friendship.friend.profileImageUrl,
        _creationTime: 0,
      })) || [];

  return (
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
            onClick={onClose}
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
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-serif font-semibold text-foreground">Share via DM</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a friend or search for a user
              </p>
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by email or username..."
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface border border-border/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.length < 2 && (!friends || friends.length === 0) ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No friends yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Search for users to share with
                  </p>
                </div>
              ) : searchQuery.length >= 2 && searchUsers === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : displayUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchQuery.length < 2 && friends && friends.length > 0 && (
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                      Friends
                    </div>
                  )}
                  {displayUsers.map((user) => (
                    <motion.button
                      key={user._id}
                      onClick={() => handleSend(user._id)}
                      disabled={isSending}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface border border-border/50 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username || user.email}
                        </p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        )}
                      </div>
                      {isSending && selectedUserId === user._id && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

