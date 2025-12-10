'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import type { Look } from '@/lib/mock-data';
import { formatPrice } from '@/lib/mock-data';

interface LookCardProps {
  look: Look;
  index: number;
}

const heightClasses = {
  short: 'h-[200px]',
  medium: 'h-[280px]',
  tall: 'h-[340px]',
  'extra-tall': 'h-[400px]',
};

export function LookCard({ look, index }: LookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="break-inside-avoid mb-4"
    >
      <Link href={`/look/${look.id}`}>
        <div className="group relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          {/* Image */}
          <div className={`relative ${heightClasses[look.height]} overflow-hidden`}>
            <img
              src={look.imageUrl}
              alt={`Look featuring ${look.styleTags.join(', ')}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Price badge */}
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border/50">
              <span className="text-xs font-medium text-foreground">
                {formatPrice(look.totalPrice, look.currency)}
              </span>
            </div>
            
            {/* Quick like button - shows on hover */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-3 left-3 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={(e) => {
                e.preventDefault();
                // Handle like
              }}
            >
              <Heart className={`w-4 h-4 ${look.isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
            </motion.button>

            {/* Style tags - shows on hover */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {look.styleTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-full text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Card footer - minimal info */}
          <div className="p-3">
            <p className="text-xs text-muted-foreground">
              {look.occasion} • {look.products.length} items
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

