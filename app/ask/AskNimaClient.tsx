'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import {
  WelcomeHero,
  ChatInput,
  PromptSuggestions,
  ChatHistoryButton,
} from '@/components/ask';
import { AuthExpiredModal } from '@/components/auth';

interface AskNimaClientProps {
  authExpired?: boolean;
}

export default function AskNimaClient({ authExpired = false }: AskNimaClientProps) {
  const router = useRouter();
  
  // Query current user - Convex uses preloaded cache if available from server
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  
  const remainingSearches = currentUser 
    ? Math.max(0, 20 - (currentUser.dailyTryOnCount || 0)) 
    : 2;

  const handleSendMessage = (message: string) => {
    // Store the initial message in sessionStorage to pick up in the chat page
    sessionStorage.setItem('nima-pending-message', message);
    // Redirect to new chat - the thread will be created when the first message is sent
    router.push('/ask/new');
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleNewChat = () => {
    // Already on new chat page
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Auth Expired Modal */}
      {authExpired && <AuthExpiredModal />}
      
      {/* Animated Background - Sunrise glow effect */}
      <div
        className="fixed inset-0 animate-rising-sun pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 100%, 
            var(--secondary) 0%, 
            transparent 50%),
            radial-gradient(ellipse 100% 80% at 50% 120%, 
            var(--primary) 0%, 
            transparent 40%),
            linear-gradient(to top, 
            rgba(201, 160, 122, 0.15) 0%, 
            rgba(166, 124, 82, 0.08) 30%, 
            transparent 60%)`,
        }}
      />

      {/* Ambient glow orbs */}
      <motion.div
        className="fixed top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'var(--secondary)' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="fixed bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--primary)' }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Header - fixed at top */}
      <header className="flex-shrink-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/discover"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-medium text-foreground">Ask Nima</h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MessagesIcon />
              <ChatHistoryButton onNewChat={handleNewChat} />
            </div>
          </div>
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Free searches badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center py-3"
        >
          <div className="px-4 py-1.5 rounded-full bg-surface/80 backdrop-blur-sm border border-border/50">
            <span className="text-xs text-muted-foreground">
              <span className="text-secondary font-medium">{remainingSearches}</span> free searches remaining today
            </span>
          </div>
        </motion.div>

        {/* Centered content */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100%-4rem)] px-4 py-8">
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            {/* Welcome Hero with animated Nima */}
            <WelcomeHero className="mb-10" />

            {/* Prompt suggestions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full"
            >
              <PromptSuggestions onSelect={handlePromptSelect} />
            </motion.div>
          </div>
        </div>

        {/* Bottom padding for fixed elements */}
        <div className="h-32 md:h-24" />
      </main>

      {/* Fixed bottom input */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            placeholder="Describe what you're looking for..."
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




