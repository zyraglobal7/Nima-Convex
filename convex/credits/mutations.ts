import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import {
  FREE_WEEKLY_CREDITS,
  ONE_WEEK_MS,
  CREDIT_PACKAGES,
  shouldResetWeeklyCredits,
  generateMerchantTransactionId,
} from '../types';

/**
 * Deduct 1 credit from a user's balance.
 * Order: free weekly credits first, then purchased credits.
 * Auto-resets free credits if a new week has started.
 * 
 * Returns success and remaining credits. If remaining <= 2, triggers low-credit notification.
 */
export const deductCredit = internalMutation({
  args: {
    userId: v.id('users'),
    count: v.optional(v.number()), // defaults to 1
  },
  returns: v.object({
    success: v.boolean(),
    remaining: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'>; count?: number }
  ): Promise<{ success: boolean; remaining: number; error?: string }> => {
    const creditsToDeduct = args.count ?? 1;
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, remaining: 0, error: 'User not found' };
    }

    const now = Date.now();
    let freeUsed = user.freeCreditsUsedThisWeek ?? 0;
    const weeklyResetAt = user.weeklyCreditsResetAt ?? 0;
    let purchased = user.credits ?? 0;

    // Auto-reset free credits if a new week has started
    if (shouldResetWeeklyCredits(weeklyResetAt)) {
      freeUsed = 0;
    }

    const freeRemaining = Math.max(0, FREE_WEEKLY_CREDITS - freeUsed);
    const totalAvailable = freeRemaining + purchased;

    if (totalAvailable < creditsToDeduct) {
      return {
        success: false,
        remaining: totalAvailable,
        error: 'insufficient_credits',
      };
    }

    // Deduct: use free credits first, then purchased
    let remaining = creditsToDeduct;
    let newFreeUsed = freeUsed;
    let newPurchased = purchased;

    // Use free credits
    const freeToUse = Math.min(remaining, freeRemaining);
    newFreeUsed += freeToUse;
    remaining -= freeToUse;

    // Use purchased credits for the rest
    if (remaining > 0) {
      newPurchased -= remaining;
    }

    await ctx.db.patch(user._id, {
      freeCreditsUsedThisWeek: newFreeUsed,
      weeklyCreditsResetAt: shouldResetWeeklyCredits(weeklyResetAt) ? now : weeklyResetAt,
      credits: newPurchased,
      updatedAt: now,
    });

    const newTotal = Math.max(0, FREE_WEEKLY_CREDITS - newFreeUsed) + newPurchased;

    // Schedule low-credit push notification if remaining <= 2
    if (newTotal <= 2 && newTotal >= 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.actions.sendLowCreditNotification, {
        userId: args.userId,
        remaining: newTotal,
      });
    }

    return {
      success: true,
      remaining: newTotal,
    };
  },
});

/**
 * Add purchased credits to a user
 */
export const addCredits = internalMutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
  },
  returns: v.object({
    newBalance: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'>; amount: number }
  ): Promise<{ newBalance: number }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentCredits = user.credits ?? 0;
    const newBalance = currentCredits + args.amount;

    await ctx.db.patch(user._id, {
      credits: newBalance,
      updatedAt: Date.now(),
    });

    return { newBalance };
  },
});

/**
 * Create a pending credit purchase record
 */
export const createPurchase = internalMutation({
  args: {
    userId: v.id('users'),
    creditAmount: v.number(),
    priceKes: v.number(),
    phoneNumber: v.string(),
    merchantTransactionId: v.string(),
  },
  returns: v.id('credit_purchases'),
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>;
      creditAmount: number;
      priceKes: number;
      phoneNumber: string;
      merchantTransactionId: string;
    }
  ): Promise<Id<'credit_purchases'>> => {
    const now = Date.now();
    return await ctx.db.insert('credit_purchases', {
      userId: args.userId,
      creditAmount: args.creditAmount,
      priceKes: args.priceKes,
      phoneNumber: args.phoneNumber,
      merchantTransactionId: args.merchantTransactionId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Complete a credit purchase (called from webhook)
 * Adds credits and saves phone number to profile
 */
export const completePurchase = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    fingoTransactionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.id('users')),
    creditsAdded: v.optional(v.number()),
    newBalance: v.optional(v.number()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; fingoTransactionId: string }
  ): Promise<{
    success: boolean;
    userId?: Id<'users'>;
    creditsAdded?: number;
    newBalance?: number;
  }> => {
    // Find the purchase by merchant transaction ID
    const purchase = await ctx.db
      .query('credit_purchases')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!purchase) {
      console.error(`[CREDITS] Purchase not found for merchantTransactionId: ${args.merchantTransactionId}`);
      return { success: false };
    }

    // Idempotency: if already completed, skip
    if (purchase.status === 'completed') {
      console.log(`[CREDITS] Purchase already completed: ${args.merchantTransactionId}`);
      return { success: true, userId: purchase.userId, creditsAdded: 0 };
    }

    const now = Date.now();

    // Mark purchase as completed
    await ctx.db.patch(purchase._id, {
      status: 'completed',
      fingoTransactionId: args.fingoTransactionId,
      updatedAt: now,
    });

    // Add credits to user
    const user = await ctx.db.get(purchase.userId);
    if (!user) {
      console.error(`[CREDITS] User not found: ${purchase.userId}`);
      return { success: false };
    }

    const currentCredits = user.credits ?? 0;
    const newBalance = currentCredits + purchase.creditAmount;

    await ctx.db.patch(user._id, {
      credits: newBalance,
      updatedAt: now,
    });

    // Save phone number to user profile if not set
    if (!user.phoneNumber && purchase.phoneNumber) {
      await ctx.db.patch(user._id, {
        phoneNumber: purchase.phoneNumber,
      });
    }

    console.log(`[CREDITS] Added ${purchase.creditAmount} credits to user ${purchase.userId}. New balance: ${newBalance}`);

    // Schedule success push notification
    await ctx.scheduler.runAfter(0, internal.notifications.actions.sendCreditPurchaseNotification, {
      userId: purchase.userId,
      creditsAdded: purchase.creditAmount,
      newBalance,
    });

    return {
      success: true,
      userId: purchase.userId,
      creditsAdded: purchase.creditAmount,
      newBalance,
    };
  },
});

/**
 * Mark a credit purchase as failed (called from webhook)
 */
export const failPurchase = internalMutation({
  args: {
    merchantTransactionId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { merchantTransactionId: string; reason?: string }
  ): Promise<null> => {
    const purchase = await ctx.db
      .query('credit_purchases')
      .withIndex('by_merchant_transaction_id', (q) =>
        q.eq('merchantTransactionId', args.merchantTransactionId)
      )
      .unique();

    if (!purchase) {
      console.error(`[CREDITS] Purchase not found for failure: ${args.merchantTransactionId}`);
      return null;
    }

    // Don't overwrite completed status
    if (purchase.status === 'completed') {
      return null;
    }

    await ctx.db.patch(purchase._id, {
      status: 'failed',
      failureReason: args.reason || 'Payment failed',
      updatedAt: Date.now(),
    });

    console.log(`[CREDITS] Purchase failed: ${args.merchantTransactionId} - ${args.reason}`);
    return null;
  },
});

/**
 * Save phone number to user profile (public mutation)
 * Called when user enters phone for the first time in the credits modal
 */
export const savePhoneNumber = mutation({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { phoneNumber: string }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      phoneNumber: args.phoneNumber,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Initiate a credit purchase (public mutation)
 * Creates the purchase record and returns the merchantTransactionId
 * The action will then call Fingo Pay API
 */
export const initiatePurchase = mutation({
  args: {
    packageId: v.string(),
    phoneNumber: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    purchaseId: v.optional(v.id('credit_purchases')),
    merchantTransactionId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { packageId: string; phoneNumber: string }
  ): Promise<{
    success: boolean;
    purchaseId?: Id<'credit_purchases'>;
    merchantTransactionId?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate package
    const pkg = CREDIT_PACKAGES.find((p) => p.id === args.packageId);
    if (!pkg) {
      return { success: false, error: 'Invalid package' };
    }

    // Validate phone number (basic Kenyan format check)
    const phoneRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;
    if (!phoneRegex.test(args.phoneNumber)) {
      return { success: false, error: 'Invalid phone number format. Use Kenyan format (e.g., +254712345678)' };
    }

    const merchantTransactionId = generateMerchantTransactionId();
    const now = Date.now();

    const purchaseId = await ctx.db.insert('credit_purchases', {
      userId: user._id,
      creditAmount: pkg.credits,
      priceKes: pkg.priceKes,
      phoneNumber: args.phoneNumber,
      merchantTransactionId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Save phone to user profile if not set
    if (!user.phoneNumber) {
      await ctx.db.patch(user._id, {
        phoneNumber: args.phoneNumber,
        updatedAt: now,
      });
    }

    // Schedule the Fingo Pay action
    await ctx.scheduler.runAfter(0, internal.credits.actions.callFingoPaySTKPush, {
      purchaseId,
      merchantTransactionId,
      amount: pkg.priceKes * 100, // Fingo Pay expects cents
      phoneNumber: args.phoneNumber,
      narration: `Nima ${pkg.credits} Credits`,
    });

    return {
      success: true,
      purchaseId,
      merchantTransactionId,
    };
  },
});


