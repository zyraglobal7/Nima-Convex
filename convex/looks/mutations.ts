import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { generatePublicId } from '../types';

// Validators
const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));
const budgetValidator = v.union(v.literal('low'), v.literal('mid'), v.literal('premium'));
const creatorValidator = v.union(v.literal('system'), v.literal('user'));

/**
 * Create a new look (internal - for admin/seed use)
 */
export const createLook = internalMutation({
  args: {
    itemIds: v.array(v.id('items')),
    name: v.optional(v.string()),
    styleTags: v.array(v.string()),
    occasion: v.optional(v.string()),
    season: v.optional(v.string()),
    nimaComment: v.optional(v.string()),
    targetGender: genderValidator,
    targetBudgetRange: v.optional(budgetValidator),
    isFeatured: v.optional(v.boolean()),
    createdBy: v.optional(creatorValidator),
    creatorUserId: v.optional(v.id('users')),
  },
  returns: v.id('looks'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemIds: Id<'items'>[];
      name?: string;
      styleTags: string[];
      occasion?: string;
      season?: string;
      nimaComment?: string;
      targetGender: 'male' | 'female' | 'unisex';
      targetBudgetRange?: 'low' | 'mid' | 'premium';
      isFeatured?: boolean;
      createdBy?: 'system' | 'user';
      creatorUserId?: Id<'users'>;
    }
  ): Promise<Id<'looks'>> => {
    // Validate items exist and calculate total price
    let totalPrice = 0;
    let currency = 'KES'; // Default currency

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }
      if (!item.isActive) {
        throw new Error(`Item is not active: ${itemId}`);
      }
      totalPrice += item.price;
      currency = item.currency; // Use the last item's currency
    }

    const now = Date.now();
    const publicId = generatePublicId('look');

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: args.itemIds,
      totalPrice,
      currency,
      name: args.name,
      styleTags: args.styleTags,
      occasion: args.occasion,
      season: args.season,
      nimaComment: args.nimaComment,
      targetGender: args.targetGender,
      targetBudgetRange: args.targetBudgetRange,
      isActive: true,
      isFeatured: args.isFeatured ?? false,
      viewCount: 0,
      saveCount: 0,
      createdBy: args.createdBy ?? 'system',
      creatorUserId: args.creatorUserId,
      createdAt: now,
      updatedAt: now,
    });

    return lookId;
  },
});

/**
 * Update a look (internal - for admin use)
 */
export const updateLook = internalMutation({
  args: {
    lookId: v.id('looks'),
    itemIds: v.optional(v.array(v.id('items'))),
    name: v.optional(v.string()),
    styleTags: v.optional(v.array(v.string())),
    occasion: v.optional(v.string()),
    season: v.optional(v.string()),
    nimaComment: v.optional(v.string()),
    targetGender: v.optional(genderValidator),
    targetBudgetRange: v.optional(budgetValidator),
    isActive: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
  },
  returns: v.id('looks'),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
      itemIds?: Id<'items'>[];
      name?: string;
      styleTags?: string[];
      occasion?: string;
      season?: string;
      nimaComment?: string;
      targetGender?: 'male' | 'female' | 'unisex';
      targetBudgetRange?: 'low' | 'mid' | 'premium';
      isActive?: boolean;
      isFeatured?: boolean;
    }
  ): Promise<Id<'looks'>> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      throw new Error('Look not found');
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // If itemIds are being updated, recalculate total price
    if (args.itemIds !== undefined) {
      let totalPrice = 0;
      let currency = look.currency;

      for (const itemId of args.itemIds) {
        const item = await ctx.db.get(itemId);
        if (!item) {
          throw new Error(`Item not found: ${itemId}`);
        }
        if (!item.isActive) {
          throw new Error(`Item is not active: ${itemId}`);
        }
        totalPrice += item.price;
        currency = item.currency;
      }

      updates.itemIds = args.itemIds;
      updates.totalPrice = totalPrice;
      updates.currency = currency;
    }

    if (args.name !== undefined) updates.name = args.name;
    if (args.styleTags !== undefined) updates.styleTags = args.styleTags;
    if (args.occasion !== undefined) updates.occasion = args.occasion;
    if (args.season !== undefined) updates.season = args.season;
    if (args.nimaComment !== undefined) updates.nimaComment = args.nimaComment;
    if (args.targetGender !== undefined) updates.targetGender = args.targetGender;
    if (args.targetBudgetRange !== undefined) updates.targetBudgetRange = args.targetBudgetRange;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.isFeatured !== undefined) updates.isFeatured = args.isFeatured;

    await ctx.db.patch(args.lookId, updates);
    return args.lookId;
  },
});

/**
 * Increment view count for a look
 */
export const incrementViewCount = internalMutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.null(),
  handler: async (ctx: MutationCtx, args: { lookId: Id<'looks'> }): Promise<null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return null;
    }

    await ctx.db.patch(args.lookId, {
      viewCount: (look.viewCount ?? 0) + 1,
    });

    return null;
  },
});

/**
 * Increment save count for a look
 */
export const incrementSaveCount = internalMutation({
  args: {
    lookId: v.id('looks'),
    increment: v.number(), // Can be 1 (save) or -1 (unsave)
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'>; increment: number }
  ): Promise<null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return null;
    }

    const newCount = Math.max(0, (look.saveCount ?? 0) + args.increment);
    await ctx.db.patch(args.lookId, {
      saveCount: newCount,
    });

    return null;
  },
});

/**
 * Delete a look (soft delete)
 */
export const deleteLook = internalMutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { lookId: Id<'looks'> }): Promise<boolean> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return false;
    }

    await ctx.db.patch(args.lookId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return true;
  },
});

