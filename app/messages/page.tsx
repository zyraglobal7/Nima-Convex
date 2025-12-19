'use client';


import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Sparkles, MessageSquare, User } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Id } from '@/convex/_generated/dataModel';

export default function MessagesPage() {
  const router = useRouter();
  const conversations = useQuery(api.directMessages.queries.getConversations);
  const markConversationAsRead = useMutation(api.directMessages.mutations.markConversationAsRead);

  const handleConversationClick = async (otherUserId: Id<'users'>, hasUnread: boolean) => {
    if (hasUnread) {
      // Mark conversation as read
      await markConversationAsRead({ otherUserId });
    }
    router.push(`/messages/${otherUserId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/discover"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground">
              Messages
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {conversations === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Looks shared with you will appear here. Share a look with someone to start a conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation, index) => {
              const displayName =
                conversation.otherUser.firstName && conversation.otherUser.lastName
                  ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
                  : conversation.otherUser.username || 'User';

              return (
                <motion.button
                  key={conversation.otherUser._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() =>
                    handleConversationClick(
                      conversation.otherUser._id,
                      conversation.unreadCount > 0
                    )
                  }
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-border/50 hover:border-primary/30 transition-all text-left"
                >
                  {/* Profile image */}
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden flex-shrink-0">
                    {conversation.otherUser.profileImageUrl ? (
                      <Image
                        src={conversation.otherUser.profileImageUrl}
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

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-foreground truncate">{displayName}</p>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.sentByMe ? 'You: ' : ''}Shared a look
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {conversation.unreadCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

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

