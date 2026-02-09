import { v } from 'convex/values';
import { query, mutation, QueryCtx, MutationCtx } from '../_generated/server';
import { Id, Doc } from '../_generated/dataModel';

/**
 * Toggle like on an item - adds like if not liked, removes if already liked
 */
export const toggleLike = mutation({
  args: {
    itemId: v.id('items'),
  },
  returns: v.object({
    isLiked: v.boolean(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{ isLiked: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Check if item exists
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query('item_likes')
      .withIndex('by_user_and_item', (q) =>
        q.eq('userId', user._id).eq('itemId', args.itemId)
      )
      .unique();

    if (existingLike) {
      // Unlike - remove the like
      await ctx.db.delete(existingLike._id);
      
      // Update item save count
      if (item.saveCount && item.saveCount > 0) {
        await ctx.db.patch(args.itemId, {
          saveCount: item.saveCount - 1,
        });
      }
      
      return { isLiked: false };
    } else {
      // Like - add the like
      await ctx.db.insert('item_likes', {
        userId: user._id,
        itemId: args.itemId,
        createdAt: Date.now(),
      });
      
      // Update item save count
      await ctx.db.patch(args.itemId, {
        saveCount: (item.saveCount || 0) + 1,
      });
      
      return { isLiked: true };
    }
  },
});

/**
 * Check if current user has liked an item
 */
export const isItemLiked = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    // Check if liked
    const existingLike = await ctx.db
      .query('item_likes')
      .withIndex('by_user_and_item', (q) =>
        q.eq('userId', user._id).eq('itemId', args.itemId)
      )
      .unique();

    return existingLike !== null;
  },
});

/**
 * Get all items liked by the current user
 */
export const getLikedItems = query({
  args: {
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
      price: v.number(),
      currency: v.string(),
      originalPrice: v.optional(v.number()),
      colors: v.array(v.string()),
      primaryImageUrl: v.union(v.string(), v.null()),
      likedAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<Array<{
    _id: Id<'items'>;
    publicId: string;
    name: string;
    brand?: string;
    category: 'top' | 'bottom' | 'dress' | 'outfit' | 'swimwear' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
    price: number;
    currency: string;
    originalPrice?: number;
    colors: string[];
    primaryImageUrl: string | null;
    likedAt: number;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get liked items sorted by most recent
    const likes = await ctx.db
      .query('item_likes')
      .withIndex('by_user_and_created', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(args.limit || 50);

    // Fetch item details and images
    const likedItems = await Promise.all(
      likes.map(async (like) => {
        const item = await ctx.db.get(like.itemId);
        if (!item || !item.isActive) {
          return null;
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) =>
            q.eq('itemId', item._id).eq('isPrimary', true)
          )
          .first();

        let imageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          } else if (primaryImage.storageId) {
            imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          }
        }

        return {
          _id: item._id,
          publicId: item.publicId,
          name: item.name,
          brand: item.brand,
          category: item.category,
          price: item.price,
          currency: item.currency,
          originalPrice: item.originalPrice,
          colors: item.colors,
          primaryImageUrl: imageUrl,
          likedAt: like.createdAt,
        };
      })
    );

    // Filter out null items (deleted or inactive)
    return likedItems.filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

/**
 * Get liked item IDs for the current user (for quick lookup)
 */
export const getLikedItemIds = query({
  args: {},
  returns: v.array(v.id('items')),
  handler: async (ctx: QueryCtx): Promise<Id<'items'>[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get all liked item IDs
    const likes = await ctx.db
      .query('item_likes')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    return likes.map((like) => like.itemId);
  },
});


