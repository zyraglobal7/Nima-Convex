'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FluidThemeProps {
  children: ReactNode;
  slideIndex: number;
}

/**
 * Fluid Theme
 * Organic blobs, smooth curves with spring physics
 * Calm, natural feel with cool colors
 */
export function FluidTheme({ children, slideIndex }: FluidThemeProps) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Morphing blob 1 */}
      <motion.div
        className="absolute -top-20 -left-20 w-80 h-80 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.5) 0%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        }}
        animate={{
          borderRadius: [
            '60% 40% 30% 70% / 60% 30% 70% 40%',
            '30% 60% 70% 40% / 50% 60% 30% 60%',
            '60% 40% 30% 70% / 60% 30% 70% 40%',
          ],
          x: [0, 30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Morphing blob 2 */}
      <motion.div
        className="absolute -bottom-40 -right-20 w-96 h-96 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(20, 184, 166, 0.5) 0%, transparent 70%)',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
        }}
        animate={{
          borderRadius: [
            '40% 60% 70% 30% / 40% 50% 60% 50%',
            '60% 40% 30% 70% / 60% 30% 70% 40%',
            '40% 60% 70% 30% / 40% 50% 60% 50%',
          ],
          x: [0, -20, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />

      {/* Morphing blob 3 */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-64 h-64 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.5) 0%, transparent 70%)',
          borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
        }}
        animate={{
          borderRadius: [
            '50% 50% 50% 50% / 50% 50% 50% 50%',
            '40% 60% 60% 40% / 60% 40% 60% 40%',
            '50% 50% 50% 50% / 50% 50% 50% 50%',
          ],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-teal-300/40"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Content with slide animation */}
      <motion.div
        key={slideIndex}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1, y: -30 }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
        }}
        className="relative z-10 w-full h-full"
      >
        {children}
      </motion.div>

      {/* Subtle wave overlay */}
      <svg
        className="absolute bottom-0 left-0 w-full h-32 opacity-10"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          fill="currentColor"
          className="text-teal-600"
          d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,60 1440,60 L1440,120 L0,120 Z"
          animate={{
            d: [
              'M0,60 C360,120 720,0 1080,60 C1260,90 1380,60 1440,60 L1440,120 L0,120 Z',
              'M0,80 C360,20 720,100 1080,40 C1260,20 1380,80 1440,80 L1440,120 L0,120 Z',
              'M0,60 C360,120 720,0 1080,60 C1260,90 1380,60 1440,60 L1440,120 L0,120 Z',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
    </div>
  );
}

/**
 * Fluid theme slide transition variants
 */
export const fluidSlideVariants = {
  enter: {
    opacity: 0,
    scale: 0.9,
    y: 50,
  },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 1.1,
    y: -50,
  },
};

export const fluidTransition = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
};

