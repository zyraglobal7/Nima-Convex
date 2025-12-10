'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { ChatMessage } from '@/lib/mock-chat-data';
import { SearchingCard } from './SearchingCard';
import { FittingRoomCard } from './FittingRoomCard';

interface MessageBubbleProps {
  message: ChatMessage;
  animate?: boolean;
  onFittingRoomClick?: (sessionId: string) => void;
}

export function MessageBubble({ 
  message, 
  animate = true,
  onFittingRoomClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isNima = message.role === 'nima';

  // Handle special message types
  if (message.type === 'searching') {
    return <SearchingCard animate={animate} />;
  }

  if (message.type === 'fitting-ready' && message.sessionId) {
    return (
      <FittingRoomCard
        sessionId={message.sessionId}
        animate={animate}
        onClick={() => onFittingRoomClick?.(message.sessionId!)}
      />
    );
  }

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for Nima */}
        {isNima && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-1">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 max-w-full
            ${isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-surface border border-border/50 text-foreground rounded-2xl rounded-bl-md'
            }
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Typing indicator for Nima
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="flex items-end gap-2">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-1">
          <MessageCircle className="w-4 h-4 text-primary-foreground" />
        </div>

        {/* Typing dots */}
        <div className="bg-surface border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-muted-foreground/60"
                animate={{
                  y: [0, -4, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

