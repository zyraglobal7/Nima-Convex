/**
 * Format a price value for display
 * @param priceInCents - Price in cents (smallest currency unit)
 * @param currency - Currency code (e.g., 'USD', 'KES')
 * @param showDecimals - Whether to show decimal places (default: false, true for checkout)
 * @returns Formatted price string
 */
export function formatPrice(priceInCents: number, currency: string = 'USD', showDecimals: boolean = false): string {
  const price = priceInCents / 100;
  if (showDecimals) {
    return `${currency} ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Format relative time from timestamp
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const now = Date.now();
  const date = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}
