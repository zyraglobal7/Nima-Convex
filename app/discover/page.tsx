'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { NimaChatBubble, ApparelGrid, CreateLookSheet, LookCardWithCreator, LookCard, useFloatingLoader } from '@/components/discover';
import { DateGroupHeader } from '@/components/discover/DateGroupHeader';
import type { ApparelItem } from '@/components/discover/ApparelItemCard';
import { discoverWelcomeMessage } from '@/lib/mock-data';
import { Settings, Sparkles, User, Shirt } from 'lucide-react';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { Look, Product } from '@/lib/mock-data';
import { trackDiscoverPageViewed } from '@/lib/analytics';

type ViewState = 'loading' | 'generating' | 'ready';

// Extended Look type with creator info for Explore tab
interface LookWithCreator extends Look {
  isGenerating: boolean;
  generationFailed: boolean;
  creator?: {
    _id: Id<'users'>;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  } | null;
  isFriend?: boolean;
  hasPendingRequest?: boolean;
}

type FilterType = 'my-look' | 'explore' | 'apparel';
type MyLooksFilter = 'system' | 'user';

// Extended Look type with generation status for My Looks
interface LookWithStatus extends Look {
  isGenerating: boolean;
  generationFailed: boolean;
}

export default function DiscoverPage() {
  const [viewState, setViewState] = useState<ViewState>('ready');
  const [showWelcome, setShowWelcome] = useState(true);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('my-look');
  
  // My Looks filter state (By Nima / By Me)
  const [myLooksFilter, setMyLooksFilter] = useState<MyLooksFilter>('system');

  // Floating loader for non-blocking generation progress
  const floatingLoader = useFloatingLoader();
  // Store floatingLoader methods in ref for stable reference in effects
  const floatingLoaderRef = useRef(floatingLoader);
  floatingLoaderRef.current = floatingLoader;

  // Debug: Track renders (only in development, log every 10 renders to reduce noise)
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (process.env.NODE_ENV === 'development' && renderCountRef.current % 10 === 1) {
    console.log('[DISCOVER] Render count:', renderCountRef.current);
  }

  // Track if welcome dismiss timeout has been scheduled (prevents duplicate timeouts)
  const hasScheduledWelcomeDismiss = useRef(false);
  
  // Track previous workflow status to prevent effect from running on same data
  const prevWorkflowStatusRef = useRef<{ isComplete: boolean; completedCount: number } | null>(null);

  // Selection mode for Create a Look
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<Id<'items'>>>(new Set());
  const [showCreateLookSheet, setShowCreateLookSheet] = useState(false);

  // Convex queries and mutations
  const shouldStartWorkflow = useQuery(api.workflows.index.shouldStartOnboardingWorkflow);
  const workflowStatus = useQuery(api.workflows.index.getOnboardingWorkflowStatus);

  // Items for Apparel tab
  const itemsData = useQuery(
    api.items.queries.listItemsWithImages,
    activeFilter === 'apparel' ? { limit: 50 } : 'skip'
  );

  // Explore tab now includes both public looks and friends' looks with friend status
  const publicLooks = useQuery(
    api.looks.queries.getPublicLooks,
    activeFilter === 'explore' ? { limit: 50 } : 'skip'
  );

  // My Looks query (for My Look tab)
  const myLooksData = useQuery(
    api.looks.queries.getMyLooksByCreator,
    activeFilter === 'my-look' ? { createdBy: myLooksFilter, limit: 50 } : 'skip'
  );

  const startWorkflow = useMutation(api.workflows.index.startOnboardingWorkflow);

  // Track discover page view - only once on mount
  const hasTrackedPageView = useRef(false);
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('[DISCOVER] Tracking page view (once)');
      }
      trackDiscoverPageViewed({
        has_workflow: false, // Don't wait for query - track immediately
        is_authenticated: true,
      });
    }
    // Empty deps - only run once on mount
  }, []);

  // Start the workflow if needed - use floating loader instead of blocking view
  useEffect(() => {
    if (shouldStartWorkflow?.shouldStart && !workflowStarted) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DISCOVER] Starting onboarding workflow...');
      }
      setWorkflowStarted(true);
      
      startWorkflow()
        .then((result) => {
          if (result.success) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DISCOVER] Workflow started:', result.workflowId);
            }
            // Show the floating loader in workflow mode - use ref for stable reference
            floatingLoaderRef.current.startWorkflowLoading();
          } else {
            console.error('[DISCOVER] Failed to start workflow:', result.error);
          }
        })
        .catch((error) => {
          console.error('[DISCOVER] Error starting workflow:', error);
        });
    }
    // Note: floatingLoader excluded - using ref for stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartWorkflow, workflowStarted, startWorkflow]);

  // Check workflow status and update floating loader when complete
  // Uses value comparison to prevent effect from running when data hasn't actually changed
  useEffect(() => {
    if (!workflowStatus) return;

    // Compare with previous values to prevent duplicate runs
    const currentKey = `${workflowStatus.isComplete}-${workflowStatus.completedCount}`;
    const prevKey = prevWorkflowStatusRef.current 
      ? `${prevWorkflowStatusRef.current.isComplete}-${prevWorkflowStatusRef.current.completedCount}` 
      : null;
    
    if (currentKey === prevKey) return; // No actual change in values
    
    // Update the ref with current values
    prevWorkflowStatusRef.current = {
      isComplete: workflowStatus.isComplete,
      completedCount: workflowStatus.completedCount,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[DISCOVER] Workflow status changed:', workflowStatus);
    }

    if (workflowStatus.isComplete && workflowStatus.completedCount > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DISCOVER] Workflow complete!');
      }
      // Only schedule welcome dismiss timeout once
      if (!hasScheduledWelcomeDismiss.current) {
        hasScheduledWelcomeDismiss.current = true;
        setTimeout(() => setShowWelcome(false), 8000);
      }
    } else if (workflowStatus.hasLooks && workflowStatus.completedCount > 0) {
      // Has some completed looks - schedule welcome dismiss if not already done
      if (!hasScheduledWelcomeDismiss.current) {
        hasScheduledWelcomeDismiss.current = true;
        setTimeout(() => setShowWelcome(false), 8000);
      }
    }
  }, [workflowStatus]);

  // Transform explore looks data (includes creator info and friend status)
  // Using useMemo to prevent re-renders from Convex subscription updates
  const exploreLooks = useMemo((): LookWithCreator[] => {
    if (activeFilter !== 'explore' || !publicLooks) return [];
    
    const heights: Array<'short' | 'medium' | 'tall' | 'extra-tall'> = ['medium', 'tall', 'short', 'extra-tall'];
    
    return publicLooks.looks.map((lookData, index) => {
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
        nimaNote: lookData.look.nimaComment || "A beautifully curated look!",
        createdAt: new Date(lookData.look._creationTime),
        height: heights[index % heights.length],
        isLiked: false,
        isDisliked: false,
        isGenerating,
        generationFailed,
        creator: lookData.creator,
        isFriend: lookData.isFriend,
        hasPendingRequest: lookData.hasPendingRequest,
      };
    });
  }, [publicLooks, activeFilter]);

  // Transform My Looks data
  // Using useMemo to prevent re-renders from Convex subscription updates
  const myLooks = useMemo((): LookWithStatus[] => {
    if (activeFilter !== 'my-look' || !myLooksData) return [];
    
    const heights: Array<'short' | 'medium' | 'tall' | 'extra-tall'> = ['medium', 'tall', 'short', 'extra-tall'];
    
    return myLooksData.map((lookData, index) => {
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
  }, [myLooksData, activeFilter]);

  // Transform items data for Apparel grid
  const apparelItems: ApparelItem[] = (itemsData?.items || []).map((item) => ({
    _id: item._id,
    publicId: item.publicId,
    name: item.name,
    brand: item.brand,
    category: item.category,
    price: item.price,
    currency: item.currency,
    originalPrice: item.originalPrice,
    colors: item.colors,
    primaryImageUrl: item.primaryImageUrl,
    isFeatured: item.isFeatured,
  }));

  // Handle item selection for Create a Look
  const handleItemSelect = (itemId: Id<'items'>) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else if (newSet.size < 6) {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Get selected items for CreateLookSheet
  const selectedItemsArray = apparelItems.filter((item) => selectedItems.has(item._id));

  // Handle welcome message dismissal for users who already have looks
  useEffect(() => {
    if (shouldStartWorkflow && !shouldStartWorkflow.shouldStart) {
      // Hide welcome after 8 seconds if user has looks
      if (shouldStartWorkflow.reason === 'Looks already generated' || 
          shouldStartWorkflow.completedCount > 0) {
        setTimeout(() => setShowWelcome(false), 8000);
      }
    }
  }, [shouldStartWorkflow]);

  // Loading screen - only shown during initial load (not during generation)
  // Generation progress is now shown in the floating loader
  if (viewState === 'loading') {
    return (
      <GeneratingScreen 
        generationProgress={null}
        viewState={viewState}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/discover" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-serif font-semibold text-foreground">Nima</span>
              </Link>

              {/* Desktop Navigation - hidden on mobile */}
              <nav className="hidden md:flex items-center gap-6 ml-8">
                <Link href="/discover" className="text-sm font-medium text-primary">
                  Discover
                </Link>
                <Link href="/ask" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Ask Nima
                </Link>
                <Link href="/lookbooks" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Lookbooks
                </Link>
                <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Profile
                </Link>
              </nav>
            </div>

            {/* Page title - center (mobile only) */}
            <h1 className="md:hidden absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground">
              Discover
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
        {/* Welcome chat bubble */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="mb-8 max-w-2xl mx-auto"
            >
              <NimaChatBubble
                message={discoverWelcomeMessage}
                animate={true}
                size="md"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User greeting */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-serif text-foreground">
            {activeFilter === 'my-look' 
              ? 'Your curated looks ✨'
              : activeFilter === 'explore' 
                ? 'Discover new styles ✨'
                : 'Shop the collection ✨'
            }
          </h2>
          <p className="text-muted-foreground mt-1">
            {activeFilter === 'my-look'
              ? myLooks.length > 0 
                ? `${myLooks.length} looks ${myLooksFilter === 'system' ? 'curated by Nima' : 'created by you'}`
                : myLooksFilter === 'system' 
                  ? 'Looks curated by Nima for you'
                  : 'Looks you\'ve created'
              : activeFilter === 'explore'
                ? exploreLooks.length > 0 
                  ? `${exploreLooks.length} looks from the community`
                  : 'Explore looks shared by others'
                : 'Browse apparel items'
            }
          </p>
        </motion.div>

        {/* Filter tabs - 3 main pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {[
            { id: 'my-look' as FilterType, label: 'My Look', icon: Sparkles },
            { id: 'explore' as FilterType, label: 'Explore', icon: User },
            { id: 'apparel' as FilterType, label: 'Apparel', icon: Shirt },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id);
                // Reset selection mode when switching tabs
                if (filter.id !== 'apparel' && isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedItems(new Set());
                }
              }}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                transition-all duration-200
                ${activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-surface hover:bg-surface-alt text-foreground border border-border/50 hover:border-primary/30'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </motion.div>

        {/* Sub-elements under each tab */}
        <AnimatePresence mode="wait">
          {/* By Nima / By Me toggle - shown under My Look tab */}
          {activeFilter === 'my-look' && (
            <motion.div
              key="my-look-toggle"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 flex justify-center"
            >
              <div className="relative bg-surface-alt rounded-full p-1 flex">
                {/* Sliding background */}
                <motion.div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full"
                  initial={false}
                  animate={{
                    x: myLooksFilter === 'system' ? 0 : 'calc(100% + 4px)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
                
                {/* Buttons */}
                <button
                  onClick={() => setMyLooksFilter('system')}
                  className={`
                    relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200
                    ${myLooksFilter === 'system' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  By Nima
                </button>
                <button
                  onClick={() => setMyLooksFilter('user')}
                  className={`
                    relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200
                    ${myLooksFilter === 'user' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  By Me
                </button>
              </div>
            </motion.div>
          )}

          {/* Create a Look button - shown under Apparel tab */}
          {activeFilter === 'apparel' && (
            <motion.div
              key="apparel-create"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 flex justify-center"
            >
              <button
                onClick={() => {
                  if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedItems(new Set());
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className={`
                  px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-200 flex items-center gap-2
                  ${isSelectionMode
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover'
                  }
                `}
              >
                <Sparkles className="w-4 h-4" />
                {isSelectionMode ? 'Cancel Selection' : 'Create a Look'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selection mode indicator */}
        {isSelectionMode && activeFilter === 'apparel' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center mb-4"
          >
            <p className="text-sm text-primary font-medium">
              Select 2-6 items to create your look
              {selectedItems.size > 0 && ` (${selectedItems.size} selected)`}
            </p>
          </motion.div>
        )}

        {/* Looks grid / Apparel grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {activeFilter === 'apparel' ? (
            // Apparel grid
            <ApparelGrid
              items={apparelItems}
              isLoading={!itemsData}
              isSelectionMode={isSelectionMode}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
            />
          ) : activeFilter === 'my-look' ? (
            // My Looks grid
            <AnimatePresence mode="wait">
              <motion.div
                key={myLooksFilter}
                initial={{ opacity: 0, x: myLooksFilter === 'system' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: myLooksFilter === 'system' ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                {myLooksData === undefined ? (
                  // Loading skeleton
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="break-inside-avoid mb-4">
                        <div className="rounded-2xl bg-surface-alt border border-border/30 overflow-hidden animate-pulse">
                          <div className="aspect-[3/4] bg-surface" />
                          <div className="p-3 space-y-2">
                            <div className="h-3 bg-surface rounded w-1/3" />
                            <div className="h-4 bg-surface rounded w-2/3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : myLooks.length > 0 ? (
                  <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                    {myLooks.map((look, index) => (
                      <LookCard key={look.id} look={look} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {myLooksFilter === 'system' ? 'No looks from Nima yet' : 'No looks created yet'}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {myLooksFilter === 'system' 
                        ? 'Complete your onboarding to get personalized looks curated by Nima.'
                        : 'Create your own looks by selecting items from the Apparel tab.'
                      }
                    </p>
                    {myLooksFilter === 'system' && (
                      <Link 
                        href="/onboarding" 
                        className="inline-flex mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                      >
                        Complete Onboarding
                      </Link>
                    )}
                    {myLooksFilter === 'user' && (
                      <button
                        onClick={() => {
                          setActiveFilter('apparel');
                          setIsSelectionMode(true);
                        }}
                        className="inline-flex mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                      >
                        Create Your First Look
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            // Explore grid with creator info
            publicLooks === undefined ? (
              // Loading skeleton
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-4">
                    <div className="rounded-2xl bg-surface-alt border border-border/30 overflow-hidden animate-pulse">
                      <div className="aspect-[3/4] bg-surface" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-surface rounded w-1/3" />
                        <div className="h-4 bg-surface rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : exploreLooks.length > 0 ? (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {exploreLooks.map((look, index) => (
                  <LookCardWithCreator key={look.id} look={look} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No looks to explore yet
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Looks shared by other users and friends will appear here. Share your own looks to help others discover new styles!
                </p>
              </div>
            )
          )}
        </motion.div>
      </main>

      {/* Floating "Try On Selected" button */}
      <AnimatePresence>
        {isSelectionMode && selectedItems.size >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-0 right-0 z-40 px-4"
          >
            <div className="max-w-md mx-auto">
              <button
                onClick={() => setShowCreateLookSheet(true)}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Try On Selected ({selectedItems.size})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Look Sheet */}
      <CreateLookSheet
        isOpen={showCreateLookSheet}
        onClose={() => setShowCreateLookSheet(false)}
        selectedItems={selectedItemsArray}
        onClearSelection={() => {
          setSelectedItems(new Set());
          setIsSelectionMode(false);
        }}
      />

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs text-primary font-medium">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
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

// Custom generating screen that shows progress
function GeneratingScreen({ 
  generationProgress,
  viewState,
}: { 
  generationProgress: { pending: number; processing: number; completed: number; total: number } | null;
  viewState: ViewState;
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [key, setKey] = useState(0);

  const loadingMessages = [
    "Curating your perfect looks...",
    "Learning your unique style...",
    "Finding fits that complement you...",
    "Matching outfits to your preferences...",
    "Creating your personalized feed...",
    "Generating try-on images...",
    "Almost there, gorgeous...",
  ];

  // Calculate progress
  const progress = generationProgress && generationProgress.total > 0
    ? Math.round((generationProgress.completed / generationProgress.total) * 100)
    : viewState === 'loading' ? 10 : 30;

  // Cycle through messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      setKey((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, [loadingMessages.length]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Animated Background */}
      <div
        className="absolute inset-0 animate-rising-sun"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 100%, 
            var(--secondary) 0%, 
            transparent 50%),
            radial-gradient(ellipse 100% 80% at 50% 120%, 
            var(--primary) 0%, 
            transparent 40%),
            linear-gradient(to top, 
            rgba(201, 160, 122, 0.15) 0%, 
            rgba(166, 124, 82, 0.08) 30%, 
            transparent 60%)`,
        }}
      />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated glow orbs */}
      <motion.div
        className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full blur-3xl"
        style={{ background: 'var(--secondary)', opacity: 0.15 }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 30, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full blur-3xl"
        style={{ background: 'var(--primary)', opacity: 0.12 }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.08, 0.18, 0.08],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.7, 0.3],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          <Sparkles className="w-4 h-4 text-secondary/40" />
        </motion.div>
      ))}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-md text-center space-y-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-serif font-semibold tracking-tight text-foreground">
              Nima
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2 font-light">
              AI Stylist
            </p>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-foreground">
              Creating your looks
            </h2>
            <p className="text-muted-foreground">
              {generationProgress && generationProgress.total > 0
                ? `${generationProgress.completed} of ${generationProgress.total} looks ready`
                : 'This will just take a moment...'
              }
            </p>
          </motion.div>

          {/* Chat Bubble with cycling messages */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative"
          >
            <div className="bg-surface/90 backdrop-blur-md border border-border/50 rounded-2xl px-6 py-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-left min-w-[200px]">
                  <p className="text-xs text-muted-foreground mb-1">Nima</p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="text-foreground font-medium"
                    >
                      {loadingMessages[messageIndex]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {/* Bubble tail */}
            <div className="absolute -bottom-2 left-10 w-4 h-4 bg-surface/90 border-b border-r border-border/50 transform rotate-45" />
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-3"
          >
            <div className="h-1 bg-surface-alt rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {progress}% complete
            </p>
          </motion.div>

          {/* Generation status cards */}
          {generationProgress && generationProgress.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex justify-center gap-3"
            >
              {[...Array(generationProgress.total)].map((_, i) => {
                const isCompleted = i < generationProgress.completed;
                const isProcessing = i === generationProgress.completed && generationProgress.processing > 0;
                
                return (
                  <div
                    key={i}
                    className={`w-16 h-24 rounded-lg overflow-hidden border ${
                      isCompleted 
                        ? 'bg-primary/20 border-primary/50' 
                        : isProcessing 
                          ? 'bg-secondary/20 border-secondary/50' 
                          : 'bg-surface-alt border-border/50'
                    }`}
                  >
                    {isCompleted ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                    ) : isProcessing ? (
                      <div className="w-full h-full animate-pulse bg-gradient-to-b from-secondary/30 to-secondary/10" />
                    ) : (
                      <div className="w-full h-full animate-shimmer" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Placeholder cards when no progress yet */}
          {(!generationProgress || generationProgress.total === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex justify-center gap-3"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-16 h-24 rounded-lg bg-surface-alt overflow-hidden"
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  <div className="w-full h-full animate-shimmer" />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
