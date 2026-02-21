import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id, Doc } from '../_generated/dataModel';

// Status validator
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed')
);

/**
 * Create a pending item try-on record
 * Called when user initiates a try-on from the product page
 */
export const createItemTryOn = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.object({
    itemTryOnId: v.id('item_try_ons'),
    userImageId: v.id('user_images'),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    itemTryOnId: Id<'item_try_ons'>;
    userImageId: Id<'user_images'>;
  }> => {
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

    // Verify item exists and is active
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error('Item not found or inactive');
    }

    // Get user's primary image (use .first() to handle duplicate primaries gracefully)
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) =>
        q.eq('userId', user._id).eq('isPrimary', true)
      )
      .first();

    if (!userImage) {
      throw new Error('No primary photo found. Please upload a photo first.');
    }

    // Check if there's already a pending/processing try-on for this item
    const existingTryOn = await ctx.db
      .query('item_try_ons')
      .withIndex('by_item_and_user', (q) =>
        q.eq('itemId', args.itemId).eq('userId', user._id)
      )
      .order('desc')
      .first();

    if (existingTryOn && (existingTryOn.status === 'pending' || existingTryOn.status === 'processing')) {
      // Return the existing try-on that's still processing
      return {
        itemTryOnId: existingTryOn._id,
        userImageId: existingTryOn.userImageId,
      };
    }

    // If there's a completed try-on, we can reuse it instead of creating a new one
    if (existingTryOn && existingTryOn.status === 'completed' && existingTryOn.storageId) {
      return {
        itemTryOnId: existingTryOn._id,
        userImageId: existingTryOn.userImageId,
      };
    }

    const now = Date.now();

    // Create new pending try-on record
    const itemTryOnId = await ctx.db.insert('item_try_ons', {
      itemId: args.itemId,
      userId: user._id,
      userImageId: userImage._id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return {
      itemTryOnId,
      userImageId: userImage._id,
    };
  },
});

/**
 * Update item try-on status (internal - called by workflow)
 */
export const updateItemTryOnStatus = internalMutation({
  args: {
    itemTryOnId: v.id('item_try_ons'),
    status: statusValidator,
    storageId: v.optional(v.id('_storage')),
    generationProvider: v.optional(v.string()),
    generationJobId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemTryOnId: Id<'item_try_ons'>;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      storageId?: Id<'_storage'>;
      generationProvider?: string;
      generationJobId?: string;
      errorMessage?: string;
    }
  ): Promise<null> => {
    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn) {
      throw new Error('Item try-on not found');
    }

    const updates: Partial<Doc<'item_try_ons'>> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.storageId !== undefined) {
      updates.storageId = args.storageId;
    }
    if (args.generationProvider !== undefined) {
      updates.generationProvider = args.generationProvider;
    }
    if (args.generationJobId !== undefined) {
      updates.generationJobId = args.generationJobId;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.itemTryOnId, updates);

    // Send push notification when try-on image generation completes
    if (args.status === 'completed' && tryOn.userId) {
      const item = await ctx.db.get(tryOn.itemId);
      const itemName = item?.name || 'your item';

      await ctx.scheduler.runAfter(0, internal.notifications.actions.sendTryOnReadyNotification, {
        userId: tryOn.userId,
        itemTryOnId: args.itemTryOnId,
        itemName,
      });
    }

    return null;
  },
});

/**
 * Create item try-on with storage ID (internal - called by workflow after generation)
 */
export const createCompletedItemTryOn = internalMutation({
  args: {
    itemId: v.id('items'),
    userId: v.id('users'),
    userImageId: v.id('user_images'),
    storageId: v.id('_storage'),
    generationProvider: v.optional(v.string()),
  },
  returns: v.id('item_try_ons'),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemId: Id<'items'>;
      userId: Id<'users'>;
      userImageId: Id<'user_images'>;
      storageId: Id<'_storage'>;
      generationProvider?: string;
    }
  ): Promise<Id<'item_try_ons'>> => {
    const now = Date.now();

    const itemTryOnId = await ctx.db.insert('item_try_ons', {
      itemId: args.itemId,
      userId: args.userId,
      userImageId: args.userImageId,
      storageId: args.storageId,
      status: 'completed',
      generationProvider: args.generationProvider,
      createdAt: now,
      updatedAt: now,
    });

    return itemTryOnId;
  },
});

/**
 * Delete an item try-on (user can delete their own try-ons)
 */
export const deleteItemTryOn = mutation({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
  ): Promise<boolean> => {
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

    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn) {
      return false;
    }

    // Verify ownership
    if (tryOn.userId !== user._id) {
      throw new Error('Not authorized to delete this try-on');
    }

    // Delete the storage file if it exists
    if (tryOn.storageId) {
      await ctx.storage.delete(tryOn.storageId);
    }

    // Delete the try-on record
    await ctx.db.delete(args.itemTryOnId);

    return true;
  },
});

/**
 * Retry a failed item try-on
 */
export const retryItemTryOn = mutation({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.id('item_try_ons'),
  handler: async (
    ctx: MutationCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
  ): Promise<Id<'item_try_ons'>> => {
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

    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn) {
      throw new Error('Item try-on not found');
    }

    // Verify ownership
    if (tryOn.userId !== user._id) {
      throw new Error('Not authorized to retry this try-on');
    }

    // Only allow retry on failed try-ons
    if (tryOn.status !== 'failed') {
      throw new Error('Can only retry failed try-ons');
    }

    // Reset status to pending
    await ctx.db.patch(args.itemTryOnId, {
      status: 'pending',
      errorMessage: undefined,
      updatedAt: Date.now(),
    });

    return args.itemTryOnId;
  },
});
