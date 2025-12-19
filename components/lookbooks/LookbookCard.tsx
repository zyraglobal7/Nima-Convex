'use client';

import { motion } from 'framer-motion';
import { Lock, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Doc } from '@/convex/_generated/dataModel';

interface LookbookCardProps {
  lookbook: Doc<'lookbooks'>;
  coverImageUrl: string | null;
  index: number;
}

export function LookbookCard({ lookbook, coverImageUrl, index }: LookbookCardProps) {
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
      <Link href={`/lookbooks/${lookbook._id}`}>
        <div className="group relative overflow-hidden rounded-2xl bg-surface border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          {/* Cover Image */}
          <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt">
            {coverImageUrl ? (
              <Image
                src={coverImageUrl}
                alt={lookbook.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Sparkles className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Public/Private badge */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-full border border-border/50 flex items-center gap-1">
              {lookbook.isPublic ? (
                <>
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Private</span>
                </>
              )}
            </div>
          </div>

          {/* Card footer */}
          <div className="p-4">
            <h3 className="font-medium text-foreground mb-1 line-clamp-1">{lookbook.name}</h3>
            {lookbook.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lookbook.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {lookbook.itemCount} {lookbook.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

