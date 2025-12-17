'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ChatInput,
  MessageBubble,
  ChatHistoryButton,
  PromptChips,
} from '@/components/ask';
import { TypingIndicator } from '@/components/ask/MessageBubble';

type ChatState = 'chatting' | 'typing' | 'searching' | 'ready';

// Define message type matching what MessageBubble expects
interface DisplayMessage {
  id: string;
  role: 'user' | 'nima';
  content: string;
  timestamp: Date;
  type: 'text' | 'searching' | 'fitting-ready';
  sessionId?: string;
}

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatState, setChatState] = useState<ChatState>('chatting');
  const [threadId, setThreadId] = useState<Id<'threads'> | null>(null);
  const [isNewThread, setIsNewThread] = useState(chatId === 'new');
  const [searchSessions, setSearchSessions] = useState<string[]>([]);

  // Get current user for context
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Get thread data if not a new chat
  const thread = useQuery(
    api.threads.queries.getThread,
    threadId ? { threadId } : 'skip'
  );

  // Get messages for the thread
  const messagesData = useQuery(
    api.messages.queries.getAllMessages,
    threadId ? { threadId } : 'skip'
  );

  // Mutations
  const startConversation = useMutation(api.messages.mutations.startConversation);
  const sendMessageMutation = useMutation(api.messages.mutations.sendMessage);
  const saveAssistantMessage = useMutation(api.messages.mutations.saveAssistantMessage);

  // Set threadId from URL if it's a valid ID
  useEffect(() => {
    if (chatId !== 'new' && chatId.startsWith('j')) {
      // Convex IDs start with specific prefixes
      setThreadId(chatId as Id<'threads'>);
      setIsNewThread(false);
    }
  }, [chatId]);

  // useChat for AI streaming
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: handleAiSubmit,
    isLoading: isAiLoading,
    setMessages: setAiMessages,
    append,
  } = useChat({
    api: '/api/chat',
    body: {
      userData: currentUser ? {
        gender: currentUser.gender,
        stylePreferences: currentUser.stylePreferences,
        budgetRange: currentUser.budgetRange,
      } : undefined,
    },
    onFinish: async (message) => {
      // Save assistant message to Convex when streaming finishes
      if (threadId) {
        try {
          await saveAssistantMessage({
            threadId,
            content: message.content,
            model: 'gpt-4o-mini',
          });
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Check if AI is ready to search
      if (message.content.includes('[SEARCH_READY]')) {
        handleSearchReady();
      }

      setChatState('chatting');
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, chatState]);

  // Load existing messages into useChat state when thread loads
  useEffect(() => {
    if (messagesData && messagesData.length > 0 && aiMessages.length === 0) {
      const formattedMessages = messagesData.map((msg) => ({
        id: msg._id,
        role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }));
      setAiMessages(formattedMessages);
    }
  }, [messagesData, aiMessages.length, setAiMessages]);

  // Handle pending message from /ask page
  useEffect(() => {
    if (isNewThread && typeof window !== 'undefined') {
      const pendingMessage = sessionStorage.getItem('nima-pending-message');
      if (pendingMessage) {
        sessionStorage.removeItem('nima-pending-message');
        // Send the pending message after a short delay
        setTimeout(() => handleSendMessage(pendingMessage), 500);
      }
    }
  }, [isNewThread]);

  const handleSearchReady = useCallback(() => {
    setChatState('searching');
    // Generate a mock session ID for now
    const sessionId = `session-${Date.now()}`;
    setSearchSessions((prev) => [...prev, sessionId]);

    // Simulate search delay then show fitting room card
    setTimeout(() => {
      setChatState('chatting');
    }, 2000);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (chatState !== 'chatting' || !content.trim()) return;

    setChatState('typing');

    try {
      if (isNewThread && !threadId) {
        // Create new thread with first message
        const result = await startConversation({
          content,
          contextType: 'outfit_help',
        });
        
        setThreadId(result.threadId);
        setIsNewThread(false);
        
        // Update URL to the new thread ID
        router.replace(`/ask/${result.threadId}`);

        // Now send to AI
        if (append) {
          await append({
            role: 'user',
            content,
          });
        }
      } else if (threadId) {
        // Send message to existing thread
        await sendMessageMutation({
          threadId,
          content,
        });

        // Send to AI
        if (append) {
          await append({
            role: 'user',
            content,
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatState('chatting');
    }
  };

  const handleFittingRoomClick = (sessionId: string) => {
    router.push(`/fitting/${sessionId}`);
  };

  const handleNewChat = () => {
    router.push('/ask');
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Convert AI messages to display format
  const displayMessages: DisplayMessage[] = aiMessages.map((msg) => ({
    id: msg.id,
    role: msg.role === 'assistant' ? 'nima' : 'user',
    content: msg.content.replace('[SEARCH_READY]', '').trim(),
    timestamp: msg.createdAt || new Date(),
    type: 'text' as const,
  }));

  // Add fitting-ready messages for search sessions
  searchSessions.forEach((sessionId, index) => {
    displayMessages.push({
      id: `fitting-${sessionId}`,
      role: 'nima',
      content: '',
      timestamp: new Date(),
      type: 'fitting-ready',
      sessionId,
    });
  });

  // Add initial greeting if no messages
  if (displayMessages.length === 0 && !isAiLoading) {
    displayMessages.push({
      id: 'greeting',
      role: 'nima',
      content: "Hey there! What are we styling today? ✨",
      timestamp: new Date(),
      type: 'text',
    });
  }

  const title = thread?.title || (displayMessages.find(m => m.role === 'user')?.content.slice(0, 40) || 'New conversation');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - fixed at top */}
      <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/ask"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
            <div className="flex-1 text-center px-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
                <h1 className="text-sm font-medium text-foreground truncate max-w-[180px]">
                  {title}
                </h1>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <ChatHistoryButton currentChatId={chatId} onNewChat={handleNewChat} />
            </div>
          </div>
        </div>
      </header>

      {/* Free searches badge */}
      <div className="flex-shrink-0 flex justify-center py-2 bg-surface/30">
        <div className="px-3 py-1 rounded-full bg-background/80 border border-border/30">
          <span className="text-xs text-muted-foreground">
            <span className="text-secondary font-medium">
              {currentUser ? Math.max(0, 20 - (currentUser.dailyTryOnCount || 0)) : 2}
            </span> free searches today
          </span>
        </div>
      </div>

      {/* Messages area - scrollable */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                animate={true}
                onFittingRoomClick={handleFittingRoomClick}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {(chatState === 'typing' || isAiLoading) && <TypingIndicator />}
          </AnimatePresence>

          {/* Searching state */}
          <AnimatePresence>
            {chatState === 'searching' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-surface/50 rounded-2xl border border-border/30"
              >
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Finding your perfect looks...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick prompts for continuing - inline card */}
          {chatState === 'chatting' && searchSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-surface/50 rounded-2xl border border-border/30"
            >
              <p className="text-xs text-muted-foreground mb-3">Continue styling:</p>
              <PromptChips onSelect={handlePromptSelect} limit={3} />
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Bottom padding for fixed elements */}
        <div className="h-32 md:h-24" />
      </main>

      {/* Fixed bottom input */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={chatState === 'searching' || isAiLoading}
            placeholder={
              chatState === 'searching'
                ? 'Finding your looks...'
                : isAiLoading
                ? 'Nima is typing...'
                : 'Type your message...'
            }
          />
        </div>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-30">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-primary font-medium">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
