import { mutation, internalMutation, query, QueryCtx, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id, Doc } from '../_generated/dataModel';
import { TIER_PRICES_KES, generateSubscriptionTransactionId, type SellerTier } from '../types';

const tierValidator = v.union(
  v.literal('starter'),
  v.literal('growth'),
  v.literal('premium')
);

const subscriptionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('expired'),
  v.literal('cancelled'),
  v.literal('failed')
);

// ============================================
// HELPERS
// ============================================

async function getSellerForUser(ctx: QueryCtx | MutationCtx, workosUserId: string) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
    .unique();
  if (!user) return null;
  const seller = await ctx.db
    .query('sellers')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();
  return seller;
}

// ============================================
// PUBLIC QUERIES
// ============================================

/**
 * Get the current active subscription for the seller
 */
export const getCurrentSubscription = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('seller_subscriptions'),
      _creationTime: v.number(),
      tier: tierValidator,
      status: subscriptionStatusValidator,
      periodStart: v.optional(v.number()),
      periodEnd: v.optional(v.number()),
      amountKes: v.number(),
      merchantTransactionId: v.string(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const seller = await getSellerForUser(ctx, identity.subject);
    if (!seller) return null;

    const active = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_seller_and_status', (q) =>
        q.eq('sellerId', seller._id).eq('status', 'active')
      )
      .order('desc')
      .first();
    if (!active) return null;

    return {
      _id: active._id,
      _creationTime: active._creationTime,
      tier: active.tier,
      status: active.status,
      periodStart: active.periodStart,
      periodEnd: active.periodEnd,
      amountKes: active.amountKes,
      merchantTransactionId: active.merchantTransactionId,
      createdAt: active.createdAt,
    };
  },
});

/**
 * Get full subscription history for the current seller
 */
export const getSubscriptionHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('seller_subscriptions'),
      _creationTime: v.number(),
      tier: tierValidator,
      status: subscriptionStatusValidator,
      periodStart: v.optional(v.number()),
      periodEnd: v.optional(v.number()),
      amountKes: v.number(),
      merchantTransactionId: v.string(),
      failureReason: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const seller = await getSellerForUser(ctx, identity.subject);
    if (!seller) return [];

    const rows = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .order('desc')
      .collect();

    return rows.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      tier: s.tier,
      status: s.status,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      amountKes: s.amountKes,
      merchantTransactionId: s.merchantTransactionId,
      failureReason: s.failureReason,
      createdAt: s.createdAt,
    }));
  },
});

/**
 * Poll subscription status by merchantTransactionId (used after initiating payment)
 */
export const getSubscriptionByTransactionId = query({
  args: { merchantTransactionId: v.string() },
  returns: v.union(
    v.object({
      status: subscriptionStatusValidator,
      tier: tierValidator,
      periodEnd: v.optional(v.number()),
      failureReason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { merchantTransactionId: string }
  ): Promise<{ status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed'; tier: 'starter' | 'growth' | 'premium'; periodEnd?: number; failureReason?: string } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const sub = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();
    if (!sub) return null;

    return {
      status: sub.status,
      tier: sub.tier,
      periodEnd: sub.periodEnd,
      failureReason: sub.failureReason,
    };
  },
});

// ============================================
// PUBLIC MUTATIONS
// ============================================

/**
 * Initiate a subscription upgrade — creates pending record and triggers STK push
 */
export const initiateSubscription = mutation({
  args: {
    tier: tierValidator,
    phoneNumber: v.string(),
  },
  returns: v.object({
    merchantTransactionId: v.string(),
    amountKes: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { tier: 'starter' | 'growth' | 'premium'; phoneNumber: string }
  ): Promise<{ merchantTransactionId: string; amountKes: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const seller = await getSellerForUser(ctx, identity.subject);
    if (!seller) throw new Error('Seller profile not found');

    // Clean phone number (remove spaces, dashes) to prevent Fingo API errors
    const cleanPhone = args.phoneNumber.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error(cleanPhone)
      throw new Error('Invalid phone number format. Use Kenyan format (e.g., 0712345678 or +254712345678)');
      
    }

    // Cancel any existing pending subscriptions to avoid duplicate STK pushes
    const pendingSubs = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_seller_and_status', (q) =>
        q.eq('sellerId', seller._id).eq('status', 'pending')
      )
      .collect();
    for (const sub of pendingSubs) {
      await ctx.db.patch(sub._id, { status: 'cancelled', updatedAt: Date.now() });
    }

    const amountKes = TIER_PRICES_KES[args.tier];
    const merchantTransactionId = generateSubscriptionTransactionId();
    const now = Date.now();
    await ctx.db.insert('seller_subscriptions', {
      sellerId: seller._id,
      tier: args.tier,
      status: 'pending',
      amountKes,
      phoneNumber: cleanPhone,
      merchantTransactionId,
      createdAt: now,
      updatedAt: now,
    });

    // Trigger Fingo Pay STK Push — the webhook at /webhooks/fingo will call
    // activateSubscription when payment succeeds (or failSubscription on failure).
    await ctx.scheduler.runAfter(0, internal.sellers.subscriptionActions.callFingoPaySubscriptionSTKPush, {
      merchantTransactionId,
      amountKes,
      phoneNumber: cleanPhone,
      tier: args.tier,
    });

    return { merchantTransactionId, amountKes };
  },
});

// ============================================
// INTERNAL MUTATIONS (called by webhook + cron)
// ============================================

/**
 * Activate a subscription after successful payment
 */
export const activateSubscription = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    fingoTransactionId: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; fingoTransactionId: string }
  ): Promise<null> => {
    const sub = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!sub) {
      console.error('[SUBSCRIPTIONS] activateSubscription: sub not found', args.merchantTransactionId);
      return null;
    }

    if (sub.status !== 'pending') {
      console.warn('[SUBSCRIPTIONS] activateSubscription: sub already processed', sub.status);
      return null;
    }

    const now = Date.now();
    const periodStart = now;
    const periodEnd = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Cancel any previously active subscriptions for this seller so we never
    // have two 'active' rows at once (which would skew the admin billing stats).
    const prevActive = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_seller_and_status', (q) =>
        q.eq('sellerId', sub.sellerId).eq('status', 'active')
      )
      .collect();
    for (const prev of prevActive) {
      if (prev._id !== sub._id) {
        await ctx.db.patch(prev._id, { status: 'cancelled', updatedAt: now });
      }
    }

    await ctx.db.patch(sub._id, {
      status: 'active',
      fingoTransactionId: args.fingoTransactionId,
      periodStart,
      periodEnd,
      updatedAt: now,
    });

    // Update seller's tier
    await ctx.db.patch(sub.sellerId, {
      tier: sub.tier,
      updatedAt: now,
    });

    return null;
  },
});



/**
 * Mark a subscription as failed after payment failure
 */
export const failSubscription = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; reason: string }
  ): Promise<null> => {
    const sub = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!sub) return null;

    await ctx.db.patch(sub._id, {
      status: 'failed',
      failureReason: args.reason,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Expire subscriptions past their periodEnd and downgrade sellers to basic
 * Called daily by cron
 */
export const expireSubscriptions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx: MutationCtx): Promise<null> => {
    const now = Date.now();

    // Find all active subscriptions whose period has ended
    const activeSubs = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    const expired = activeSubs.filter((s) => s.periodEnd !== undefined && s.periodEnd < now);

    for (const sub of expired) {
      await ctx.db.patch(sub._id, {
        status: 'expired',
        updatedAt: now,
      });
      // Downgrade seller to basic
      await ctx.db.patch(sub.sellerId, {
        tier: 'basic',
        updatedAt: now,
      });
      console.log(`[SUBSCRIPTIONS] Expired subscription for seller ${sub.sellerId}, downgraded to basic`);
    }

    return null;
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

/**
 * Admin: force-set a seller's tier (for comped accounts or support cases)
 */
export const adminOverrideTier = internalMutation({
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
    await ctx.db.patch(args.sellerId, {
      tier: args.tier,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Admin: cancel an active subscription (returns seller to basic at period end or immediately)
 */
export const adminCancelSubscription = internalMutation({
  args: {
    subscriptionId: v.id('seller_subscriptions'),
    immediate: v.optional(v.boolean()), // if true, downgrade to basic right now
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { subscriptionId: Id<'seller_subscriptions'>; immediate?: boolean }
  ): Promise<null> => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) return null;

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
