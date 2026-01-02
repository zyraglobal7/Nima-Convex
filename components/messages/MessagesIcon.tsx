'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { playSoftNotificationSound } from '@/lib/utils/notifications';

export function MessagesIcon() {
  const unreadCount = useQuery(api.directMessages.queries.getUnreadMessageCount) ?? 0;
  const prevUnreadCountRef = useRef<number>(0);

  // Play notification sound when unread count increases
  useEffect(() => {
    // Only play sound if count increased (new message arrived) and it's not the initial load
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
      playSoftNotificationSound();
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

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

