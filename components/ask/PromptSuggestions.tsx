'use client';

import { motion } from 'framer-motion';
import { quickPrompts } from '@/lib/mock-chat-data';

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

export function PromptSuggestions({ onSelect, className = '' }: PromptSuggestionsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-sm text-muted-foreground text-center">
        Or try one of these:
      </p>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {quickPrompts.map((prompt, index) => (
          <motion.button
            key={prompt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(prompt.text)}
            className="
              flex items-center gap-2 px-4 py-2.5
              bg-surface hover:bg-surface-alt
              border border-border/50 hover:border-primary/30
              rounded-full text-sm text-foreground
              transition-all duration-200
              shadow-sm hover:shadow-md
            "
          >
            <span className="text-base">{prompt.icon}</span>
            <span className="whitespace-nowrap">{prompt.text}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// Compact version for inline use
export function PromptChips({ 
  onSelect, 
  className = '',
  limit = 4,
}: { 
  onSelect: (prompt: string) => void; 
  className?: string;
  limit?: number;
}) {
  const prompts = quickPrompts.slice(0, limit);
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => onSelect(prompt.text)}
          className="
            flex items-center gap-1.5 px-3 py-1.5
            bg-surface/80 hover:bg-surface
            border border-border/30 hover:border-primary/30
            rounded-full text-xs text-muted-foreground hover:text-foreground
            transition-all duration-200
          "
        >
          <span>{prompt.icon}</span>
          <span className="truncate max-w-[150px]">{prompt.text}</span>
        </button>
      ))}
    </div>
  );
}

