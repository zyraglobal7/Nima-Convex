'use client';

import { Button } from '@/components/ui/button';
import { StepProps } from '../types';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function WelcomeStep({ onNext, onBack }: StepProps) {
  const steps = [
    { emoji: '👤', text: 'A bit about you' },
    { emoji: '🎨', text: 'Your style vibe' },
    { emoji: '📏', text: 'Your perfect fit' },
    { emoji: '📍', text: 'Where you are & your budget' },
    { emoji: '📸', text: 'How you look (the fun part!)' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-2 rounded-full hover:bg-surface transition-colors duration-200"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="max-w-md text-center space-y-8">
        {/* Avatar placeholder - could be an illustration or animated character */}
        <motion.div 
          className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.span 
            className="text-5xl"
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            ✨
          </motion.span>
        </motion.div>

        {/* Greeting */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">
            Hey gorgeous!
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            I&apos;m <span className="text-primary font-medium">Nima</span>, your personal AI stylist. 
            Let&apos;s get you set up so I can show you <em>your</em> best looks.
          </p>
        </motion.div>

        {/* What to expect */}
        <motion.div 
          className="bg-surface rounded-2xl p-6 text-left space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm font-medium text-foreground">In the next few steps, I&apos;ll learn about:</p>
          <ul className="space-y-3">
            {steps.map((item, i) => (
              <motion.li 
                key={i} 
                className="flex items-center gap-3 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
              >
                <span className="text-lg">{item.emoji}</span>
                <span>{item.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Time estimate */}
        <motion.p 
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          Takes about 2-3 minutes
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <Button
            onClick={onNext}
            size="lg"
            className="w-full max-w-xs h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          >
            Let&apos;s do this
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
