'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, Heart, Users, ArrowLeft, User } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatPrice } from '@/lib/utils/format';
import { trackExplorePageViewed } from '@/lib/analytics';

export default function ExplorePage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  // Track page view
  useEffect(() => {
    trackExplorePageViewed({ tab: selectedFilter });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch public looks
  const publicLooksData = useQuery(api.looks.queries.getPublicLooks, { limit: 20 });

  const filters = ['All', 'Casual', 'Work', 'Date Night', 'Party', 'Weekend'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link href="/ask" className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Page title - center */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-medium text-foreground">
                Explore
              </h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page intro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">
            Explore ✨
          </h2>
          <p className="text-muted-foreground mt-1">
            Discover outfits shared by other people
          </p>
        </motion.div>

        {/* Filter tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-200
                ${selectedFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface hover:bg-surface-alt text-foreground border border-border/50 hover:border-primary/30'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </motion.div>

        {/* Loading state */}
        {!publicLooksData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-surface-alt animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {publicLooksData && publicLooksData.looks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">
              No public looks yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Be the first to share your style! Create a look and make it public 
              to inspire others.
            </p>
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create Your Look
            </Link>
          </motion.div>
        )}

        {/* Looks grid - Pinterest-style masonry */}
        {publicLooksData && publicLooksData.looks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
          >
            {publicLooksData.looks
              .filter((lookData) => {
                if (selectedFilter === 'All') return true;
                const occasion = lookData.look.occasion?.toLowerCase() || '';
                const tags = lookData.look.styleTags.map(t => t.toLowerCase());
                const filterLower = selectedFilter.toLowerCase();
                return occasion.includes(filterLower) || tags.some(t => t.includes(filterLower));
              })
              .map((lookData, index) => (
                <PublicLookCard
                  key={lookData.look._id}
                  look={lookData}
                  index={index}
                />
              ))}
          </motion.div>
        )}

        {/* Load more */}
        {publicLooksData && publicLooksData.hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="py-12 text-center"
          >
            <button className="px-6 py-3 bg-surface hover:bg-surface-alt border border-border/50 hover:border-primary/30 rounded-full text-sm font-medium transition-all duration-200">
              Load more looks
            </button>
          </motion.div>
        )}
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-40">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-1 p-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs text-primary font-medium">Explore</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}

// Public Look Card component
interface PublicLookCardProps {
  look: {
    look: {
      _id: string;
      totalPrice: number;
      currency: string;
      styleTags: string[];
      occasion?: string;
      nimaComment?: string;
      viewCount?: number;
      saveCount?: number;
    };
    lookImage: {
      imageUrl: string | null;
    } | null;
    creator: {
      _id: string;
      firstName?: string;
      username?: string;
      profileImageUrl?: string;
    } | null;
    itemCount: number;
  };
  index: number;
}

function PublicLookCard({ look, index }: PublicLookCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Determine card height for masonry effect
  const heights = ['aspect-[3/4]', 'aspect-[3/5]', 'aspect-[4/5]', 'aspect-[3/4]'];
  const heightClass = heights[index % heights.length];

  const imageUrl = look.lookImage?.imageUrl || 
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop';

  const creatorName = look.creator?.firstName || look.creator?.username || 'Anonymous';
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="break-inside-avoid mb-4"
    >
      <Link href={`/look/${look.look._id}`}>
        <div className={`relative ${heightClass} rounded-2xl overflow-hidden group cursor-pointer`}>
          {/* Image */}
          <Image
            src={imageUrl}
            alt={look.look.occasion || 'Look'}
            fill
            unoptimized={imageUrl.includes('convex.cloud') || imageUrl.includes('convex.site')}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Like button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              isLiked
                ? 'bg-red-500 text-white'
                : 'bg-black/30 backdrop-blur-sm text-white hover:bg-black/50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          {/* Creator badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
            {look.creator?.profileImageUrl ? (
              <Image
                src={look.creator.profileImageUrl}
                alt={creatorName}
                width={20}
                height={20}
                unoptimized={look.creator.profileImageUrl.includes('convex.cloud') || look.creator.profileImageUrl.includes('convex.site')}
                className="rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-[10px] font-medium text-white">{creatorInitial}</span>
              </div>
            )}
            <span className="text-xs text-white font-medium truncate max-w-[80px]">
              {creatorName}
            </span>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-2">
              {look.look.styleTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Price and items */}
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">
                {formatPrice(look.look.totalPrice, look.look.currency)}
              </span>
              <span className="text-white/70 text-xs">
                {look.itemCount} items
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
