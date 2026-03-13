import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

const SELLER_LOW_CREDIT_THRESHOLD = 3;

/**
 * Generate a public upload URL for customer photos (no auth required)
 * Used on the seller try-on page for customers to upload their photo
 */
export const generateCustomerUploadUrl = mutation({
  args: {
    sellerId: v.id('sellers'),
  },
  returns: v.string(),
  handler: async (
    ctx: MutationCtx,
    args: { sellerId: Id<'sellers'> }
  ): Promise<string> => {
    // Verify seller exists and is active
    const seller = await ctx.db.get(args.sellerId);
    if (!seller || !seller.isActive) {
      throw new Error('Seller not found or inactive');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a seller try-on and deduct seller credit
 * Public mutation — no auth required (customer triggered)
 */
export const createSellerTryOn = mutation({
  args: {
    sellerId: v.id('sellers'),
    itemId: v.id('items'),
    customerImageStorageId: v.id('_storage'),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      sellerTryOnId: v.id('seller_try_ons'),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx: MutationCtx,
    args: {
      sellerId: Id<'sellers'>;
      itemId: Id<'items'>;
      customerImageStorageId: Id<'_storage'>;
    }
  ): Promise<
    | { success: true; sellerTryOnId: Id<'seller_try_ons'> }
    | { success: false; error: string }
  > => {
    const seller = await ctx.db.get(args.sellerId);
    if (!seller || !seller.isActive) {
      await ctx.storage.delete(args.customerImageStorageId);
      return { success: false, error: 'Store not found' };
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      await ctx.storage.delete(args.customerImageStorageId);
      return { success: false, error: 'Product not found' };
    }

    // Check seller's try-on credits
    const tryOnCredits = seller.tryOnCredits ?? 0;
    if (tryOnCredits <= 0) {
      await ctx.storage.delete(args.customerImageStorageId);
      return { success: false, error: 'no_seller_credits' };
    }

    const now = Date.now();
    const newCredits = tryOnCredits - 1;

    // Deduct credit from seller
    await ctx.db.patch(args.sellerId, {
      tryOnCredits: newCredits,
      updatedAt: now,
    });

    // Schedule low-credit notification for seller if running low
    if (newCredits <= SELLER_LOW_CREDIT_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.sellerTryOns.notifications.sendSellerLowCreditAlert, {
        sellerId: args.sellerId,
        remaining: newCredits,
      });
    }

    const sellerTryOnId = await ctx.db.insert('seller_try_ons', {
      sellerId: args.sellerId,
      itemId: args.itemId,
      customerImageStorageId: args.customerImageStorageId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Schedule image generation
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateSellerTryOnImage, {
      sellerTryOnId,
      itemId: args.itemId,
    });

    return { success: true, sellerTryOnId };
  },
});

/**
 * Update seller try-on status (internal - called by workflow)
 */
export const updateSellerTryOnStatus = internalMutation({
  args: {
    sellerTryOnId: v.id('seller_try_ons'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    resultStorageId: v.optional(v.id('_storage')),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      sellerTryOnId: Id<'seller_try_ons'>;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
    }
  ): Promise<null> => {
    const tryOn = await ctx.db.get(args.sellerTryOnId);
    if (!tryOn) throw new Error('Seller try-on not found');

    const updates: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      updatedAt: number;
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.resultStorageId !== undefined) updates.resultStorageId = args.resultStorageId;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.sellerTryOnId, updates);
    return null;
  },
});

/**
 * Add try-on credits to a seller (admin or purchase)
 */
export const addSellerTryOnCredits = internalMutation({
  args: {
    sellerId: v.id('sellers'),
    amount: v.number(),
  },
  returns: v.object({ newBalance: v.number() }),
  handler: async (
    ctx: MutationCtx,
    args: { sellerId: Id<'sellers'>; amount: number }
  ): Promise<{ newBalance: number }> => {
    const seller = await ctx.db.get(args.sellerId);
    if (!seller) throw new Error('Seller not found');

    const current = seller.tryOnCredits ?? 0;
    const newBalance = current + args.amount;

    await ctx.db.patch(args.sellerId, {
      tryOnCredits: newBalance,
      updatedAt: Date.now(),
    });

    return { newBalance };
  },
});
