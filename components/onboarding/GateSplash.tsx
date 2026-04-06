'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { trackGetStarted, trackSignInLinkClicked } from '@/lib/analytics';

interface GateSplashProps {
  onGetStarted?: () => void;
}

const CHAT_MESSAGES = [
  "You'd look so good in this...",
  "See yourself in every outfit...",
  "Let me style you today...",
  "Ready to discover your look?",
  "Your perfect fit awaits...",
];

function TypingText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [text]);

  return (
    <span className="inline-flex items-center">
      {displayedText}
      {isTyping && (
        <span className="ml-0.5 w-0.5 h-4 bg-current animate-blink" />
      )}
    </span>
  );
}

function ChatBubble() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CHAT_MESSAGES.length);
      setKey((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      className="animate-float"
    >
      <div className="relative">
        {/* Chat bubble */}
        <div className="bg-surface/90 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="text-sm text-foreground font-medium min-w-[180px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypingText text={CHAT_MESSAGES[messageIndex]} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {/* Bubble tail */}
        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/90 border-b border-r border-border/50 transform rotate-45" />
      </div>
    </motion.div>
  );
}

export function GateSplash({ onGetStarted }: GateSplashProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Header with theme toggle */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-end">
        <ThemeToggle />
      </header>

      {/* Animated Rising Sun Background */}
      <div 
        className="absolute inset-0 animate-rising-sun"
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

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glow orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
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
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15"
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

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
          {/* Logo / Brand with entrance animation */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <h1 className="text-5xl md:text-6xl font-serif font-semibold tracking-tight text-foreground">
              Nima
            </h1>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mt-2 font-light">
              AI Stylist
            </p>
          </motion.div>

          {/* Chat Bubble */}
          <div className="mb-8">
            <ChatBubble />
          </div>

          {/* Tagline */}
          <motion.div 
            className="mb-10 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          >
            <p className="text-xl md:text-2xl font-serif text-foreground/90 leading-relaxed">
              Your personal AI stylist.
            </p>
            <p className="text-lg text-muted-foreground font-light">
              See yourself in every outfit.
            </p>
          </motion.div>


          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="w-full max-w-xs space-y-3"
          >
            <a
              href="/sign-in"
              onClick={() => trackGetStarted()}
              className="flex items-center justify-center gap-3 w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
              </svg>
              Continue with Google
            </a>

            <p className="text-xs text-center text-muted-foreground">
              Already a member?{' '}
              <a
                href="/sign-in"
                onClick={() => trackSignInLinkClicked()}
                className="text-secondary hover:opacity-80 underline underline-offset-4 transition-colors duration-200"
              >
                Sign in
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-alt/30 to-transparent pointer-events-none" />
    </div>
  );
}
