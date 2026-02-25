import type { QueryCtx, MutationCtx } from '../_generated/server';
import { TIER_LIMITS, TIER_PRICES_KES, type SellerTier } from '../types';

export type TierConfig = {
  maxProducts: number | null;
  revenueChartDays: number;
  orderHistoryDays: number | null;
  topProductsLimit: number | null;
  showEngagementCounts: boolean;
  showCartCounts: boolean;
  priceKes: number;
};

/**
 * Read tier config from DB, falling back to hardcoded defaults if no row exists yet.
 * Works in both query and mutation contexts.
 */
export async function getTierConfig(
  ctx: QueryCtx | MutationCtx,
  tier: SellerTier
): Promise<TierConfig> {
  const row = await ctx.db
    .query('tier_config')
    .withIndex('by_tier', (q) => q.eq('tier', tier))
    .unique();

  if (row) {
    return {
      maxProducts: row.maxProducts,
      revenueChartDays: row.revenueChartDays,
      orderHistoryDays: row.orderHistoryDays,
      topProductsLimit: row.topProductsLimit,
      showEngagementCounts: row.showEngagementCounts,
      showCartCounts: row.showCartCounts,
      priceKes: row.priceKes,
    };
  }

  // Fallback to hardcoded defaults
  const defaults = TIER_LIMITS[tier];
  const priceKes = tier === 'basic' ? 0 : TIER_PRICES_KES[tier as 'starter' | 'growth' | 'premium'];
  return {
    maxProducts: defaults.maxProducts,
    revenueChartDays: defaults.revenueChartDays,
    orderHistoryDays: defaults.orderHistoryDays,
    topProductsLimit: defaults.topProductsLimit,
    showEngagementCounts: defaults.showEngagementCounts,
    showCartCounts: defaults.showCartCounts,
    priceKes,
  };
}
