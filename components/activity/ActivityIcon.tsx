'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { playSoftNotificationSound } from '@/lib/utils/notifications';

export function ActivityIcon() {
  const rawUnreadCount = useQuery(api.lookInteractions.queries.getUnreadActivityCount);
  const unreadCount = rawUnreadCount ?? 0;
  const prevUnreadCountRef = useRef<number | undefined>(undefined);

  // Play notification sound when unread count increases (real-time)
  useEffect(() => {
    // Skip if query hasn't loaded yet
    if (rawUnreadCount === undefined) {
      return;
    }

    // First time query loads - just store the value, don't play sound
    if (prevUnreadCountRef.current === undefined) {
      prevUnreadCountRef.current = rawUnreadCount;
      return;
    }

    // Only play sound if count increased (new notification arrived)
    if (rawUnreadCount > prevUnreadCountRef.current) {
      playSoftNotificationSound();
    }
    prevUnreadCountRef.current = rawUnreadCount;
  }, [rawUnreadCount]);

  return (
    <Link
      href="/activity"
      className="relative p-2 rounded-full hover:bg-surface transition-colors"
      title="Activity"
    >
      <Heart className={`w-5 h-5 ${unreadCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

