'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, MessageCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface FittingRoomCardProps {
  sessionId: string;
  lookCount?: number;
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FittingRoomCard({
  sessionId,
  lookCount = 4,
  animate = true,
  onClick,
  className = '',
}: FittingRoomCardProps) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={`flex justify-start ${className}`}
    >
      <div className="flex items-end gap-2 max-w-[90%] w-full sm:max-w-[85%]">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-1">
          <MessageCircle className="w-4 h-4 text-primary-foreground" />
        </div>

        {/* Card */}
        <div className="flex-1 rounded-2xl rounded-bl-md border border-border/50 bg-surface overflow-hidden">
          {/* Success header */}
          <div className="px-5 py-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
              >
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Found {lookCount} perfect looks for you! ✨
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your personalized outfits are ready
                </p>
              </div>
            </div>
          </div>

          {/* CTA section */}
          <div className="px-5 py-4 border-t border-border/30">
            <Link
              href={`/fitting/${sessionId}`}
              onClick={onClick}
              className="group flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center group-hover:from-secondary/30 group-hover:to-primary/30 transition-all duration-300">
                  <Sparkles className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    Step into the Fitting Room
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try on and customize your looks
                  </p>
                </div>
              </div>
              
              <motion.div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                whileHover={{ x: 4 }}
              >
                <ArrowRight className="w-5 h-5 text-primary" />
              </motion.div>
            </Link>
          </div>

          {/* Decorative sparkles */}
          <motion.div
            className="absolute top-2 right-2 opacity-50"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Sparkles className="w-4 h-4 text-secondary" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

