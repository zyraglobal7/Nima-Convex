'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AuroraThemeProps {
  children: ReactNode;
  slideIndex: number;
}

/**
 * Aurora Theme
 * Soft gradients, flowing shapes with gentle wave motion
 * Light, airy feel with pastel colors
 */
export function AuroraTheme({ children, slideIndex }: AuroraThemeProps) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50">
      {/* Animated aurora background shapes */}
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(244, 114, 182, 0.4) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />

      <motion.div
        className="absolute top-1/4 right-1/4 w-1/2 h-1/2 rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Content with slide animation */}
      <motion.div
        key={slideIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full h-full"
      >
        {children}
      </motion.div>

      {/* Subtle overlay pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

/**
 * Aurora theme slide transition variants
 */
export const auroraSlideVariants = {
  enter: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    y: -20,
  },
};

export const auroraTransition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
};

