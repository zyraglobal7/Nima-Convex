'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function MessagesIcon() {
  const unreadCount = useQuery(api.directMessages.queries.getUnreadMessageCount) ?? 0;

  return (
    <Link
      href="/messages"
      className="relative p-2 rounded-full hover:bg-surface transition-colors"
    >
      <MessageSquare className="w-5 h-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

