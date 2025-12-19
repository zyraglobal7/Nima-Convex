'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft,Sparkles, User } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import type { Id } from '@/convex/_generated/dataModel';
import { RecreateLookButton } from '@/components/looks/RecreateLookButton';
import { FriendRequestPopup } from '@/components/friends/FriendRequestPopup';

export default function ConversationPage() {
  const params = useParams();
  const otherUserId = params.userId as Id<'users'>;
  const [showFriendRequestPopup, setShowFriendRequestPopup] = useState(false);

  const messages = useQuery(api.directMessages.queries.getConversationMessages, {
    otherUserId,
  });
  const otherUser = useQuery(api.users.queries.getUser, { userId: otherUserId });
  const areFriends = useQuery(api.friends.queries.areFriends, { userId: otherUserId });
  const hasSentRequest = useQuery(api.friends.queries.hasSentFriendRequest, { userId: otherUserId });
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const markConversationAsRead = useMutation(api.directMessages.mutations.markConversationAsRead);

  // Mark conversation as read when opened
  useEffect(() => {
    if (otherUserId && areFriends !== undefined) {
      markConversationAsRead({ otherUserId }).catch(console.error);
    }
  }, [otherUserId, markConversationAsRead, areFriends]);

  // Show friend request popup if not friends and no pending request
  useEffect(() => {
    if (areFriends === false && hasSentRequest === false && otherUser && currentUser) {
      setShowFriendRequestPopup(true);
    }
  }, [areFriends, hasSentRequest, otherUser, currentUser]);

  if (messages === undefined || otherUser === undefined || areFriends === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
        </div>
      </div>
    );
  }

  const displayName =
    otherUser?.firstName && otherUser?.lastName
      ? `${otherUser?.firstName} ${otherUser?.lastName}`
      : otherUser?.username || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/messages"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
            <div className="flex-1 text-center px-4">
              <h1 className="text-sm font-medium text-foreground truncate">{displayName}</h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Friend request prompt for non-friends */}
        {areFriends === false && otherUser && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-surface border border-border/50 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden">
                {otherUser.profileImageUrl ? (
                  <Image
                    src={otherUser.profileImageUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {hasSentRequest ? 'Friend request sent' : 'Not your friend'}
                </p>
              </div>
            </div>
            {hasSentRequest ? (
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                Request Sent
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFriendRequestPopup(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Add Friend
                </button>
                <button
                  onClick={() => setShowFriendRequestPopup(false)}
                  className="px-4 py-2 bg-surface-alt text-foreground rounded-full text-sm font-medium hover:bg-surface transition-colors"
                >
                  Ignore
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              Looks shared between you and {displayName} will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${message.sentByMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${message.sentByMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                  {/* Look preview */}
                  <Link
                    href={`/look/${message.lookId}`}
                    className="block rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="relative aspect-[3/4] w-48 bg-surface-alt">
                      {message.lookImageUrl ? (
                        <Image
                          src={message.lookImageUrl}
                          alt={message.lookName || 'Look'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-surface border-t border-border/50">
                      <p className="text-sm font-medium text-foreground truncate">
                        {message.lookName || 'Look'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>

                  {/* Recreate button (only for received messages) */}
                  {!message.sentByMe && currentUser && (
                    <div className="mt-2">
                      <RecreateLookButton
                        lookId={message.lookId}
                        creatorUserId={otherUserId}
                        currentUserId={currentUser._id}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Friend Request Popup */}
      {showFriendRequestPopup && otherUser && (
        <FriendRequestPopup
          isOpen={showFriendRequestPopup}
          onClose={() => setShowFriendRequestPopup(false)}
          onIgnore={() => setShowFriendRequestPopup(false)}
          sharedBy={{
            _id: otherUser._id,
            firstName: otherUser.firstName,
            username: otherUser.username,
            profileImageUrl: otherUser.profileImageUrl,
          }}
        />
      )}

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

