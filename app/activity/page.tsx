'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { Heart, Bookmark, ArrowLeft, Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { playSoftNotificationSound, getNotificationSoundMuted, setNotificationSoundMuted } from '@/lib/utils/notifications';
import { formatDistanceToNow } from 'date-fns';
import type { Id } from '@/convex/_generated/dataModel';
import { trackActivityPageViewed } from '@/lib/analytics';

// Notification item type
interface ActivityNotification {
  _id: Id<'look_interactions'>;
  interactionType: 'love' | 'dislike' | 'save';
  createdAt: number;
  seenByOwner: boolean;
  look: {
    _id: Id<'looks'>;
    publicId: string;
    occasion?: string;
  };
  user: {
    _id: Id<'users'>;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

function NotificationItem({ notification, isNew }: { notification: ActivityNotification; isNew: boolean }) {
  const userName = notification.user.firstName || notification.user.username || 'Someone';
  const actionText = notification.interactionType === 'love' ? 'loved' : 'saved';
  const icon = notification.interactionType === 'love' ? (
    <Heart className="w-5 h-5 fill-destructive text-destructive" />
  ) : (
    <Bookmark className="w-5 h-5 fill-primary text-primary" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-start gap-3 p-4 rounded-xl transition-all duration-300
        ${isNew ? 'bg-primary/5 border border-primary/20' : 'bg-surface hover:bg-surface-alt'}
      `}
    >
      {/* User avatar */}
      <Link href={`/profile/${notification.user._id}`} className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden relative">
          {notification.user.profileImageUrl ? (
            <Image
              src={notification.user.profileImageUrl}
              alt={userName}
              fill
              sizes="40px"
              unoptimized={
                notification.user.profileImageUrl.includes('convex.cloud') ||
                notification.user.profileImageUrl.includes('convex.site') ||
                notification.user.profileImageUrl.includes('workoscdn.com')
              }
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-medium">{userName}</span>{' '}
          {actionText} your look
          {notification.look.occasion && (
            <span className="text-muted-foreground"> • {notification.look.occasion}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>

      {/* Action icon */}
      <div className="flex-shrink-0">
        {icon}
      </div>

      {/* Link to look */}
      <Link
        href={`/look/${notification.look.publicId}`}
        className="flex-shrink-0 text-xs text-primary hover:underline"
      >
        View
      </Link>

      {/* New indicator */}
      {isNew && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </motion.div>
  );
}

export default function ActivityPage() {
  const [isSoundMuted, setIsSoundMuted] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const previousCountRef = useRef<number>(0);
  const hasLoadedRef = useRef(false);

  // Fetch activity notifications
  const notifications = useQuery(api.lookInteractions.queries.getActivityNotifications, { limit: 50 });
  const unreadCount = useQuery(api.lookInteractions.queries.getUnreadActivityCount);
  const markAsSeen = useMutation(api.lookInteractions.mutations.markActivityAsSeen);

  // Initialize mute state from localStorage
  useEffect(() => {
    setIsSoundMuted(getNotificationSoundMuted());
  }, []);

  // Track page view
  useEffect(() => {
    if (unreadCount !== undefined) {
      trackActivityPageViewed({ unread_count: unreadCount });
    }
  }, []); // Only track on mount

  // Play notification sound when new notifications arrive (real-time)
  useEffect(() => {
    if (!notifications || !hasLoadedRef.current) {
      if (notifications) {
        hasLoadedRef.current = true;
        previousCountRef.current = notifications.filter(n => !n.seenByOwner).length;
      }
      return;
    }

    const currentUnseenCount = notifications.filter(n => !n.seenByOwner).length;
    
    // If there are new unseen notifications, play sound
    if (currentUnseenCount > previousCountRef.current && !isSoundMuted) {
      playSoftNotificationSound();
    }
    
    previousCountRef.current = currentUnseenCount;
  }, [notifications, isSoundMuted]);

  // Toggle sound mute
  const toggleSoundMute = () => {
    const newMuted = !isSoundMuted;
    setIsSoundMuted(newMuted);
    setNotificationSoundMuted(newMuted);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!notifications || isMarkingRead) return;
    
    const unreadIds = notifications
      .filter(n => !n.seenByOwner)
      .map(n => n._id);
    
    if (unreadIds.length === 0) return;
    
    setIsMarkingRead(true);
    try {
      await markAsSeen({ interactionIds: unreadIds });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications?.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, ActivityNotification[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link href="/discover" className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Page title - center */}
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              <h1 className="text-lg font-medium text-foreground">
                Activity
              </h1>
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <button
                onClick={toggleSoundMute}
                className="p-2 rounded-full hover:bg-surface transition-colors"
                title={isSoundMuted ? 'Enable notification sounds' : 'Mute notification sounds'}
              >
                {isSoundMuted ? (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Bell className="w-5 h-5 text-foreground" />
                )}
              </button>
              <ThemeToggle />
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Page intro with mark all as read */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-foreground">
              Your Activity
            </h2>
            <p className="text-muted-foreground mt-1">
              See who&apos;s loving and saving your looks
            </p>
          </div>
          
          {unreadCount !== undefined && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
            >
              {isMarkingRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Mark all read
            </button>
          )}
        </motion.div>

        {/* Loading state */}
        {notifications === undefined && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {notifications !== undefined && notifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No activity yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When people love or save your looks, you&apos;ll see their activity here.
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary-hover transition-colors"
            >
              Share a look
            </Link>
          </motion.div>
        )}

        {/* Notifications list */}
        {notifications !== undefined && notifications.length > 0 && groupedNotifications && (
          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(groupedNotifications).map(([date, items]) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        isNew={!notification.seenByOwner}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

