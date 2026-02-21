import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import {
  FREE_WEEKLY_CREDITS,
  CREDIT_PACKAGES,
  calculateAvailableCredits,
} from '../types';

/**
 * Get the current user's credit balance
 * Returns free remaining this week + purchased credits + total
 */
export const getUserCredits = query({
  args: {},
  returns: v.object({
    freeRemaining: v.number(),
    purchased: v.number(),
    total: v.number(),
    freePerWeek: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    freeRemaining: number;
    purchased: number;
    total: number;
    freePerWeek: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        freeRemaining: 0,
        purchased: 0,
        total: 0,
        freePerWeek: FREE_WEEKLY_CREDITS,
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        freeRemaining: 0,
        purchased: 0,
        total: 0,
        freePerWeek: FREE_WEEKLY_CREDITS,
      };
    }

    const result = calculateAvailableCredits(
      user.freeCreditsUsedThisWeek ?? 0,
      user.weeklyCreditsResetAt ?? 0,
      user.credits ?? 0,
    );

    return {
      ...result,
      freePerWeek: FREE_WEEKLY_CREDITS,
    };
  },
});

/**
 * Get available credit packages for purchase
 */
export const getCreditPackages = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      credits: v.number(),
      priceKes: v.number(),
      label: v.string(),
      popular: v.optional(v.boolean()),
    })
  ),
  handler: async (
    _ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<
    Array<{
      id: string;
      credits: number;
      priceKes: number;
      label: string;
      popular?: boolean;
    }>
  > => {
    return CREDIT_PACKAGES;
  },
});

/**
 * Get the user's credit purchase history
 */
export const getPurchaseHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('credit_purchases'),
      creditAmount: v.number(),
      priceKes: v.number(),
      status: v.union(
        v.literal('pending'),
        v.literal('completed'),
        v.literal('failed')
      ),
      createdAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<
    Array<{
      _id: Id<'credit_purchases'>;
      creditAmount: number;
      priceKes: number;
      status: 'pending' | 'completed' | 'failed';
      createdAt: number;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const purchases = await ctx.db
      .query('credit_purchases')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50);

    return purchases.map((p) => ({
      _id: p._id,
      creditAmount: p.creditAmount,
      priceKes: p.priceKes,
      status: p.status,
      createdAt: p.createdAt,
    }));
  },
});

/**
 * Get the status of a pending purchase (for polling from client)
 */
export const getPurchaseStatus = query({
  args: {
    purchaseId: v.id('credit_purchases'),
  },
  returns: v.object({
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed')
    ),
    failureReason: v.optional(v.string()),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { purchaseId: Id<'credit_purchases'> }
  ): Promise<{
    status: 'pending' | 'completed' | 'failed';
    failureReason?: string;
  }> => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      return { status: 'failed', failureReason: 'Purchase not found' };
    }
    return {
      status: purchase.status,
      failureReason: purchase.failureReason,
    };
  },
});

