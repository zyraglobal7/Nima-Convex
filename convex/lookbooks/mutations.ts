import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { generateShareToken, generatePublicId, MAX_LOOKBOOK_ITEMS } from '../types';
import { internal } from '../_generated/api';

/**
 * Create a new lookbook
 */
export const createLookbook = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.id('lookbooks'),
  handler: async (
    ctx: MutationCtx,
    args: {
      name: string;
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<Id<'lookbooks'>> => {
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

    const now = Date.now();
    const lookbookId = await ctx.db.insert('lookbooks', {
      userId: user._id,
      name: args.name,
      description: args.description,
      isPublic: args.isPublic ?? false,
      shareToken: generateShareToken(),
      itemCount: 0,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    return lookbookId;
  },
});

/**
 * Update a lookbook
 */
export const updateLookbook = mutation({
  args: {
    lookbookId: v.id('lookbooks'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
  },
  returns: v.id('lookbooks'),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookbookId: Id<'lookbooks'>;
      name?: string;
      description?: string;
      isPublic?: boolean;
      isArchived?: boolean;
    }
  ): Promise<Id<'lookbooks'>> => {
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

    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership
    if (lookbook.userId !== user._id) {
      throw new Error('Not authorized to modify this lookbook');
    }

    const updates: Partial<Doc<'lookbooks'>> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.isArchived !== undefined) updates.isArchived = args.isArchived;

    await ctx.db.patch(args.lookbookId, updates);
    return args.lookbookId;
  },
});

/**
 * Delete a lookbook and all its items
 */
export const deleteLookbook = mutation({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { lookbookId: Id<'lookbooks'> }): Promise<boolean> => {
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

    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership
    if (lookbook.userId !== user._id) {
      throw new Error('Not authorized to delete this lookbook');
    }

    // Delete all items in the lookbook
    const items = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', args.lookbookId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the lookbook
    await ctx.db.delete(args.lookbookId);

    return true;
  },
});

/**
 * Add an item or look to a lookbook
 */
export const addToLookbook = mutation({
  args: {
    lookbookId: v.id('lookbooks'),
    itemType: v.union(v.literal('look'), v.literal('item')),
    lookId: v.optional(v.id('looks')),
    itemId: v.optional(v.id('items')),
    note: v.optional(v.string()),
  },
  returns: v.id('lookbook_items'),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookbookId: Id<'lookbooks'>;
      itemType: 'look' | 'item';
      lookId?: Id<'looks'>;
      itemId?: Id<'items'>;
      note?: string;
    }
  ): Promise<Id<'lookbook_items'>> => {
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

    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership or collaboration
    if (lookbook.userId !== user._id && !lookbook.collaboratorIds?.includes(user._id)) {
      throw new Error('Not authorized to add to this lookbook');
    }

    // Validate item type and ID
    if (args.itemType === 'look') {
      if (!args.lookId) {
        throw new Error('lookId is required for look items');
      }
      const look = await ctx.db.get(args.lookId);
      if (!look || !look.isActive) {
        throw new Error('Look not found or inactive');
      }
    } else {
      if (!args.itemId) {
        throw new Error('itemId is required for item items');
      }
      const item = await ctx.db.get(args.itemId);
      if (!item || !item.isActive) {
        throw new Error('Item not found or inactive');
      }
    }

    // Check item limit
    if (lookbook.itemCount >= MAX_LOOKBOOK_ITEMS) {
      throw new Error(`Maximum ${MAX_LOOKBOOK_ITEMS} items per lookbook`);
    }

    // Check for duplicates
    const existingItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', args.lookbookId))
      .collect();

    const isDuplicate = existingItems.some((existing) => {
      if (args.itemType === 'look') {
        return existing.itemType === 'look' && existing.lookId === args.lookId;
      }
      return existing.itemType === 'item' && existing.itemId === args.itemId;
    });

    if (isDuplicate) {
      throw new Error('Item already exists in this lookbook');
    }

    // Add the item
    const sortOrder = existingItems.length;
    const lookbookItemId = await ctx.db.insert('lookbook_items', {
      lookbookId: args.lookbookId,
      userId: user._id,
      itemType: args.itemType,
      lookId: args.itemType === 'look' ? args.lookId : undefined,
      itemId: args.itemType === 'item' ? args.itemId : undefined,
      note: args.note,
      sortOrder,
      createdAt: Date.now(),
    });

    // Update item count
    await ctx.db.patch(args.lookbookId, {
      itemCount: lookbook.itemCount + 1,
      updatedAt: Date.now(),
      // Set auto cover if this is the first item
      autoCoverItemId:
        lookbook.itemCount === 0 && args.itemType === 'item' ? args.itemId : lookbook.autoCoverItemId,
    });

    // Increment save count on the look if saving a look
    if (args.itemType === 'look' && args.lookId) {
      await ctx.runMutation(internal.looks.mutations.incrementSaveCount, {
        lookId: args.lookId,
        increment: 1,
      });
    }

    return lookbookItemId;
  },
});

/**
 * Remove an item from a lookbook
 */
export const removeFromLookbook = mutation({
  args: {
    lookbookItemId: v.id('lookbook_items'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { lookbookItemId: Id<'lookbook_items'> }
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

    const lookbookItem = await ctx.db.get(args.lookbookItemId);
    if (!lookbookItem) {
      throw new Error('Lookbook item not found');
    }

    const lookbook = await ctx.db.get(lookbookItem.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership or collaboration
    if (lookbook.userId !== user._id && !lookbook.collaboratorIds?.includes(user._id)) {
      throw new Error('Not authorized to remove from this lookbook');
    }

    // Delete the item
    await ctx.db.delete(args.lookbookItemId);

    // Update item count
    await ctx.db.patch(lookbook._id, {
      itemCount: Math.max(0, lookbook.itemCount - 1),
      updatedAt: Date.now(),
    });

    // Decrement save count on the look if removing a look
    if (lookbookItem.itemType === 'look' && lookbookItem.lookId) {
      await ctx.runMutation(internal.looks.mutations.incrementSaveCount, {
        lookId: lookbookItem.lookId,
        increment: -1,
      });
    }

    return true;
  },
});

/**
 * Update a lookbook item's note
 */
export const updateLookbookItemNote = mutation({
  args: {
    lookbookItemId: v.id('lookbook_items'),
    note: v.string(),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookbookItemId: Id<'lookbook_items'>;
      note: string;
    }
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

    const lookbookItem = await ctx.db.get(args.lookbookItemId);
    if (!lookbookItem) {
      throw new Error('Lookbook item not found');
    }

    const lookbook = await ctx.db.get(lookbookItem.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership
    if (lookbook.userId !== user._id && !lookbook.collaboratorIds?.includes(user._id)) {
      throw new Error('Not authorized to modify this lookbook');
    }

    await ctx.db.patch(args.lookbookItemId, {
      note: args.note,
    });

    return true;
  },
});

/**
 * Regenerate share token for a lookbook
 */
export const regenerateShareToken = mutation({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.string(),
  handler: async (ctx: MutationCtx, args: { lookbookId: Id<'lookbooks'> }): Promise<string> => {
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

    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      throw new Error('Lookbook not found');
    }

    // Verify ownership
    if (lookbook.userId !== user._id) {
      throw new Error('Not authorized to modify this lookbook');
    }

    const newToken = generateShareToken();
    await ctx.db.patch(args.lookbookId, {
      shareToken: newToken,
      updatedAt: Date.now(),
    });

    return newToken;
  },
});

/**
 * Quick save - add to default "Saved" lookbook or create it
 */
export const quickSave = mutation({
  args: {
    itemType: v.union(v.literal('look'), v.literal('item')),
    lookId: v.optional(v.id('looks')),
    itemId: v.optional(v.id('items')),
  },
  returns: v.object({
    lookbookId: v.id('lookbooks'),
    lookbookItemId: v.id('lookbook_items'),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      itemType: 'look' | 'item';
      lookId?: Id<'looks'>;
      itemId?: Id<'items'>;
    }
  ): Promise<{
    lookbookId: Id<'lookbooks'>;
    lookbookItemId: Id<'lookbook_items'>;
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

    // Find or create the default "Saved" lookbook
    let savedLookbook = await ctx.db
      .query('lookbooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('name'), 'Saved'))
      .first();

    if (!savedLookbook) {
      const now = Date.now();
      const lookbookId = await ctx.db.insert('lookbooks', {
        userId: user._id,
        name: 'Saved',
        description: 'Your saved looks and items',
        isPublic: false,
        shareToken: generateShareToken(),
        itemCount: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      savedLookbook = await ctx.db.get(lookbookId);
    }

    if (!savedLookbook) {
      throw new Error('Failed to create saved lookbook');
    }

    // Add the item to the lookbook
    // Validate item type and ID
    if (args.itemType === 'look') {
      if (!args.lookId) {
        throw new Error('lookId is required for look items');
      }
      const look = await ctx.db.get(args.lookId);
      if (!look || !look.isActive) {
        throw new Error('Look not found or inactive');
      }
    } else {
      if (!args.itemId) {
        throw new Error('itemId is required for item items');
      }
      const item = await ctx.db.get(args.itemId);
      if (!item || !item.isActive) {
        throw new Error('Item not found or inactive');
      }
    }

    // Check for duplicates
    const existingItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', savedLookbook._id))
      .collect();

    const existingItem = existingItems.find((existing) => {
      if (args.itemType === 'look') {
        return existing.itemType === 'look' && existing.lookId === args.lookId;
      }
      return existing.itemType === 'item' && existing.itemId === args.itemId;
    });

    if (existingItem) {
      return {
        lookbookId: savedLookbook._id,
        lookbookItemId: existingItem._id,
      };
    }

    const sortOrder = existingItems.length;
    const lookbookItemId = await ctx.db.insert('lookbook_items', {
      lookbookId: savedLookbook._id,
      userId: user._id,
      itemType: args.itemType,
      lookId: args.itemType === 'look' ? args.lookId : undefined,
      itemId: args.itemType === 'item' ? args.itemId : undefined,
      sortOrder,
      createdAt: Date.now(),
    });

    // Update item count
    await ctx.db.patch(savedLookbook._id, {
      itemCount: savedLookbook.itemCount + 1,
      updatedAt: Date.now(),
    });

    // Increment save count on the look if saving a look
    if (args.itemType === 'look' && args.lookId) {
      await ctx.runMutation(internal.looks.mutations.incrementSaveCount, {
        lookId: args.lookId,
        increment: 1,
      });
    }

    return {
      lookbookId: savedLookbook._id,
      lookbookItemId,
    };
  },
});

/**
 * Save a try-on result to a "Tried On Looks" lookbook
 * Creates a new look from the try-on and saves it
 */
export const saveTryOnToLookbook = mutation({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.object({
    success: v.boolean(),
    lookbookId: v.optional(v.id('lookbooks')),
    lookId: v.optional(v.id('looks')),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
  ): Promise<{
    success: boolean;
    lookbookId?: Id<'lookbooks'>;
    lookId?: Id<'looks'>;
    message: string;
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

    // Get the try-on
    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn) {
      throw new Error('Try-on result not found');
    }

    // Verify ownership
    if (tryOn.userId !== user._id) {
      throw new Error('Not authorized to save this try-on');
    }

    // Ensure it's completed and has a storage ID
    if (tryOn.status !== 'completed' || !tryOn.storageId) {
      throw new Error('Try-on is not completed or is missing image');
    }

    // Get the item details
    const item = await ctx.db.get(tryOn.itemId);
    if (!item) {
      throw new Error('Original item not found');
    }

    // 1. Find or create "Tried On Looks" lookbook
    let triedOnLookbook = await ctx.db
      .query('lookbooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('name'), 'Tried On Looks'))
      .first();

    if (!triedOnLookbook) {
      const now = Date.now();
      const lookbookId = await ctx.db.insert('lookbooks', {
        userId: user._id,
        name: 'Tried On Looks',
        description: 'My virtual try-on history',
        isPublic: false,
        shareToken: generateShareToken(),
        itemCount: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      triedOnLookbook = await ctx.db.get(lookbookId);
    }

    if (!triedOnLookbook) {
      throw new Error('Failed to create lookbook');
    }

    // 2. Create a new Look
    const now = Date.now();
    const publicId = generatePublicId('look');

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: [tryOn.itemId],
      totalPrice: item.price,
      currency: item.currency,
      name: `Tried On: ${item.name}`,
      styleTags: item.tags,
      targetGender: item.gender,
      isActive: true,
      isFeatured: false,
      isPublic: false, // Default to private
      sharedWithFriends: false,
      viewCount: 0,
      saveCount: 1, // Start with 1 save (in this lookbook)
      generationStatus: 'completed', // It's already generated via try-on
      status: 'saved',
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'apparel',
      selectedSize: tryOn.selectedSize,
      selectedColor: tryOn.selectedColor,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Link the try-on image to this look
    await ctx.db.insert('look_images', {
      lookId,
      userId: user._id,
      storageId: tryOn.storageId,
      userImageId: tryOn.userImageId,
      status: 'completed',
      generationProvider: tryOn.generationProvider,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Add to the lookbook
    // Check if already in lookbook to avoid partial duplicates if run multiple times (though button will disappear)
    const existingItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', triedOnLookbook!._id))
      .collect();
      
    // We can't easily check for "this specific try-on" because lookbook_items links to looks/items, not try-ons.
    // But since we just created a NEW look ID, it won't be in there.

    await ctx.db.insert('lookbook_items', {
      lookbookId: triedOnLookbook._id,
      userId: user._id,
      itemType: 'look',
      lookId,
      sortOrder: existingItems.length,
      createdAt: now,
    });

    // Update lookbook count
    await ctx.db.patch(triedOnLookbook._id, {
      itemCount: triedOnLookbook.itemCount + 1,
      updatedAt: now,
      // Update cover if empty
      autoCoverItemId: triedOnLookbook.itemCount === 0 ? item._id : triedOnLookbook.autoCoverItemId,
    });

    return {
      success: true,
      lookbookId: triedOnLookbook._id,
      lookId,
      message: 'Saved to Tried On Looks',
    };
  },
});


