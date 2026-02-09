import { query, internalQuery, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// Status validator
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed')
);

// Full item_try_on validator for returns
const itemTryOnValidator = v.object({
  _id: v.id('item_try_ons'),
  _creationTime: v.number(),
  itemId: v.id('items'),
  userId: v.id('users'),
  storageId: v.optional(v.id('_storage')),
  userImageId: v.id('user_images'),
  status: statusValidator,
  generationProvider: v.optional(v.string()),
  generationJobId: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Get a single item try-on by ID
 */
export const getItemTryOn = internalQuery({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.union(itemTryOnValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
  ): Promise<Doc<'item_try_ons'> | null> => {
    const tryOn = await ctx.db.get(args.itemTryOnId);
    return tryOn;
  },
});

/**
 * Get an item try-on for a specific user and item
 * Returns the most recent completed try-on if available
 */
export const getItemTryOnForUser = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      tryOn: itemTryOnValidator,
      imageUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    tryOn: Doc<'item_try_ons'>;
    imageUrl: string | null;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get the most recent try-on for this item and user
    const tryOn = await ctx.db
      .query('item_try_ons')
      .withIndex('by_item_and_user', (q) =>
        q.eq('itemId', args.itemId).eq('userId', user._id)
      )
      .order('desc')
      .first();

    if (!tryOn) {
      return null;
    }

    // Get image URL if completed
    let imageUrl: string | null = null;
    if (tryOn.storageId) {
      imageUrl = await ctx.storage.getUrl(tryOn.storageId);
    }

    return {
      tryOn,
      imageUrl,
    };
  },
});

/**
 * Get all item try-ons for the current user
 */
export const getUserItemTryOns = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(statusValidator),
  },
  returns: v.array(
    v.object({
      tryOn: itemTryOnValidator,
      imageUrl: v.union(v.string(), v.null()),
      item: v.union(
        v.object({
          _id: v.id('items'),
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
          price: v.number(),
          currency: v.string(),
        }),
        v.null()
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      limit?: number;
      status?: 'pending' | 'processing' | 'completed' | 'failed';
    }
  ): Promise<
    Array<{
      tryOn: Doc<'item_try_ons'>;
      imageUrl: string | null;
      item: {
        _id: Id<'items'>;
        name: string;
        brand?: string;
        category: 'top' | 'bottom' | 'dress' | 'outfit' | 'swimwear' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
        price: number;
        currency: string;
      } | null;
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

    const limit = Math.min(args.limit ?? 50, 100);

    // Query try-ons for this user
    const tryOnsQuery = ctx.db
      .query('item_try_ons')
      .withIndex('by_user', (q) => q.eq('userId', user._id));

    const tryOns = await tryOnsQuery.order('desc').take(limit);

    // Filter by status if provided
    const filteredTryOns = args.status
      ? tryOns.filter((t) => t.status === args.status)
      : tryOns;

    // Fetch item details and image URLs for each try-on
    const results = await Promise.all(
      filteredTryOns.map(async (tryOn) => {
        let imageUrl: string | null = null;
        if (tryOn.storageId) {
          imageUrl = await ctx.storage.getUrl(tryOn.storageId);
        }

        const item = await ctx.db.get(tryOn.itemId);
        const itemData = item
          ? {
              _id: item._id,
              name: item.name,
              brand: item.brand,
              category: item.category,
              price: item.price,
              currency: item.currency,
            }
          : null;

        return {
          tryOn,
          imageUrl,
          item: itemData,
        };
      })
    );

    return results;
  },
});

/**
 * Check if a try-on exists for a specific item and current user
 */
export const hasItemTryOn = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.object({
    exists: v.boolean(),
    status: v.union(statusValidator, v.null()),
    tryOnId: v.union(v.id('item_try_ons'), v.null()),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    exists: boolean;
    status: 'pending' | 'processing' | 'completed' | 'failed' | null;
    tryOnId: Id<'item_try_ons'> | null;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { exists: false, status: null, tryOnId: null };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { exists: false, status: null, tryOnId: null };
    }

    // Get the most recent try-on for this item and user
    const tryOn = await ctx.db
      .query('item_try_ons')
      .withIndex('by_item_and_user', (q) =>
        q.eq('itemId', args.itemId).eq('userId', user._id)
      )
      .order('desc')
      .first();

    if (!tryOn) {
      return { exists: false, status: null, tryOnId: null };
    }

    return {
      exists: true,
      status: tryOn.status,
      tryOnId: tryOn._id,
    };
  },
});

/**
 * Get item try-on with full details including item info and image URL
 * Used on the try-on result display
 */
export const getItemTryOnWithDetails = query({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.union(
    v.object({
      tryOn: itemTryOnValidator,
      imageUrl: v.union(v.string(), v.null()),
      item: v.object({
        _id: v.id('items'),
        publicId: v.string(),
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
        price: v.number(),
        currency: v.string(),
        colors: v.array(v.string()),
        sizes: v.array(v.string()),
      }),
      itemImageUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
  ): Promise<{
    tryOn: Doc<'item_try_ons'>;
    imageUrl: string | null;
    item: {
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      description?: string;
      category: 'top' | 'bottom' | 'dress' | 'outfit' | 'swimwear' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      price: number;
      currency: string;
      colors: string[];
      sizes: string[];
    };
    itemImageUrl: string | null;
  } | null> => {
    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn) {
      return null;
    }

    // Get try-on image URL
    let imageUrl: string | null = null;
    if (tryOn.storageId) {
      imageUrl = await ctx.storage.getUrl(tryOn.storageId);
    }

    // Get item details
    const item = await ctx.db.get(tryOn.itemId);
    if (!item || !item.isActive) {
      return null;
    }

    // Get item primary image
    const primaryImage = await ctx.db
      .query('item_images')
      .withIndex('by_item_and_primary', (q) =>
        q.eq('itemId', tryOn.itemId).eq('isPrimary', true)
      )
      .unique();

    let itemImageUrl: string | null = null;
    if (primaryImage) {
      if (primaryImage.storageId) {
        itemImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
      } else if (primaryImage.externalUrl) {
        itemImageUrl = primaryImage.externalUrl;
      }
    }

    return {
      tryOn,
      imageUrl,
      item: {
        _id: item._id,
        publicId: item.publicId,
        name: item.name,
        brand: item.brand,
        description: item.description,
        category: item.category,
        price: item.price,
        currency: item.currency,
        colors: item.colors,
        sizes: item.sizes,
      },
      itemImageUrl,
    };
  },
});
