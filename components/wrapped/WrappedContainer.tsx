'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuroraTheme, GeometricTheme, FluidTheme } from './themes';

type Theme = 'aurora' | 'geometric' | 'fluid';

interface WrappedContainerProps {
  children: ReactNode[];
  theme: Theme;
  onClose?: () => void;
}

export function WrappedContainer({ children, theme, onClose }: WrappedContainerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const totalSlides = children.length;

  // Auto-advance timer
  useEffect(() => {
    if (!autoAdvance) return;

    const timer = setInterval(() => {
      if (currentSlide < totalSlides - 1) {
        setDirection(1);
        setCurrentSlide((prev) => prev + 1);
      } else {
        setAutoAdvance(false);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [autoAdvance, currentSlide, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, onClose]);

  const goNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [currentSlide, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goNext();
    } else if (isRightSwipe) {
      goPrev();
    }
  };

  // Render theme wrapper
  const renderTheme = (slideContent: ReactNode) => {
    switch (theme) {
      case 'aurora':
        return <AuroraTheme slideIndex={currentSlide}>{slideContent}</AuroraTheme>;
      case 'geometric':
        return <GeometricTheme slideIndex={currentSlide}>{slideContent}</GeometricTheme>;
      case 'fluid':
        return <FluidTheme slideIndex={currentSlide}>{slideContent}</FluidTheme>;
      default:
        return <AuroraTheme slideIndex={currentSlide}>{slideContent}</AuroraTheme>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-3">
        {children.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 rounded-full bg-black/10 overflow-hidden"
          >
            <motion.div
              className="h-full bg-black/40"
              initial={{ width: index < currentSlide ? '100%' : '0%' }}
              animate={{
                width:
                  index < currentSlide
                    ? '100%'
                    : index === currentSlide
                    ? '100%'
                    : '0%',
              }}
              transition={{
                duration: index === currentSlide ? (autoAdvance ? 5 : 0.3) : 0.3,
                ease: autoAdvance && index === currentSlide ? 'linear' : 'easeOut',
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Auto-advance toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70"
        onClick={() => setAutoAdvance(!autoAdvance)}
      >
        {autoAdvance ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </Button>

      {/* Main content area */}
      <div className="w-full h-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {renderTheme(children[currentSlide])}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 gap-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
          onClick={goPrev}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center px-4 bg-white/80 backdrop-blur-sm rounded-full">
          <span className="text-sm font-medium">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Tap areas for mobile navigation */}
      <div className="md:hidden absolute inset-0 flex z-20">
        <button
          className="w-1/3 h-full focus:outline-none"
          onClick={goPrev}
          disabled={currentSlide === 0}
          aria-label="Previous slide"
        />
        <div className="w-1/3 h-full" />
        <button
          className="w-1/3 h-full focus:outline-none"
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          aria-label="Next slide"
        />
      </div>
    </div>
  );
}

