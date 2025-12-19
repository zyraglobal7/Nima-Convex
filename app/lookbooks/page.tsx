'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { LookbookCard } from '@/components/lookbooks/LookbookCard';
import { CreateLookbookModal } from '@/components/lookbooks/CreateLookbookModal';
import type { Doc } from '@/convex/_generated/dataModel';
import { MessagesIcon } from '@/components/messages/MessagesIcon';

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

export default function LookbooksPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const lookbooks = useQuery(api.lookbooks.queries.listUserLookbooks, { includeArchived: false });

  // We'll fetch cover images in the LookbookCard component individually
  // This avoids the complexity of batch queries

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
        {/* Header section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-foreground">
              Your Lookbooks
            </h2>
            <p className="text-muted-foreground mt-1">
              {lookbooks ? `${lookbooks.length} ${lookbooks.length === 1 ? 'lookbook' : 'lookbooks'}` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Lookbook
          </button>
        </div>

        {/* Lookbooks grid */}
        {lookbooks && lookbooks.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="columns-2 md:columns-3 lg:columns-4 gap-4"
          >
            {lookbooks.map((lookbook, index) => (
              <LookbookCardWithCover
                key={lookbook._id}
                lookbook={lookbook}
                index={index}
              />
            ))}
          </motion.div>
        ) : lookbooks && lookbooks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No lookbooks yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create your first lookbook to organize and save your favorite looks and items.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Lookbook
            </button>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading lookbooks...</p>
          </div>
        )}
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

