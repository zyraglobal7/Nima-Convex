'use client';

import { motion } from 'framer-motion';

interface ColorData {
  color: string;
  percentage: number;
}

interface ColorPaletteSlideProps {
  colorPalette: ColorData[];
}

// Color to emoji mapping
const colorEmojis: Record<string, string> = {
  black: '🖤',
  white: '🤍',
  beige: '🤎',
  grey: '🩶',
  gray: '🩶',
  navy: '💙',
  blue: '💙',
  green: '💚',
  red: '❤️',
  pink: '💗',
  brown: '🤎',
  cream: '🤍',
  burgundy: '🍷',
  purple: '💜',
  yellow: '💛',
  orange: '🧡',
  gold: '✨',
  silver: '🩶',
};

// Color to CSS color value mapping
const colorValues: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  beige: '#d4b896',
  grey: '#6b7280',
  gray: '#6b7280',
  navy: '#1e3a5f',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  pink: '#ec4899',
  brown: '#8b5a2b',
  cream: '#fffdd0',
  burgundy: '#722f37',
  purple: '#a855f7',
  yellow: '#eab308',
  orange: '#f97316',
  gold: '#d4af37',
  silver: '#c0c0c0',
  'light blue': '#87ceeb',
  'charcoal gray': '#36454f',
  'charcoal': '#36454f',
};

function getColorEmoji(color: string): string {
  const normalized = color.toLowerCase();
  return colorEmojis[normalized] || '🎨';
}

function getColorValue(color: string): string {
  const normalized = color.toLowerCase();
  return colorValues[normalized] || 'var(--primary)';
}

export function ColorPaletteSlide({ colorPalette }: ColorPaletteSlideProps) {
  // Determine the "vibe" based on colors
  const getColorVibe = (): string => {
    const colorNames = colorPalette.map((c) => c.color.toLowerCase());
    const neutrals = ['black', 'white', 'grey', 'gray', 'beige', 'cream', 'tan'];
    const neutralCount = colorNames.filter((c) => neutrals.includes(c)).length;

    if (neutralCount >= 3) return 'Minimal with a pop';
    if (colorNames.includes('black') && colorNames.length <= 3) return 'Dark & mysterious';
    if (colorNames.some((c) => ['pink', 'red', 'purple'].includes(c)))
      return 'Bold & romantic';
    return 'Perfectly balanced';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <span className="text-5xl">🎨</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm uppercase tracking-widest text-[#302B28] mb-2"
      >
        Your Color Palette
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-3xl md:text-4xl font-serif font-bold mb-2 text-[#302B28]"
      >
        You lived in:
      </motion.h2>

      <div className="w-full max-w-md mt-8 space-y-4">
        {colorPalette.slice(0, 5).map((color, index) => (
          <motion.div
            key={color.color}
            initial={{ opacity: 0, x: -30, width: 0 }}
            animate={{ opacity: 1, x: 0, width: '100%' }}
            transition={{ delay: 0.5 + index * 0.15, duration: 0.5 }}
            className="relative"
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl">{getColorEmoji(color.color)}</span>
              <span className="font-medium text-[#302B28]">{color.color}</span>
              <span className="ml-auto text-[#302B28]">{color.percentage}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${color.percentage}%` }}
                transition={{ delay: 0.7 + index * 0.15, duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: getColorValue(color.color) }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="mt-10 px-6 py-3 rounded-full bg-primary/10"
      >
        <p className="text-lg font-medium text-primary">Your vibe: {getColorVibe()}</p>
      </motion.div>
    </div>
  );
}

