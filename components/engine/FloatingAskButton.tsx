'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface FloatingAskButtonProps {
  isVisible: boolean;
  onPress: () => void;
}

/**
 * Glassmorphic floating pill button above the bottom nav.
 * Fades out when the chat sheet is open, fades back in when closed.
 */
export function FloatingAskButton({ isVisible, onPress }: FloatingAskButtonProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-[80px] left-0 right-0 flex justify-center z-40 pointer-events-none"
        >
          <button
            onClick={onPress}
            className="pointer-events-auto flex items-center gap-2.5 px-5 py-3 rounded-full
              bg-background/70 dark:bg-background/60
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              shadow-lg shadow-black/10 dark:shadow-black/30
              hover:bg-background/85 transition-colors"
            aria-label="Ask Nima"
          >
            {/* Nima avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-text-primary pr-1">Ask Nima</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
