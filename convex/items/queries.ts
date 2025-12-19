import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Validator for item category
const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry')
);

// Validator for item gender
const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

// Full item validator for returns
const itemValidator = v.object({
  _id: v.id('items'),
  _creationTime: v.number(),
  publicId: v.string(),
  sku: v.optional(v.string()),
  name: v.string(),
  brand: v.optional(v.string()),
  description: v.optional(v.string()),
  category: categoryValidator,
  subcategory: v.optional(v.string()),
  gender: genderValidator,
  price: v.number(),
  currency: v.string(),
  originalPrice: v.optional(v.number()),
  colors: v.array(v.string()),
  sizes: v.array(v.string()),
  material: v.optional(v.string()),
  tags: v.array(v.string()),
  occasion: v.optional(v.array(v.string())),
  season: v.optional(v.array(v.string())),
  sourceStore: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  affiliateUrl: v.optional(v.string()),
  inStock: v.boolean(),
  stockQuantity: v.optional(v.number()),
  isActive: v.boolean(),
  isFeatured: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Get a single item by ID
 */
export const getItem = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(itemValidator, v.null()),
  handler: async (ctx: QueryCtx, args: { itemId: Id<'items'> }): Promise<Doc<'items'> | null> => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      return null;
    }
    return item;
  },
});

/**
 * Get an item by its public ID
 */
export const getItemByPublicId = query({
  args: {
    publicId: v.string(),
  },
  returns: v.union(itemValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { publicId: string }
  ): Promise<Doc<'items'> | null> => {
    const item = await ctx.db
      .query('items')
      .withIndex('by_public_id', (q) => q.eq('publicId', args.publicId))
      .unique();

    if (!item || !item.isActive) {
      return null;
    }
    return item;
  },
});

/**
 * List items with optional filters
 */
export const listItems = query({
  args: {
    category: v.optional(categoryValidator),
    gender: v.optional(genderValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    items: v.array(itemValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      gender?: 'male' | 'female' | 'unisex';
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    items: Doc<'items'>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let query;
    if (args.gender && args.category) {
      query = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', args.gender!).eq('category', args.category!)
        );
    } else if (args.category) {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', args.category!)
        );
    } else if (args.gender) {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', args.gender!));
    } else {
      query = ctx.db.query('items').withIndex('by_active_and_category', (q) => q.eq('isActive', true));
    }

    // Apply cursor if provided
    const results = await query.order('desc').take(limit + 1);

    // Filter for active items if not already filtered
    const activeItems = results.filter((item) => item.isActive);

    const hasMore = activeItems.length > limit;
    const items = activeItems.slice(0, limit);

    return {
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Search items by name
 */
export const searchItems = query({
  args: {
    searchQuery: v.string(),
    category: v.optional(categoryValidator),
    gender: v.optional(genderValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(itemValidator),
  handler: async (
    ctx: QueryCtx,
    args: {
      searchQuery: string;
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      gender?: 'male' | 'female' | 'unisex';
      limit?: number;
    }
  ): Promise<Doc<'items'>[]> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let searchQuery = ctx.db
      .query('items')
      .withSearchIndex('search_items', (q) => {
        let search = q.search('name', args.searchQuery);
        if (args.category) {
          search = search.eq('category', args.category);
        }
        if (args.gender) {
          search = search.eq('gender', args.gender);
        }
        search = search.eq('isActive', true);
        return search;
      });

    const items = await searchQuery.take(limit);
    return items;
  },
});

/**
 * Get featured items
 */
export const getFeaturedItems = query({
  args: {
    gender: v.optional(genderValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(itemValidator),
  handler: async (
    ctx: QueryCtx,
    args: {
      gender?: 'male' | 'female' | 'unisex';
      limit?: number;
    }
  ): Promise<Doc<'items'>[]> => {
    const limit = Math.min(args.limit ?? 10, MAX_PAGE_SIZE);

    let query;
    if (args.gender) {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', args.gender!));
    } else {
      query = ctx.db.query('items').withIndex('by_active_and_category', (q) => q.eq('isActive', true));
    }

    const items = await query.take(limit * 2); // Get more to filter featured
    const featuredItems = items.filter((item) => item.isFeatured);

    return featuredItems.slice(0, limit);
  },
});

/**
 * Get item with its primary image
 */
export const getItemWithImage = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      item: itemValidator,
      primaryImage: v.union(
        v.object({
          _id: v.id('item_images'),
          _creationTime: v.number(),
          itemId: v.id('items'),
          storageId: v.optional(v.id('_storage')),
          externalUrl: v.optional(v.string()),
          altText: v.optional(v.string()),
          sortOrder: v.number(),
          isPrimary: v.boolean(),
          imageType: v.union(
            v.literal('front'),
            v.literal('back'),
            v.literal('side'),
            v.literal('detail'),
            v.literal('model'),
            v.literal('flat_lay')
          ),
          createdAt: v.number(),
        }),
        v.null()
      ),
      imageUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    item: Doc<'items'>;
    primaryImage: Doc<'item_images'> | null;
    imageUrl: string | null;
  } | null> => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      return null;
    }

    const primaryImage = await ctx.db
      .query('item_images')
      .withIndex('by_item_and_primary', (q) => q.eq('itemId', args.itemId).eq('isPrimary', true))
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
      item,
      primaryImage,
      imageUrl,
    };
  },
});

/**
 * Get all images for an item
 */
export const getItemImages = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.array(
    v.object({
      _id: v.id('item_images'),
      _creationTime: v.number(),
      itemId: v.id('items'),
      storageId: v.optional(v.id('_storage')),
      externalUrl: v.optional(v.string()),
      altText: v.optional(v.string()),
      sortOrder: v.number(),
      isPrimary: v.boolean(),
      imageType: v.union(
        v.literal('front'),
        v.literal('back'),
        v.literal('side'),
        v.literal('detail'),
        v.literal('model'),
        v.literal('flat_lay')
      ),
      createdAt: v.number(),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<
    Array<
      Doc<'item_images'> & {
        url: string | null;
      }
    >
  > => {
    const images = await ctx.db
      .query('item_images')
      .withIndex('by_item', (q) => q.eq('itemId', args.itemId))
      .collect();

    // Sort by sortOrder
    images.sort((a, b) => a.sortOrder - b.sortOrder);

    // Resolve URLs
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        let url: string | null = null;
        if (image.storageId) {
          url = await ctx.storage.getUrl(image.storageId);
        } else if (image.externalUrl) {
          url = image.externalUrl;
        }
        return { ...image, url };
      })
    );

    return imagesWithUrls;
  },
});

