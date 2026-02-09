import { internalMutation, mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { generatePublicId } from '../types';
import { internal } from '../_generated/api';

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

/**
 * Toggle public visibility of a look
 * Users can share their looks on the /explore page
 */
export const toggleLookPublic = mutation({
  args: {
    lookId: v.id('looks'),
    isPublic: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    isPublic: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'>; isPublic: boolean }
  ): Promise<{
    success: boolean;
    isPublic: boolean;
    message: string;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        isPublic: false,
        message: 'Please sign in to share looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        isPublic: false,
        message: 'User not found.',
      };
    }

    // Get the look
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        isPublic: false,
        message: 'Look not found.',
      };
    }

    // Check ownership - only the creator can toggle public status
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        isPublic: look.isPublic ?? false,
        message: 'You can only share looks you created.',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      isPublic: args.isPublic,
      message: args.isPublic
        ? 'Your look is now visible on the Explore page!'
        : 'Your look is now private.',
    };
  },
});

/**
 * Share look with friends
 * Sets sharedWithFriends to true so friends can see it
 */
export const shareLookWithFriends = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        message: 'Please sign in to share looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        message: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        message: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        message: 'You can only share looks you created.',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      sharedWithFriends: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: 'Your look is now shared with your friends!',
    };
  },
});

/**
 * Share look publicly (sets isPublic to true)
 */
export const shareLookPublicly = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        message: 'Please sign in to share looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        message: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        message: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        message: 'You can only share looks you created.',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      isPublic: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: 'Your look is now visible on the Explore page!',
    };
  },
});

/**
 * Unshare look publicly (sets isPublic to false)
 */
export const unshareLookPublicly = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        message: 'Please sign in to unshare looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        message: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        message: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        message: 'You can only unshare looks you created.',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      isPublic: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: 'Your look is no longer visible on the Explore page.',
    };
  },
});

/**
 * Unshare look with friends (sets sharedWithFriends to false)
 */
export const unshareLookWithFriends = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        message: 'Please sign in to unshare looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        message: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        message: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        message: 'You can only unshare looks you created.',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      sharedWithFriends: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: 'Your look is no longer shared with friends.',
    };
  },
});

/**
 * Recreate a look - creates a new look with the same items but for the current user
 */
export const recreateLook = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    lookId: v.optional(v.id('looks')),
    publicId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    lookId?: Id<'looks'>;
    publicId?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to recreate looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    // Get the original look
    const originalLook = await ctx.db.get(args.lookId);
    if (!originalLook || !originalLook.isActive) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Validate all items still exist and are active
    for (const itemId of originalLook.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || !item.isActive) {
        return {
          success: false,
          error: 'Some items in this look are no longer available.',
        };
      }
    }

    // Create new look with same items
    const now = Date.now();
    const publicId = generatePublicId('look');

    const newLookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: originalLook.itemIds,
      totalPrice: originalLook.totalPrice,
      currency: originalLook.currency,
      name: originalLook.name ? `${originalLook.name} (Recreated)` : undefined,
      styleTags: originalLook.styleTags,
      occasion: originalLook.occasion,
      season: originalLook.season,
      nimaComment: originalLook.nimaComment,
      targetGender: originalLook.targetGender,
      targetBudgetRange: originalLook.targetBudgetRange,
      isActive: true,
      isFeatured: false,
      isPublic: false, // New look is private by default
      sharedWithFriends: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending', // Set to pending to trigger image generation
      status: 'pending', // User will choose to save or discard after generation
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'recreated',
      originalLookId: args.lookId,
      createdAt: now,
      updatedAt: now,
    });

    // Trigger image generation workflow
    // Schedule the image generation action to run immediately
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateLookImage, {
      lookId: newLookId,
      userId: user._id,
    });

    // Record the recreate interaction for activity feed
    // Only if the original look has a creator (not system-generated) and it's not the same user
    if (originalLook.creatorUserId && originalLook.creatorUserId !== user._id) {
      await ctx.db.insert('look_interactions', {
        lookId: args.lookId, // The ORIGINAL look ID, so the owner gets notified
        userId: user._id,
        interactionType: 'recreate',
        seenByOwner: false,
        createdAt: now,
      });
    }

    return {
      success: true,
      lookId: newLookId,
      publicId,
    };
  },
});

/**
 * Create a look from user-selected items
 * Public mutation called from the "Create a Look" flow
 */
export const createLookFromSelectedItems = mutation({
  args: {
    itemIds: v.array(v.id('items')),
    occasion: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    lookId: v.optional(v.id('looks')),
    publicId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemIds: Id<'items'>[];
      occasion?: string;
    }
  ): Promise<{
    success: boolean;
    lookId?: Id<'looks'>;
    publicId?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to create looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    // Rate limiting: Check if user has created too many looks recently
    const rateLimitTimestamp = Date.now();
    const oneHour = 60 * 60 * 1000;
    const lastHourLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .filter((q) => 
        q.and(
          q.eq(q.field('createdBy'), 'user'),
          q.gt(q.field('createdAt'), rateLimitTimestamp - oneHour)
        )
      )
      .collect();

    if (lastHourLooks.length >= 10) {
      return {
        success: false,
        error: 'Rate limit exceeded. You can create up to 10 looks per hour. Please try again later.',
      };
    }

    // Validate item count
    if (args.itemIds.length < 2) {
      return {
        success: false,
        error: 'Please select at least 2 items.',
      };
    }

    if (args.itemIds.length > 6) {
      return {
        success: false,
        error: 'Maximum 6 items per look.',
      };
    }

    // Validate all items exist and are active, calculate total price
    let totalPrice = 0;
    let currency = 'KES';
    const styleTags: string[] = [];
    const categories: string[] = [];

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || !item.isActive) {
        return {
          success: false,
          error: 'Some items are no longer available.',
        };
      }
      totalPrice += item.price;
      currency = item.currency;
      categories.push(item.category);

      // Collect unique tags
      for (const tag of item.tags) {
        if (!styleTags.includes(tag)) {
          styleTags.push(tag);
        }
      }
    }

    // Create the look
    const now = Date.now();
    const publicId = generatePublicId('look');

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: args.itemIds,
      totalPrice,
      currency,
      styleTags: styleTags.slice(0, 5), // Limit to 5 tags
      occasion: args.occasion,
      targetGender: (user.gender === 'male' || user.gender === 'female') ? user.gender : 'unisex',
      targetBudgetRange: user.budgetRange,
      isActive: true,
      isFeatured: false,
      isPublic: false,
      sharedWithFriends: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending',
      status: 'pending', // User will choose to save or discard after generation
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'apparel',
      createdAt: now,
      updatedAt: now,
    });

    // Trigger image generation workflow
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateLookImage, {
      lookId,
      userId: user._id,
    });

    return {
      success: true,
      lookId,
      publicId,
    };
  },
});

/**
 * Update look visibility (public/friends/private)
 * Users can only update their own looks
 */
export const updateLookVisibility = mutation({
  args: {
    lookId: v.id('looks'),
    isPublic: v.boolean(),
    sharedWithFriends: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
      isPublic: boolean;
      sharedWithFriends: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found',
      };
    }

    // Users can only update their own looks
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only update your own looks',
      };
    }

    // Update the look
    await ctx.db.patch(args.lookId, {
      isPublic: args.isPublic,
      sharedWithFriends: args.sharedWithFriends,
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

// ============================================
// SAVE / DISCARD / RESTORE MUTATIONS
// ============================================

/**
 * Save a look - sets status to 'saved'
 * Used when user chooses to save a look after generation
 */
export const saveLook = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to save looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership - only the creator can save/discard
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only save your own looks.',
      };
    }

    // Update status to saved
    await ctx.db.patch(args.lookId, {
      status: 'saved',
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

/**
 * Discard a look - sets status to 'discarded'
 * Used when user chooses to discard a look after generation
 * Discarded looks are not deleted, they can be restored later
 */
export const discardLook = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to discard looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only discard your own looks.',
      };
    }

    // Update status to discarded
    await ctx.db.patch(args.lookId, {
      status: 'discarded',
      isPublic: false, // Remove from public view
      sharedWithFriends: false, // Remove from friends view
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

/**
 * Restore a discarded look - changes status from 'discarded' to 'saved'
 * Used when user wants to recover a previously discarded look
 */
export const restoreLook = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to restore looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only restore your own looks.',
      };
    }

    // Check that it's actually discarded
    if (look.status !== 'discarded') {
      return {
        success: false,
        error: 'This look is not discarded.',
      };
    }

    // Update status to saved
    await ctx.db.patch(args.lookId, {
      status: 'saved',
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

/**
 * Retry look image generation
 * Used when image generation fails
 */
export const retryLookGeneration = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to retry generation.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only retry generation for your own looks.',
      };
    }

    // Only allow retry if status is failed or pending/processing for too long (e.g. stuck)
    // For now, let's allow it if it's failed or if user explicitly requests it
    // We update status to pending to show loading state
    await ctx.db.patch(args.lookId, {
      generationStatus: 'pending',
      updatedAt: Date.now(),
    });

    // Also update look image status if exists
    const lookImage = await ctx.db
      .query('look_images')
      .withIndex('by_look', (q) => q.eq('lookId', args.lookId))
      .first();

    if (lookImage) {
      await ctx.db.patch(lookImage._id, {
        status: 'pending',
        errorMessage: undefined,
        updatedAt: Date.now(),
      });
    }

    // Trigger image generation workflow
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateLookImage, {
      lookId: args.lookId,
      userId: user._id,
    });

    return {
      success: true,
    };
  },
});

/**
 * Delete a look permanently (by user)
 * Marks as inactive (soft delete)
 */
export const deleteLookByUser = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to delete looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership
    if (look.creatorUserId !== user._id) {
      return {
        success: false,
        error: 'You can only delete your own looks.',
      };
    }

    // Soft delete
    await ctx.db.patch(args.lookId, {
      isActive: false,
      status: 'discarded', // Also mark as discarded
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

