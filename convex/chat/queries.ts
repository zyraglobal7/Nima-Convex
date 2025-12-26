import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// Item result with image
const itemWithImageValidator = v.object({
  _id: v.id('items'),
  publicId: v.string(),
  name: v.string(),
  brand: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.string(),
  gender: v.string(),
  price: v.number(),
  currency: v.string(),
  colors: v.array(v.string()),
  sizes: v.array(v.string()),
  tags: v.array(v.string()),
  occasion: v.optional(v.array(v.string())),
  imageUrl: v.union(v.string(), v.null()),
});

/**
 * Search for items based on user preferences and search context
 * Uses text search for name matching and filters for preferences
 */
export const searchItemsForChat = query({
  args: {
    searchQuery: v.optional(v.string()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('unisex'))),
    category: v.optional(
      v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('outerwear'),
        v.literal('shoes'),
        v.literal('accessory'),
        v.literal('bag'),
        v.literal('jewelry')
      )
    ),
    stylePreferences: v.optional(v.array(v.string())),
    occasion: v.optional(v.string()),
    budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
    limit: v.optional(v.number()),
  },
  returns: v.array(itemWithImageValidator),
  handler: async (
    ctx: QueryCtx,
    args: {
      searchQuery?: string;
      gender?: 'male' | 'female' | 'unisex';
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      stylePreferences?: string[];
      occasion?: string;
      budgetRange?: 'low' | 'mid' | 'premium';
      limit?: number;
    }
  ): Promise<
    Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      description?: string;
      category: string;
      gender: string;
      price: number;
      currency: string;
      colors: string[];
      sizes: string[];
      tags: string[];
      occasion?: string[];
      imageUrl: string | null;
    }>
  > => {
    const limit = Math.min(args.limit ?? 12, 50);
    let items: Doc<'items'>[] = [];

    // Use text search if query provided
    if (args.searchQuery && args.searchQuery.trim()) {
      let searchQuery = ctx.db
        .query('items')
        .withSearchIndex('search_items', (q) => {
          let sq = q.search('name', args.searchQuery!);
          sq = sq.eq('isActive', true);
          if (args.gender) {
            sq = sq.eq('gender', args.gender);
          }
          if (args.category) {
            sq = sq.eq('category', args.category);
          }
          return sq;
        });

      items = await searchQuery.take(limit * 2); // Get extra for filtering
    } else {
      // No search query, use index-based query
      if (args.gender && args.category) {
        items = await ctx.db
          .query('items')
          .withIndex('by_gender_and_category', (q) =>
            q.eq('gender', args.gender!).eq('category', args.category!)
          )
          .take(limit * 2);
      } else if (args.gender) {
        items = await ctx.db
          .query('items')
          .withIndex('by_active_and_gender', (q) =>
            q.eq('isActive', true).eq('gender', args.gender!)
          )
          .take(limit * 2);
      } else if (args.category) {
        items = await ctx.db
          .query('items')
          .withIndex('by_active_and_category', (q) =>
            q.eq('isActive', true).eq('category', args.category!)
          )
          .take(limit * 2);
      } else {
        // Get random active items
        items = await ctx.db
          .query('items')
          .withIndex('by_active_and_category', (q) => q.eq('isActive', true))
          .take(limit * 2);
      }
    }

    // Filter out inactive items (if not already filtered)
    items = items.filter((item) => item.isActive);

    // Apply style preference filtering
    if (args.stylePreferences && args.stylePreferences.length > 0) {
      const styleSet = new Set(args.stylePreferences.map((s) => s.toLowerCase()));
      items = items.filter((item) =>
        item.tags.some((tag) => styleSet.has(tag.toLowerCase()))
      );
    }

    // Apply occasion filtering
    if (args.occasion) {
      const occasionLower = args.occasion.toLowerCase();
      items = items.filter(
        (item) =>
          item.occasion?.some((o) => o.toLowerCase().includes(occasionLower)) ||
          item.tags.some((t) => t.toLowerCase().includes(occasionLower))
      );
    }

    // Apply budget filtering
    if (args.budgetRange) {
      // Budget ranges in cents
      const budgetRanges = {
        low: { min: 0, max: 5000 }, // $0 - $50
        mid: { min: 5000, max: 20000 }, // $50 - $200
        premium: { min: 20000, max: Infinity }, // $200+
      };
      const range = budgetRanges[args.budgetRange];
      items = items.filter((item) => item.price >= range.min && item.price <= range.max);
    }

    // Limit results
    items = items.slice(0, limit);

    // Fetch primary images for each item
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) =>
            q.eq('itemId', item._id).eq('isPrimary', true)
          )
          .unique();

        let imageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }

        return {
          _id: item._id,
          publicId: item.publicId,
          name: item.name,
          brand: item.brand,
          description: item.description,
          category: item.category,
          gender: item.gender,
          price: item.price,
          currency: item.currency,
          colors: item.colors,
          sizes: item.sizes,
          tags: item.tags,
          occasion: item.occasion,
          imageUrl,
        };
      })
    );

    return itemsWithImages;
  },
});

/**
 * Get recommended items for a user based on their profile
 * Returns a curated selection matching their preferences
 */
export const getRecommendedItemsForUser = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(itemWithImageValidator),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      description?: string;
      category: string;
      gender: string;
      price: number;
      currency: string;
      colors: string[];
      sizes: string[];
      tags: string[];
      occasion?: string[];
      imageUrl: string | null;
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

    // Get items based on user's gender and style preferences
    const genderFilter = user.gender === 'prefer-not-to-say' ? undefined : user.gender;
    
    let items: Doc<'items'>[];
    if (genderFilter) {
      items = await ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) =>
          q.eq('isActive', true).eq('gender', genderFilter)
        )
        .take(100);
    } else {
      items = await ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) => q.eq('isActive', true))
        .take(100);
    }
    // Score items based on matching style preferences
    if (user.stylePreferences.length > 0) {
      const styleSet = new Set(user.stylePreferences.map((s) => s.toLowerCase()));
      
      items = items.map((item) => ({
        ...item,
        score: item.tags.filter((tag) => styleSet.has(tag.toLowerCase())).length,
      }))
      .sort((a, b) => (b as typeof a & { score: number }).score - (a as typeof a & { score: number }).score)
      .slice(0, args.limit ?? 12);
    } else {
      items = items.slice(0, args.limit ?? 12);
    }

    // Fetch images
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) =>
            q.eq('itemId', item._id).eq('isPrimary', true)
          )
          .unique();

        let imageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }

        return {
          _id: item._id,
          publicId: item.publicId,
          name: item.name,
          brand: item.brand,
          description: item.description,
          category: item.category,
          gender: item.gender,
          price: item.price,
          currency: item.currency,
          colors: item.colors,
          sizes: item.sizes,
          tags: item.tags,
          occasion: item.occasion,
          imageUrl,
        };
      })
    );

    return itemsWithImages;
  },
});

// Look summary validator for AI context
const lookSummaryValidator = v.object({
  _id: v.id('looks'),
  name: v.optional(v.string()),
  occasion: v.optional(v.string()),
  styleTags: v.array(v.string()),
  totalPrice: v.number(),
  currency: v.string(),
  createdAt: v.number(),
  items: v.array(
    v.object({
      _id: v.id('items'),
      name: v.string(),
      category: v.string(),
      brand: v.optional(v.string()),
    })
  ),
});

/**
 * Get user's recent looks for AI context
 * Returns summarized look info for mixing suggestions
 */
export const getUserRecentLooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(lookSummaryValidator),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      _id: Id<'looks'>;
      name?: string;
      occasion?: string;
      styleTags: string[];
      totalPrice: number;
      currency: string;
      createdAt: number;
      items: Array<{
        _id: Id<'items'>;
        name: string;
        category: string;
        brand?: string;
      }>;
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

    const limit = Math.min(args.limit ?? 15, 30);

    // Get user's recent looks (using by_creator_and_status index, filtering by creatorUserId only)
    const looks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .order('desc')
      .take(limit);

    // Fetch item details for each look
    const looksWithItems = await Promise.all(
      looks.map(async (look) => {
        const items: Array<{
          _id: Id<'items'>;
          name: string;
          category: string;
          brand?: string;
        }> = [];

        for (const itemId of look.itemIds) {
          const item = await ctx.db.get(itemId);
          if (item && item.isActive) {
            items.push({
              _id: item._id,
              name: item.name,
              category: item.category,
              brand: item.brand,
            });
          }
        }

        return {
          _id: look._id,
          name: look.name,
          occasion: look.occasion,
          styleTags: look.styleTags,
          totalPrice: look.totalPrice,
          currency: look.currency,
          createdAt: look.createdAt,
          items,
        };
      })
    );

    return looksWithItems;
  },
});
