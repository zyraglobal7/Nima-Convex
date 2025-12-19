'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GeometricThemeProps {
  children: ReactNode;
  slideIndex: number;
}

/**
 * Geometric Theme
 * Sharp lines, grid patterns with bounce easing
 * Modern, structured feel with warm colors
 */
export function GeometricTheme({ children, slideIndex }: GeometricThemeProps) {
  // Generate rotating shapes based on slide index for variety
  const shapes = [
    { size: 120, top: '10%', left: '5%', rotate: slideIndex * 45, delay: 0 },
    { size: 80, top: '70%', left: '10%', rotate: slideIndex * -30, delay: 0.2 },
    { size: 100, top: '20%', right: '8%', rotate: slideIndex * 60, delay: 0.4 },
    { size: 60, bottom: '15%', right: '15%', rotate: slideIndex * -45, delay: 0.6 },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated geometric shapes */}
      {shapes.map((shape, index) => (
        <motion.div
          key={index}
          className="absolute border-2 border-amber-300/30"
          style={{
            width: shape.size,
            height: shape.size,
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
          }}
          initial={{ rotate: 0, scale: 0 }}
          animate={{
            rotate: shape.rotate,
            scale: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            delay: shape.delay,
          }}
        />
      ))}

      {/* Diagonal lines */}
      <motion.div
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-300/30 to-transparent"
        style={{ transform: 'rotate(45deg)', transformOrigin: 'top left' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      <motion.div
        className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-300/30 to-transparent"
        style={{ transform: 'rotate(45deg)', transformOrigin: 'bottom right' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 2 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      />

      {/* Content with slide animation */}
      <motion.div
        key={slideIndex}
        initial={{ opacity: 0, x: 50, rotateY: -5 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        exit={{ opacity: 0, x: -50, rotateY: 5 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 25,
        }}
        className="relative z-10 w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Geometric theme slide transition variants
 */
export const geometricSlideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 100 : -100,
    rotateY: direction > 0 ? -10 : 10,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -100 : 100,
    rotateY: direction > 0 ? 10 : -10,
  }),
};

export const geometricTransition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

