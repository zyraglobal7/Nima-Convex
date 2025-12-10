'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface GateSplashProps {
  onGetStarted: () => void;
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

          {/* Exclusive badge */}
          <motion.div 
            className="mb-10 px-4 py-2 rounded-full border border-secondary/30 bg-surface/50 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <span className="text-xs uppercase tracking-widest text-secondary font-medium">
              By Invitation Only
            </span>
          </motion.div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="w-full max-w-xs"
          >
            <Button
              onClick={onGetStarted}
              size="lg"
              className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              Get Started
            </Button>
          </motion.div>

          {/* Sign In Link */}
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <p className="text-muted-foreground text-sm">
              Already a member?{' '}
              <a
                href="/sign-in"
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
