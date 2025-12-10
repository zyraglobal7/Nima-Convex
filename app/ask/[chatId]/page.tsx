'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ChatInput,
  MessageBubble,
  ChatHistoryButton,
  PromptChips,
} from '@/components/ask';
import { TypingIndicator } from '@/components/ask/MessageBubble';
import {
  getConversationById,
  createNewConversation,
  generateMessageId,
  generateSessionId,
  generateMockFittingResults,
  followUpQuestions,
  FREE_SEARCHES_PER_DAY,
  type ChatMessage,
  type ChatConversation,
} from '@/lib/mock-chat-data';

type ChatState = 'chatting' | 'typing' | 'searching' | 'ready';

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [chatState, setChatState] = useState<ChatState>('chatting');
  const [questionCount, setQuestionCount] = useState(0);
  const [remainingSearches] = useState(FREE_SEARCHES_PER_DAY);

  // Load or create conversation
  useEffect(() => {
    const existingConversation = getConversationById(chatId);
    if (existingConversation) {
      setConversation(existingConversation);
      // Count existing user messages to track question count
      const userMsgCount = existingConversation.messages.filter(m => m.role === 'user').length;
      setQuestionCount(userMsgCount);
    } else {
      // New conversation
      const newConvo = createNewConversation();
      newConvo.id = chatId;
      setConversation(newConvo);

      // Check for pending message from /ask page
      const pendingMessage = sessionStorage.getItem('nima-pending-message');
      if (pendingMessage) {
        sessionStorage.removeItem('nima-pending-message');
        // Send the pending message after a short delay
        setTimeout(() => handleSendMessage(pendingMessage), 500);
      }
    }
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, chatState]);

  const addMessage = (message: ChatMessage) => {
    setConversation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, message],
        updatedAt: new Date(),
      };
    });
  };

  const handleSendMessage = async (content: string) => {
    if (chatState !== 'chatting') return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'text',
    };
    addMessage(userMessage);

    // Update title if first user message
    if (questionCount === 0) {
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        };
      });
    }

    const newQuestionCount = questionCount + 1;
    setQuestionCount(newQuestionCount);

    // Show typing indicator
    setChatState('typing');

    // Simulate Nima response delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Decide whether to ask follow-up or search
    const shouldSearch = newQuestionCount >= 3 || 
      content.toLowerCase().includes('find') ||
      content.toLowerCase().includes('show') ||
      content.toLowerCase().includes('search') ||
      content.toLowerCase().includes('let\'s go');

    if (shouldSearch) {
      // Transition to searching
      setChatState('searching');
      
      // Add "let me find" message
      const searchingMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'nima',
        content: "Perfect! I've got a great picture of what you need. Let me find some amazing options for you... ✨",
        timestamp: new Date(),
        type: 'text',
      };
      addMessage(searchingMessage);

      // Show searching state
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const searchMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'nima',
        content: '',
        timestamp: new Date(),
        type: 'searching',
      };
      addMessage(searchMessage);

      // Simulate search delay
      await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));

      // Generate mock results
      const sessionId = generateSessionId();
      const results = generateMockFittingResults(chatId, content);
      results.id = sessionId;

      // Remove searching message and add fitting room card
      setConversation((prev) => {
        if (!prev) return prev;
        const filteredMessages = prev.messages.filter(m => m.type !== 'searching');
        return {
          ...prev,
          messages: [
            ...filteredMessages,
            {
              id: generateMessageId(),
              role: 'nima',
              content: '',
              timestamp: new Date(),
              type: 'fitting-ready',
              sessionId: sessionId,
            },
          ],
          searchSessions: [...prev.searchSessions, sessionId],
        };
      });

      // Store the session for the fitting room
      sessionStorage.setItem(`nima-session-${sessionId}`, JSON.stringify(results));

      setChatState('chatting');
      setQuestionCount(0); // Reset for potential follow-up search

    } else {
      // Ask follow-up question
      setChatState('chatting');
      
      const questionCategories = Object.keys(followUpQuestions) as Array<keyof typeof followUpQuestions>;
      const category = questionCategories[Math.floor(Math.random() * questionCategories.length)];
      const questions = followUpQuestions[category];
      const question = questions[Math.floor(Math.random() * questions.length)];

      const nimaMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'nima',
        content: question,
        timestamp: new Date(),
        type: 'text',
      };
      addMessage(nimaMessage);
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

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                  {conversation.title}
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
            <span className="text-secondary font-medium">{remainingSearches}</span> free searches today
          </span>
        </div>
      </div>

      {/* Messages area - scrollable */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {conversation.messages.map((message) => (
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
            {chatState === 'typing' && <TypingIndicator />}
          </AnimatePresence>

          {/* Quick prompts for continuing - inline card */}
          {chatState === 'chatting' && conversation.searchSessions.length > 0 && (
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
            disabled={chatState === 'searching' || chatState === 'typing'}
            placeholder={
              chatState === 'searching'
                ? 'Finding your looks...'
                : chatState === 'typing'
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
