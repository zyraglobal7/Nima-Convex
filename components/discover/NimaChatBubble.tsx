'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface NimaChatBubbleProps {
  message: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function TypingText({ text, speed = 30 }: { text: string; speed?: number }) {
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
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed]);

  return (
    <span className="inline-flex items-center">
      {displayedText}
      {isTyping && <span className="ml-0.5 w-0.5 h-4 bg-current animate-blink" />}
    </span>
  );
}

export function NimaChatBubble({ 
  message, 
  animate = true, 
  size = 'md',
  className = '' 
}: NimaChatBubbleProps) {
  const [key, setKey] = useState(0);

  // Reset animation when message changes
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [message]);

  const sizeClasses = {
    sm: {
      container: 'px-4 py-3',
      icon: 'w-7 h-7',
      iconInner: 'w-3.5 h-3.5',
      text: 'text-sm',
      label: 'text-[10px]',
    },
    md: {
      container: 'px-5 py-4',
      icon: 'w-9 h-9',
      iconInner: 'w-4 h-4',
      text: 'text-base',
      label: 'text-xs',
    },
    lg: {
      container: 'px-6 py-5',
      icon: 'w-11 h-11',
      iconInner: 'w-5 h-5',
      text: 'text-lg',
      label: 'text-xs',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={animate ? { opacity: 0, scale: 0.95, y: 10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={`relative ${className}`}
    >
      <div className={`bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg ${sizes.container}`}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`flex-shrink-0 ${sizes.icon} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center`}>
            <MessageCircle className={`${sizes.iconInner} text-primary-foreground`} />
          </div>
          
          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={`${sizes.label} text-muted-foreground mb-1 font-medium`}>Nima says</p>
            <div className={`${sizes.text} text-foreground leading-relaxed`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={key}
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {animate ? <TypingText text={message} /> : message}
                </motion.div>
              </AnimatePresence>
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
  );
}

