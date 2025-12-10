'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Plus, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { mockConversations, formatRelativeTime, type ChatConversation } from '@/lib/mock-chat-data';

interface ChatHistoryDrawerProps {
  currentChatId?: string;
  onNewChat?: () => void;
  trigger?: React.ReactNode;
}

export function ChatHistoryDrawer({
  currentChatId,
  onNewChat,
  trigger,
}: ChatHistoryDrawerProps) {
  // Get first user message as preview
  const getPreview = (conversation: ChatConversation): string => {
    const userMessage = conversation.messages.find((m) => m.role === 'user');
    if (userMessage) {
      return userMessage.content.slice(0, 60) + (userMessage.content.length > 60 ? '...' : '');
    }
    return 'New conversation';
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <button className="p-2 rounded-full hover:bg-surface transition-colors">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-lg font-serif">Chat History</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* New chat button */}
          <div className="p-4 border-b border-border/30">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {mockConversations.length === 0 ? (
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
                {mockConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link
                      href={`/ask/${conversation.id}`}
                      className={`
                        flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors
                        ${currentChatId === conversation.id ? 'bg-surface/70' : ''}
                      `}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {conversation.title}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(conversation.updatedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {getPreview(conversation)}
                        </p>
                        {conversation.searchSessions.length > 0 && (
                          <p className="text-xs text-secondary mt-1">
                            {conversation.searchSessions.length} fitting room{conversation.searchSessions.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="flex-shrink-0 w-5 h-5 text-muted-foreground" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 bg-surface/30">
            <p className="text-xs text-center text-muted-foreground">
              Chat history is stored locally
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// History button for header
export function ChatHistoryButton({ 
  currentChatId,
  onNewChat,
}: { 
  currentChatId?: string;
  onNewChat?: () => void;
}) {
  return (
    <ChatHistoryDrawer
      currentChatId={currentChatId}
      onNewChat={onNewChat}
      trigger={
        <button className="p-2 rounded-full hover:bg-surface transition-colors">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </button>
      }
    />
  );
}

