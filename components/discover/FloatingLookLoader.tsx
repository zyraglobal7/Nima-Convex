'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { playSuccessSound } from '@/lib/utils/notifications';

interface FloatingLoaderState {
  isVisible: boolean;
  lookId: Id<'looks'> | null;
  isMinimized: boolean;
  status: 'generating' | 'completed' | 'failed';
  mode: 'single' | 'workflow'; // 'single' for single look, 'workflow' for onboarding
}

interface FloatingLoaderContextType {
  state: FloatingLoaderState;
  startLoading: (lookId: Id<'looks'>) => void;
  startWorkflowLoading: () => void;
  dismiss: () => void;
  minimize: () => void;
  expand: () => void;
}

const FloatingLoaderContext = createContext<FloatingLoaderContextType | null>(null);

export function useFloatingLoader() {
  const context = useContext(FloatingLoaderContext);
  if (!context) {
    throw new Error('useFloatingLoader must be used within FloatingLoaderProvider');
  }
  return context;
}

export function FloatingLoaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FloatingLoaderState>({
    isVisible: false,
    lookId: null,
    isMinimized: false,
    status: 'generating',
    mode: 'single',
  });

  const startLoading = useCallback((lookId: Id<'looks'>) => {
    setState({
      isVisible: true,
      lookId,
      isMinimized: false,
      status: 'generating',
      mode: 'single',
    });
  }, []);

  const startWorkflowLoading = useCallback(() => {
    setState({
      isVisible: true,
      lookId: null,
      isMinimized: false,
      status: 'generating',
      mode: 'workflow',
    });
  }, []);

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false, lookId: null }));
  }, []);

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }));
  }, []);

  const expand = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }));
  }, []);

  const updateStatus = useCallback((status: 'generating' | 'completed' | 'failed') => {
    setState(prev => ({ ...prev, status }));
  }, []);

  return (
    <FloatingLoaderContext.Provider value={{ state, startLoading, startWorkflowLoading, dismiss, minimize, expand }}>
      {children}
      <FloatingLookLoaderUI 
        state={state} 
        onDismiss={dismiss}
        onMinimize={minimize}
        onExpand={expand}
        onStatusChange={updateStatus}
      />
    </FloatingLoaderContext.Provider>
  );
}

interface FloatingLookLoaderUIProps {
  state: FloatingLoaderState;
  onDismiss: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  onStatusChange: (status: 'generating' | 'completed' | 'failed') => void;
}

function FloatingLookLoaderUI({
  state,
  onDismiss,
  onMinimize,
  onExpand,
  onStatusChange,
}: FloatingLookLoaderUIProps) {
  const router = useRouter();
  const hasUpdatedRef = useRef(false);

  // Poll for single look status when we have a lookId
  const lookStatus = useQuery(
    api.looks.queries.getLookGenerationStatus,
    state.mode === 'single' && state.lookId ? { lookId: state.lookId } : 'skip'
  );

  // Poll for workflow status when in workflow mode
  const workflowStatus = useQuery(
    api.workflows.index.getOnboardingWorkflowStatus,
    state.mode === 'workflow' && state.isVisible ? {} : 'skip'
  );

  // Update status based on query result for single look mode
  useEffect(() => {
    if (state.mode === 'single' && lookStatus) {
      if (lookStatus.status === 'completed' && state.status !== 'completed') {
        onStatusChange('completed');
        // Play success sound when generation completes
        playSuccessSound();
      } else if (lookStatus.status === 'failed' && state.status !== 'failed') {
        onStatusChange('failed');
      }
    }
  }, [lookStatus, state.mode, state.status, onStatusChange]);

  // Update status based on workflow status for workflow mode
  useEffect(() => {
    if (state.mode === 'workflow' && workflowStatus) {
      if (workflowStatus.isComplete && workflowStatus.completedCount > 0 && state.status !== 'completed') {
        onStatusChange('completed');
        // Play success sound when workflow completes
        playSuccessSound();
      } else if (workflowStatus.hasLooks && workflowStatus.failedCount > 0 && workflowStatus.completedCount === 0 && state.status !== 'failed') {
        onStatusChange('failed');
      }
    }
  }, [workflowStatus, state.mode, state.status, onStatusChange]);

  const handleOpenNow = () => {
    onDismiss();
    // Navigate to discover page with my_looks filter to see generated looks
    router.push('/discover?tab=my_looks');
  };

  const handleViewLook = () => {
    onDismiss();
    if (state.lookId) {
      router.push(`/look/${state.lookId}`);
    } else {
      // For workflow mode, go to my looks
      router.push('/discover?tab=my_looks');
    }
  };

  if (!state.isVisible) return null;

  // Get progress info for workflow mode
  const progressInfo = state.mode === 'workflow' && workflowStatus ? {
    completed: workflowStatus.completedCount,
    total: workflowStatus.totalCount,
    percent: workflowStatus.totalCount > 0 
      ? Math.round((workflowStatus.completedCount / workflowStatus.totalCount) * 100) 
      : 0,
  } : null;

  return (
    <AnimatePresence>
      {state.isMinimized ? (
        // Minimized state - small floating button
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={onExpand}
          className="fixed top-20 right-4 z-50 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          {state.status === 'completed' ? (
            <Check className="w-6 h-6 text-primary-foreground" />
          ) : state.status === 'failed' ? (
            <X className="w-6 h-6 text-primary-foreground" />
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          )}
        </motion.button>
      ) : (
        // Expanded state - floating card
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
        >
          <div className="bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {state.status === 'completed' ? (
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                ) : state.status === 'failed' ? (
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </motion.div>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {state.status === 'completed'
                      ? state.mode === 'workflow' ? 'Looks Ready!' : 'Look Ready!'
                      : state.status === 'failed'
                      ? 'Generation Failed'
                      : state.mode === 'workflow' ? 'Creating Your Looks...' : 'Generating Look...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {state.status === 'completed'
                      ? state.mode === 'workflow' 
                        ? `${progressInfo?.total || 'Your'} looks are ready to view` 
                        : 'Your look is ready to view'
                      : state.status === 'failed'
                      ? 'Something went wrong'
                      : progressInfo 
                        ? `${progressInfo.completed}/${progressInfo.total} looks complete`
                        : 'This may take a moment'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onMinimize}
                  className="p-1.5 rounded-full hover:bg-surface-alt transition-colors"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={onDismiss}
                  className="p-1.5 rounded-full hover:bg-surface-alt transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {state.status === 'generating' && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      {progressInfo ? (
                        // Actual progress bar for workflow mode
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: '0%' }}
                          animate={{ width: `${progressInfo.percent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      ) : (
                        // Indeterminate progress for single look mode
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 15, ease: 'linear', repeat: Infinity }}
                        />
                      )}
                    </div>
                  </div>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              )}

              {state.status === 'completed' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenNow}
                    className="flex-1 py-2.5 px-4 bg-surface rounded-xl text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
                  >
                    My Looks
                  </button>
                  <button
                    onClick={handleViewLook}
                    className="flex-1 py-2.5 px-4 bg-primary rounded-xl text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </button>
                </div>
              )}

              {state.status === 'failed' && (
                <button
                  onClick={onDismiss}
                  className="w-full py-2.5 px-4 bg-surface rounded-xl text-sm font-medium text-foreground hover:bg-surface-alt transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export the component for direct use without context
export function FloatingLookLoader() {
  return null; // The actual UI is rendered by FloatingLoaderProvider
}

