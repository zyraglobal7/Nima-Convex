'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsDown, Bookmark } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

// Generic look type that works with real data
export interface LookData {
  id: string;
  imageUrl: string; // User try-on image URL
  styleTags: string[];
  occasion?: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface LookCarouselProps {
  looks: LookData[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onLikeLook: (lookId: string) => void;
  onDislikeLook: (lookId: string) => void;
  onSaveLook: (lookId: string) => void;
  className?: string;
}

export function LookCarousel({
  looks,
  currentIndex,
  onIndexChange,
  onLikeLook,
  onDislikeLook,
  onSaveLook,
  className = '',
}: LookCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  // Set up carousel event listener
  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      onIndexChange(api.selectedScrollSnap());
    };

    // Set initial index
    handleSelect();

    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, onIndexChange]);

  const currentLook = looks[currentIndex];

  return (
    <div className={`relative ${className}`}>
      {/* Carousel */}
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: 'center',
          loop: false,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {looks.map((look, index) => (
            <CarouselItem key={look.id} className="pl-2 md:pl-4 basis-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface"
              >
                {/* Try-on image */}
                <img
                  src={look.imageUrl}
                  alt={`Look ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Style tags */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {look.styleTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm rounded-full text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {look.occasion && (
                    <p className="text-xs text-white/80">
                      Perfect for {look.occasion}
                    </p>
                  )}
                </div>

                {/* Like/Save overlay actions */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onLikeLook(look.id)}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      backdrop-blur-md transition-colors
                      ${look.isLiked
                        ? 'bg-red-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }
                    `}
                  >
                    <Heart
                      className={`w-5 h-5 ${look.isLiked ? 'fill-current' : ''}`}
                    />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSaveLook(look.id)}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      backdrop-blur-md transition-colors
                      ${look.isSaved
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }
                    `}
                  >
                    <Bookmark
                      className={`w-5 h-5 ${look.isSaved ? 'fill-current' : ''}`}
                    />
                  </motion.button>
                </div>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation buttons - hidden on mobile, visible on desktop */}
        <CarouselPrevious className="hidden md:flex -left-12 w-10 h-10" />
        <CarouselNext className="hidden md:flex -right-12 w-10 h-10" />
      </Carousel>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {looks.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`
              transition-all duration-200
              ${index === currentIndex
                ? 'w-6 h-2 rounded-full bg-primary'
                : 'w-2 h-2 rounded-full bg-border hover:bg-muted-foreground'
              }
            `}
          />
        ))}
      </div>

      {/* Look counter */}
      <p className="text-center text-sm text-muted-foreground mt-2">
        Look {currentIndex + 1} of {looks.length}
      </p>

      {/* Quick action bar */}
      {currentLook && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 mt-4"
        >
          {/* Dislike */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDislikeLook(currentLook.id)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-surface border border-border/50 hover:border-destructive/50 transition-colors"
          >
            <ThumbsDown className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Not for me</span>
          </motion.button>

          {/* Like */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLikeLook(currentLook.id)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-xl transition-colors
              ${currentLook.isLiked
                ? 'bg-red-500/10 border-2 border-red-500'
                : 'bg-surface border border-border/50 hover:border-red-500/50'
              }
            `}
          >
            <Heart
              className={`w-5 h-5 ${currentLook.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
            <span className={`text-xs ${currentLook.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>
              Love it
            </span>
          </motion.button>

          {/* Save */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSaveLook(currentLook.id)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-xl transition-colors
              ${currentLook.isSaved
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-surface border border-border/50 hover:border-primary/50'
              }
            `}
          >
            <Bookmark
              className={`w-5 h-5 ${currentLook.isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
            <span className={`text-xs ${currentLook.isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
              Save
            </span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
