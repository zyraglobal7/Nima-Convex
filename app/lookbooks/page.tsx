'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Settings, User, Heart, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { LookbookCard } from '@/components/lookbooks/LookbookCard';
import { CreateLookbookModal } from '@/components/lookbooks/CreateLookbookModal';
import { LookCard } from '@/components/discover';
import type { Doc } from '@/convex/_generated/dataModel';
import type { Look, Product } from '@/lib/mock-data';
import { MessagesIcon } from '@/components/messages/MessagesIcon';

// Extended Look type with generation status
interface LookWithStatus extends Look {
  isGenerating: boolean;
  generationFailed: boolean;
}

// Wrapper component that fetches cover image
function LookbookCardWithCover({ lookbook, index }: { lookbook: Doc<'lookbooks'>; index: number }) {
  const lookbookWithCover = useQuery(api.lookbooks.queries.getLookbookWithCover, {
    lookbookId: lookbook._id,
  });

  return (
    <LookbookCard
      lookbook={lookbook}
      coverImageUrl={lookbookWithCover?.coverImageUrl || null}
      index={index}
    />
  );
}

type TabType = 'saved-looks' | 'lookbooks';

export default function LookbooksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('saved-looks');
  
  const lookbooks = useQuery(api.lookbooks.queries.listUserLookbooks, { includeArchived: false });
  const savedLooksData = useQuery(api.looks.queries.getSavedLooks, { limit: 50 });

  // Transform saved looks data to LookWithStatus format
  const [savedLooks, setSavedLooks] = useState<LookWithStatus[]>([]);

  useEffect(() => {
    if (savedLooksData) {
      const heights: Array<'short' | 'medium' | 'tall' | 'extra-tall'> = ['medium', 'tall', 'short', 'extra-tall'];
      
      const transformedLooks: LookWithStatus[] = savedLooksData.map((lookData, index) => {
        const products: Product[] = lookData.items.map((itemData) => ({
          id: itemData.item._id,
          name: itemData.item.name,
          brand: itemData.item.brand || 'Unknown',
          category: itemData.item.category as Product['category'],
          price: itemData.item.price,
          currency: itemData.item.currency,
          imageUrl: itemData.primaryImageUrl || '',
          storeUrl: '#',
          storeName: itemData.item.brand || 'Store',
          color: itemData.item.colors[0] || 'Mixed',
        }));

        const imageUrl = lookData.lookImage?.imageUrl || '';
        const isGenerating = lookData.lookImage?.status === 'pending' || lookData.lookImage?.status === 'processing';
        const generationFailed = lookData.lookImage?.status === 'failed';

        return {
          id: lookData.look._id,
          imageUrl,
          products,
          totalPrice: lookData.look.totalPrice,
          currency: lookData.look.currency,
          styleTags: lookData.look.styleTags,
          occasion: lookData.look.occasion || 'Everyday',
          nimaNote: lookData.look.nimaComment || "A look curated just for you!",
          createdAt: new Date(lookData.look._creationTime),
          height: heights[index % heights.length],
          isLiked: false,
          isDisliked: false,
          isGenerating,
          generationFailed,
        };
      });
      setSavedLooks(transformedLooks);
    } else {
      setSavedLooks([]);
    }
  }, [savedLooksData]);

  const savedLooksCount = savedLooks.length;
  const lookbooksCount = lookbooks?.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/discover" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-serif font-semibold text-foreground">Nima</span>
            </Link>

            {/* Page title - center */}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground">
              Lookbooks
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="p-2 rounded-full hover:bg-surface transition-colors">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
              <MessagesIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab switcher */}
        <div className="flex justify-center mb-6">
          <div className="relative bg-surface-alt rounded-full p-1 flex">
            {/* Sliding background */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full"
              initial={false}
              animate={{
                x: activeTab === 'saved-looks' ? 0 : 'calc(100% + 4px)',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
            
            {/* Buttons */}
            <button
              onClick={() => setActiveTab('saved-looks')}
              className={`
                relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${activeTab === 'saved-looks' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <Heart className="w-4 h-4" />
              Saved Looks
              <span className={`text-xs ${activeTab === 'saved-looks' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                ({savedLooksCount})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('lookbooks')}
              className={`
                relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200
                flex items-center gap-2
                ${activeTab === 'lookbooks' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <FolderOpen className="w-4 h-4" />
              Lookbooks
              <span className={`text-xs ${activeTab === 'lookbooks' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                ({lookbooksCount})
              </span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'saved-looks' ? (
            <motion.div
              key="saved-looks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Saved Looks Grid */}
              {savedLooks.length > 0 ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                  {savedLooks.map((look, index) => (
                    <LookCard key={look.id} look={look} index={index} />
                  ))}
                </div>
              ) : savedLooksData && savedLooksData.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No saved looks yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    When you save looks from your virtual try-ons, they will appear here.
                  </p>
                  <Link
                    href="/discover"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Start Creating Looks
                  </Link>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Loading saved looks...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="lookbooks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header section for lookbooks */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-serif text-foreground">
                    Your Lookbooks
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Organize your looks into collections
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>

              {/* Lookbooks grid */}
              {lookbooks && lookbooks.length > 0 ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                  {lookbooks.map((lookbook, index) => (
                    <LookbookCardWithCover
                      key={lookbook._id}
                      lookbook={lookbook}
                      index={index}
                    />
                  ))}
                </div>
              ) : lookbooks && lookbooks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No lookbooks yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Create lookbooks to organize and save your favorite looks into collections.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Lookbook
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Loading lookbooks...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Lookbook Modal */}
      <CreateLookbookModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-primary font-medium">Lookbooks</span>
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
