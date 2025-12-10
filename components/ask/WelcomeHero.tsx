'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageCircle } from 'lucide-react';
import { nimaGreetings } from '@/lib/mock-chat-data';

interface WelcomeHeroProps {
  className?: string;
}

export function WelcomeHero({ className = '' }: WelcomeHeroProps) {
  // Pick a random greeting on mount (only changes on reload)
  const [greetingIndex] = useState(() => 
    Math.floor(Math.random() * nimaGreetings.length)
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Animated Nima Icon with Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mb-6"
      >
        {/* Outer glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Main icon container */}
        <motion.div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-lg"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Inner sparkle effect */}
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-br from-primary-foreground/20 to-transparent"
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Icon */}
          <Sparkles className="w-10 h-10 text-primary-foreground relative z-10" />
          
          {/* Rotating sparkle particles */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary-foreground/60"
                style={{
                  top: '10%',
                  left: '50%',
                  transform: `rotate(${i * 120}deg) translateY(-30px)`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Chat bubble with rotating greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative max-w-sm w-full"
      >
        <div className="bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-4 shadow-lg">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            
            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Nima</p>
              <div className="text-base text-foreground leading-relaxed min-h-[1.5rem]">
                <TypingText text={nimaGreetings[greetingIndex]} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bubble tail */}
        <div 
          className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/95 border-b border-r border-border/50 transform rotate-45"
          style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.02)' }}
        />
      </motion.div>
    </div>
  );
}

// Typing animation component
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
    }, 40);

    return () => clearInterval(typingInterval);
  }, [text]);

  return (
    <span className="inline-flex items-center">
      {displayedText}
      {isTyping && <span className="ml-0.5 w-0.5 h-4 bg-current animate-blink" />}
    </span>
  );
}

