'use client';

import { motion } from 'framer-motion';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import Image from 'next/image';
import { useState } from 'react';

export function FriendsList() {
  const [removingFriendId, setRemovingFriendId] = useState<Id<'friendships'> | null>(null);
  
  const friends = useQuery(api.friends.queries.getFriends);
  const pendingRequests = useQuery(api.friends.queries.getPendingFriendRequests);
  const removeFriend = useMutation(api.friends.mutations.removeFriend);
  const acceptFriendRequest = useMutation(api.friends.mutations.acceptFriendRequest);
  const declineFriendRequest = useMutation(api.friends.mutations.declineFriendRequest);

  const handleRemoveFriend = async (friendshipId: Id<'friendships'>) => {
    if (removingFriendId) return;
    
    setRemovingFriendId(friendshipId);
    try {
      const result = await removeFriend({ friendshipId });
      if (result.success) {
        toast.success('Friend removed');
      } else {
        toast.error(result.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
      toast.error('Failed to remove friend');
    } finally {
      setRemovingFriendId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: Id<'friendships'>) => {
    try {
      const result = await acceptFriendRequest({ friendshipId });
      if (result.success) {
        toast.success('Friend request accepted!');
      } else {
        toast.error(result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (friendshipId: Id<'friendships'>) => {
    try {
      const result = await declineFriendRequest({ friendshipId });
      if (result.success) {
        toast.success('Friend request declined');
      } else {
        toast.error(result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      toast.error('Failed to decline friend request');
    }
  };

  if (friends === undefined || pendingRequests === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border/50"
              >
                {/* Profile image */}
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden flex-shrink-0">
                  {request.requester.profileImageUrl ? (
                    <Image
                      src={request.requester.profileImageUrl}
                      alt={request.requester.firstName || request.requester.username || 'User'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.requester.firstName || request.requester.username || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground">Wants to be friends</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request._id)}
                    className="px-4 py-2 bg-surface-alt hover:bg-surface border border-border/50 rounded-full text-sm font-medium transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">
          Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No friends yet</p>
            <p className="text-sm text-muted-foreground">
              Add friends to see their shared looks
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friendship) => (
              <motion.div
                key={friendship._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
              >
                {/* Profile image */}
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden flex-shrink-0">
                  {friendship.friend.profileImageUrl ? (
                    <Image
                      src={friendship.friend.profileImageUrl}
                      alt={friendship.friend.firstName || friendship.friend.username || 'Friend'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {friendship.friend.firstName || friendship.friend.username || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground">Friend</p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveFriend(friendship._id)}
                  disabled={removingFriendId === friendship._id}
                  className="p-2 rounded-full hover:bg-surface-alt transition-colors disabled:opacity-50"
                  title="Remove friend"
                >
                  {removingFriendId === friendship._id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <UserMinus className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

