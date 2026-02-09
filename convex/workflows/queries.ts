/**
 * Internal Queries for Onboarding Workflow
 * These queries are used by the workflow to fetch data
 */

import { internalQuery, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// ============================================
// USER QUERIES
// ============================================

/**
 * Get user profile for workflow processing
 * Returns user preferences needed for AI styling
 */
export const getUserForWorkflow = internalQuery({
  args: {
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
      stylePreferences: v.array(v.string()),
      budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
      firstName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<{
    _id: Id<'users'>;
    gender?: 'male' | 'female' | 'prefer-not-to-say';
    stylePreferences: string[];
    budgetRange?: 'low' | 'mid' | 'premium';
    firstName?: string;
  } | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      gender: user.gender,
      stylePreferences: user.stylePreferences,
      budgetRange: user.budgetRange,
      firstName: user.firstName,
    };
  },
});

/**
 * Get user's primary image for try-on with base64 data
 */
export const getUserPrimaryImage = internalQuery({
  args: {
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      _id: v.id('user_images'),
      storageId: v.id('_storage'),
      url: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<{
    _id: Id<'user_images'>;
    storageId: Id<'_storage'>;
    url: string | null;
  } | null> => {
    // Get primary image for the user (use .first() to handle duplicate primaries gracefully)
    const primaryImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', args.userId).eq('isPrimary', true))
      .first();

    if (!primaryImage) {
      // Fall back to any processed image for the user
      const anyImage = await ctx.db
        .query('user_images')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      if (!anyImage) {
        return null;
      }

      const url = await ctx.storage.getUrl(anyImage.storageId);
      return {
        _id: anyImage._id,
        storageId: anyImage.storageId,
        url,
      };
    }

    const url = await ctx.storage.getUrl(primaryImage.storageId);
    return {
      _id: primaryImage._id,
      storageId: primaryImage.storageId,
      url,
    };
  },
});

// ============================================
// LOOK QUERIES
// ============================================

/**
 * Get pending looks for a user that need image generation
 */
export const getPendingLooksForUser = internalQuery({
  args: {
    userId: v.id('users'),
  },
  returns: v.array(
    v.object({
      _id: v.id('looks'),
      publicId: v.string(),
      itemIds: v.array(v.id('items')),
      nimaComment: v.optional(v.string()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<
    Array<{
      _id: Id<'looks'>;
      publicId: string;
      itemIds: Id<'items'>[];
      nimaComment?: string;
    }>
  > => {
    const pendingLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) =>
        q.eq('creatorUserId', args.userId).eq('generationStatus', 'pending')
      )
      .collect();

    return pendingLooks.map((look) => ({
      _id: look._id,
      publicId: look.publicId,
      itemIds: look.itemIds,
      nimaComment: look.nimaComment,
    }));
  },
});

/**
 * Get look with all item details and their images
 */
export const getLookWithItemImages = internalQuery({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(
    v.object({
      _id: v.id('looks'),
      publicId: v.string(),
      nimaComment: v.optional(v.string()),
      items: v.array(
        v.object({
          _id: v.id('items'),
          name: v.string(),
          brand: v.optional(v.string()),
          description: v.optional(v.string()),
          category: v.union(
            v.literal('top'),
            v.literal('bottom'),
            v.literal('dress'),
            v.literal('outfit'),
            v.literal('swimwear'),
            v.literal('outerwear'),
            v.literal('shoes'),
            v.literal('accessory'),
            v.literal('bag'),
            v.literal('jewelry'),
            v.literal('swimwear')
          ),
          colors: v.array(v.string()),
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    _id: Id<'looks'>;
    publicId: string;
    nimaComment?: string;
    items: Array<{
      _id: Id<'items'>;
      name: string;
      brand?: string;
      description?: string;
      category:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry';
      colors: string[];
      primaryImageUrl: string | null;
    }>;
  } | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return null;
    }

    // Fetch all items with their primary images
    const items = await Promise.all(
      look.itemIds.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        if (!item) {
          return null;
        }

        // Get primary image for the item
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
          .unique();

        let primaryImageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            primaryImageUrl = primaryImage.externalUrl;
          }
        }

        return {
          _id: item._id,
          name: item.name,
          brand: item.brand,
          description: item.description,
          category: item.category,
          colors: item.colors,
          primaryImageUrl,
        };
      })
    );

    // Filter out null items
    const validItems = items.filter((item) => item !== null) as Array<{
      _id: Id<'items'>;
      name: string;
      brand?: string;
      description?: string;
      category:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry';
      colors: string[];
      primaryImageUrl: string | null;
    }>;

    return {
      _id: look._id,
      publicId: look.publicId,
      nimaComment: look.nimaComment,
      items: validItems,
    };
  },
});

/**
 * Check if user has any completed looks (for workflow trigger decision)
 */
export const getUserCompletedLooksCount = internalQuery({
  args: {
    userId: v.id('users'),
  },
  returns: v.number(),
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }): Promise<number> => {
    const completedLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) =>
        q.eq('creatorUserId', args.userId).eq('generationStatus', 'completed')
      )
      .collect();

    return completedLooks.length;
  },
});

// ============================================
// ITEM QUERIES FOR AI
// ============================================

/**
 * Search items by name for AI tool
 */
export const searchItemsForAI = internalQuery({
  args: {
    searchQuery: v.string(),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('unisex'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('items'),
      publicId: v.string(),
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('swimwear'),
        v.literal('outerwear'),
        v.literal('shoes'),
        v.literal('accessory'),
        v.literal('bag'),
        v.literal('jewelry'),
        v.literal('swimwear')
      ),
      colors: v.array(v.string()),
      tags: v.array(v.string()),
      price: v.number(),
      currency: v.string(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      searchQuery: string;
      gender?: 'male' | 'female' | 'unisex';
      limit?: number;
    }
  ): Promise<
    Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      category:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry';
      colors: string[];
      tags: string[];
      price: number;
      currency: string;
    }>
  > => {
    const limit = args.limit ?? 20;

    const searchQuery = ctx.db.query('items').withSearchIndex('search_items', (q) => {
      let search = q.search('name', args.searchQuery);
      if (args.gender) {
        search = search.eq('gender', args.gender);
      }
      search = search.eq('isActive', true);
      return search;
    });

    const items = await searchQuery.take(limit);

    return items.map((item) => ({
      _id: item._id,
      publicId: item.publicId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      colors: item.colors,
      tags: item.tags,
      price: item.price,
      currency: item.currency,
    }));
  },
});

/**
 * Get all active items for AI when search yields no results
 */
export const getAllItemsForAI = internalQuery({
  args: {
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('unisex'))),
    category: v.optional(
      v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('swimwear'),
        v.literal('outerwear'),
        v.literal('shoes'),
        v.literal('accessory'),
        v.literal('bag'),
        v.literal('jewelry'),
        v.literal('swimwear')
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('items'),
      publicId: v.string(),
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('swimwear'),
        v.literal('outerwear'),
        v.literal('shoes'),
        v.literal('accessory'),
        v.literal('bag'),
        v.literal('jewelry'),
        v.literal('swimwear')
      ),
      colors: v.array(v.string()),
      tags: v.array(v.string()),
      price: v.number(),
      currency: v.string(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      gender?: 'male' | 'female' | 'unisex';
      category?:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry'
        | 'swimwear';
      limit?: number;
    }
  ): Promise<
    Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      category:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry';
      colors: string[];
      tags: string[];
      price: number;
      currency: string;
    }>
  > => {
    const limit = args.limit ?? 50;

    let query;
    if (args.gender && args.category) {
      query = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', args.gender!).eq('category', args.category!)
        );
    } else if (args.gender) {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', args.gender!));
    } else if (args.category) {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', args.category!)
        );
    } else {
      query = ctx.db.query('items').withIndex('by_active_and_category', (q) => q.eq('isActive', true));
    }

    const items = await query.take(limit);

    // Filter for active items
    const activeItems = items.filter((item) => item.isActive);

    return activeItems.map((item) => ({
      _id: item._id,
      publicId: item.publicId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      colors: item.colors,
      tags: item.tags,
      price: item.price,
      currency: item.currency,
    }));
  },
});

// ============================================
// SINGLE ITEM QUERIES
// ============================================

/**
 * Get an item with its primary image for try-on
 */
export const getItemWithPrimaryImage = internalQuery({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      item: v.object({
        _id: v.id('items'),
        name: v.string(),
        brand: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.union(
          v.literal('top'),
          v.literal('bottom'),
          v.literal('dress'),
          v.literal('outfit'),
          v.literal('swimwear'),
          v.literal('outerwear'),
          v.literal('shoes'),
          v.literal('accessory'),
          v.literal('bag'),
          v.literal('jewelry'),
          v.literal('swimwear')
        ),
        colors: v.array(v.string()),
        price: v.number(),
        currency: v.string(),
      }),
      primaryImageUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    item: {
      _id: Id<'items'>;
      name: string;
      brand?: string;
      description?: string;
      category:
        | 'top'
        | 'bottom'
        | 'dress'
        | 'outfit'
        | 'swimwear'
        | 'outerwear'
        | 'shoes'
        | 'accessory'
        | 'bag'
        | 'jewelry';
      colors: string[];
      price: number;
      currency: string;
    };
    primaryImageUrl: string | null;
  } | null> => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      return null;
    }

    // Get primary image for the item
    const primaryImage = await ctx.db
      .query('item_images')
      .withIndex('by_item_and_primary', (q) => q.eq('itemId', args.itemId).eq('isPrimary', true))
      .unique();

    let primaryImageUrl: string | null = null;
    if (primaryImage) {
      if (primaryImage.storageId) {
        primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
      } else if (primaryImage.externalUrl) {
        primaryImageUrl = primaryImage.externalUrl;
      }
    }

    return {
      item: {
        _id: item._id,
        name: item.name,
        brand: item.brand,
        description: item.description,
        category: item.category,
        colors: item.colors,
        price: item.price,
        currency: item.currency,
      },
      primaryImageUrl,
    };
  },
});

// Note: Image data is fetched in actions using ctx.storage.getUrl() and fetch()
// The getUserPrimaryImage query returns the URL which actions can use to fetch the image

