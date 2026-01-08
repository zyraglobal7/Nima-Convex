import { useRef } from 'react';

/**
 * Hook that preserves the last defined value from Convex queries.
 * Prevents UI flicker when queries transition through undefined states
 * during resubscriptions or tab switches.
 *
 * @param value - The current value (may be undefined during loading)
 * @param fallback - The initial fallback value when no data has been received yet
 * @returns The last defined value, or fallback if never defined
 */
export function useStableValue<T>(value: T | undefined, fallback: T): T {
  const ref = useRef<T>(fallback);

  if (value !== undefined) {
    ref.current = value;
  }

  return ref.current;
}

