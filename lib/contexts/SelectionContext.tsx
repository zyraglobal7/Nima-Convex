'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Id } from '@/convex/_generated/dataModel';

interface SelectionContextValue {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Set of selected item IDs */
  selectedItemIds: Set<Id<'items'>>;
  /** Enable or disable selection mode */
  setSelectionMode: (mode: boolean) => void;
  /** Toggle an item's selection state */
  toggleItemSelection: (itemId: Id<'items'>) => void;
  /** Clear all selections and exit selection mode */
  clearSelection: () => void;
  /** Get the count of selected items */
  selectedCount: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

const MAX_SELECTION_SIZE = 6;

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [isSelectionMode, setIsSelectionModeState] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<Id<'items'>>>(new Set());

  const setSelectionMode = useCallback((mode: boolean) => {
    setIsSelectionModeState(mode);
    if (!mode) {
      // Clear selections when exiting selection mode
      setSelectedItemIds(new Set());
    }
  }, []);

  const toggleItemSelection = useCallback((itemId: Id<'items'>) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else if (newSet.size < MAX_SELECTION_SIZE) {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemIds(new Set());
    setIsSelectionModeState(false);
  }, []);

  const value: SelectionContextValue = {
    isSelectionMode,
    selectedItemIds,
    setSelectionMode,
    toggleItemSelection,
    clearSelection,
    selectedCount: selectedItemIds.size,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if used outside provider
 * Useful for components that might be rendered outside the selection context
 */
export function useSelectionOptional(): SelectionContextValue | null {
  return useContext(SelectionContext);
}



