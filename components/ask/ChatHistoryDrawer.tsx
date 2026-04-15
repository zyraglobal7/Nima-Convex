'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Plus, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface ChatHistoryDrawerProps {
  currentChatId?: string;
  onNewChat?: () => void;
  trigger?: React.ReactNode;
  onSelectThread?: (threadId: Id<'threads'>) => void;
}

// Format relative time helper
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ChatHistoryDrawer({
  currentChatId,
  onNewChat,
  trigger,
  onSelectThread,
}: ChatHistoryDrawerProps) {
  const [open, setOpen] = React.useState(false);

  // Use real thread data from Convex
  const threadsData = useQuery(api.threads.queries.listThreadsWithPreview, {
    includeArchived: false,
    limit: 20,
  });

  const threads = threadsData || [];

  // Get preview from last message
  const getPreview = (lastMessage: { content: string; role: 'user' | 'assistant' } | null): string => {
    if (!lastMessage) return 'New conversation';
    const content = lastMessage.content.replace('[SEARCH_READY]', '').trim();
    return content.slice(0, 60) + (content.length > 60 ? '...' : '');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild onClick={() => setOpen(true)}>
        {trigger || (
          <button className="p-2 rounded-full hover:bg-surface transition-colors">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 z-[210]" overlayClassName="z-[209]">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-lg font-serif">Chat History</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* New chat button */}
          <div className="p-4 border-b border-border/30">
            <button
              onClick={() => {
                onNewChat?.();
                setOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-2">No conversations yet</p>
                <p className="text-sm text-muted-foreground">
                  Start a new chat to get personalized style recommendations
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {threads.map(({ thread, lastMessage }, index) => (
                  <motion.div
                    key={thread._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {onSelectThread ? (
                      <button
                        className={`w-full flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors text-left ${currentChatId === thread._id ? 'bg-surface/70' : ''}`}
                        onClick={() => {
                          onSelectThread(thread._id);
                          setOpen(false);
                        }}
                      >
                        <ThreadItemContent thread={thread} lastMessage={lastMessage} getPreview={getPreview} />
                      </button>
                    ) : (
                      <Link
                        href={`/ask/${thread._id}`}
                        className={`flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors ${currentChatId === thread._id ? 'bg-surface/70' : ''}`}
                      >
                        <ThreadItemContent thread={thread} lastMessage={lastMessage} getPreview={getPreview} />
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 bg-surface/30">
            <p className="text-xs text-center text-muted-foreground">
              Your chat history is securely stored
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Shared inner content for a thread row (used in both Link and button variants)
function ThreadItemContent({
  thread,
  lastMessage,
  getPreview,
}: {
  thread: { _id: Id<'threads'>; title?: string; lastMessageAt: number; messageCount: number };
  lastMessage: { content: string; role: 'user' | 'assistant' } | null;
  getPreview: (msg: { content: string; role: 'user' | 'assistant' } | null) => string;
}) {
  return (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <MessageCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground truncate">
            {thread.title || 'New conversation'}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(thread.lastMessageAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {getPreview(lastMessage)}
        </p>
        {thread.messageCount > 0 && (
          <p className="text-xs text-secondary mt-1">
            {thread.messageCount} message{thread.messageCount > 1 ? 's' : ''}
          </p>
        )}
      </div>
      <ChevronRight className="flex-shrink-0 w-5 h-5 text-muted-foreground" />
    </>
  );
}

// History button for header
export function ChatHistoryButton({
  currentChatId,
  onNewChat,
  onSelectThread,
}: {
  currentChatId?: string;
  onNewChat?: () => void;
  onSelectThread?: (threadId: Id<'threads'>) => void;
}) {
  return (
    <ChatHistoryDrawer
      currentChatId={currentChatId}
      onNewChat={onNewChat}
      onSelectThread={onSelectThread}
      trigger={
        <button className="p-2 rounded-full hover:bg-surface transition-colors">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </button>
      }
    />
  );
}
