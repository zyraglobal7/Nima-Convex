'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { UserPlus, Loader2, Check } from 'lucide-react';

interface UserFriendStatusProps {
  userId: Id<'users'>;
  onSendRequest: () => void;
  isSending: boolean;
}

export function UserFriendStatus({ userId, onSendRequest, isSending }: UserFriendStatusProps) {
  const hasSentRequest = useQuery(api.friends.queries.hasSentFriendRequest, { userId });
  const areFriends = useQuery(api.friends.queries.areFriends, { userId });

  if (areFriends === undefined || hasSentRequest === undefined) {
    return (
      <div className="px-4 py-2 bg-surface-alt rounded-full text-sm font-medium flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (areFriends) {
    return (
      <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2">
        <Check className="w-4 h-4" />
        Friends
      </div>
    );
  }

  if (hasSentRequest) {
    return (
      <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2">
        <Check className="w-4 h-4" />
        Request Sent
      </div>
    );
  }

  return (
    <button
      onClick={onSendRequest}
      disabled={isSending}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {isSending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Add
        </>
      )}
    </button>
  );
}

