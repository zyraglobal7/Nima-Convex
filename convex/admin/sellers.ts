import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import type { SellerTier } from '../types';
import { TIER_LIMITS, TIER_PRICES_KES } from '../types';

/**
 * Admin: upsert tier configuration for a specific tier.
 * Seeds from TIER_LIMITS defaults if the row doesn't exist yet.
 */
export const updateTierConfig = mutation({
  args: {
    tier: v.union(
      v.literal('basic'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('premium')
    ),
    maxProducts: v.union(v.number(), v.null()),
    revenueChartDays: v.number(),
    orderHistoryDays: v.union(v.number(), v.null()),
    topProductsLimit: v.union(v.number(), v.null()),
    showEngagementCounts: v.boolean(),
    showCartCounts: v.boolean(),
    priceKes: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      tier: SellerTier;
      maxProducts: number | null;
      revenueChartDays: number;
      orderHistoryDays: number | null;
      topProductsLimit: number | null;
      showEngagementCounts: boolean;
      showCartCounts: boolean;
      priceKes: number;
    }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const existing = await ctx.db
      .query('tier_config')
      .withIndex('by_tier', (q) => q.eq('tier', args.tier))
      .unique();

    const payload = {
      tier: args.tier,
      maxProducts: args.maxProducts,
      revenueChartDays: args.revenueChartDays,
      orderHistoryDays: args.orderHistoryDays,
      topProductsLimit: args.topProductsLimit,
      showEngagementCounts: args.showEngagementCounts,
      showCartCounts: args.showCartCounts,
      priceKes: args.priceKes,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert('tier_config', payload);
    }

    return null;
  },
});

/**
 * Admin: seed tier_config rows from hardcoded defaults (run once or to reset).
 */
export const seedTierConfigs = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx: MutationCtx): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const tiers: SellerTier[] = ['basic', 'starter', 'growth', 'premium'];
    const now = Date.now();

    for (const tier of tiers) {
      const existing = await ctx.db
        .query('tier_config')
        .withIndex('by_tier', (q) => q.eq('tier', tier))
        .unique();

      if (!existing) {
        const defaults = TIER_LIMITS[tier];
        const priceKes = tier === 'basic' ? 0 : TIER_PRICES_KES[tier as 'starter' | 'growth' | 'premium'];
        await ctx.db.insert('tier_config', {
          tier,
          maxProducts: defaults.maxProducts,
          revenueChartDays: defaults.revenueChartDays,
          orderHistoryDays: defaults.orderHistoryDays,
          topProductsLimit: defaults.topProductsLimit,
          showEngagementCounts: defaults.showEngagementCounts,
          showCartCounts: defaults.showCartCounts,
          priceKes,
          updatedAt: now,
        });
      }
    }

    return null;
  },
});

/**
 * Admin: override a seller's tier (for comped accounts or support)
 */
export const overrideSellerTier = mutation({
  args: {
    sellerId: v.id('sellers'),
    tier: v.union(
      v.literal('basic'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('premium')
    ),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { sellerId: Id<'sellers'>; tier: SellerTier }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const seller = await ctx.db.get(args.sellerId);
    if (!seller) throw new Error('Seller not found');

    await ctx.db.patch(args.sellerId, {
      tier: args.tier,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Admin: cancel a seller's active subscription
 * immediate=true downgrades to basic immediately; false lets them keep access until periodEnd
 */
export const cancelSellerSubscription = mutation({
  args: {
    subscriptionId: v.id('seller_subscriptions'),
    immediate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { subscriptionId: Id<'seller_subscriptions'>; immediate?: boolean }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error('Subscription not found');

    await ctx.db.patch(sub._id, {
      status: 'cancelled',
      updatedAt: Date.now(),
    });

    if (args.immediate) {
      await ctx.db.patch(sub.sellerId, {
        tier: 'basic',
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
