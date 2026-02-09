import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Validators
const categoryValidator = v.union(
  v.literal('top'),
  v.literal('bottom'),
  v.literal('dress'),
  v.literal('outfit'),
  v.literal('swimwear'),
  v.literal('outerwear'),
  v.literal('shoes'),
  v.literal('accessory'),
  v.literal('bag'),
  v.literal('jewelry')
);

const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));

const imageTypeValidator = v.union(
  v.literal('front'),
  v.literal('back'),
  v.literal('side'),
  v.literal('detail'),
  v.literal('model'),
  v.literal('flat_lay')
);

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
  sellerId: v.optional(v.id('sellers')),
  viewCount: v.optional(v.number()),
  saveCount: v.optional(v.number()),
  purchaseCount: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Item image validator
const itemImageValidator = v.object({
  _id: v.id('item_images'),
  _creationTime: v.number(),
  itemId: v.id('items'),
  storageId: v.optional(v.id('_storage')),
  externalUrl: v.optional(v.string()),
  altText: v.optional(v.string()),
  sortOrder: v.number(),
  isPrimary: v.boolean(),
  imageType: imageTypeValidator,
  createdAt: v.number(),
});

/**
 * List all items for admin (includes inactive items)
 * Supports pagination, search, and filtering
 */
export const listAllItems = query({
  args: {
    category: v.optional(categoryValidator),
    gender: v.optional(genderValidator),
    isActive: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    items: v.array(
      v.object({
        item: itemValidator,
        primaryImage: v.union(itemImageValidator, v.null()),
        imageUrl: v.union(v.string(), v.null()),
      })
    ),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
    totalCount: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      category?: 'top' | 'bottom' | 'dress' | 'outfit' | 'swimwear' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      gender?: 'male' | 'female' | 'unisex';
      isActive?: boolean;
      searchQuery?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    items: Array<{
      item: Doc<'items'>;
      primaryImage: Doc<'item_images'> | null;
      imageUrl: string | null;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get all items first (for admin, we might need to filter more flexibly)
    let allItems: Doc<'items'>[];

    if (args.searchQuery && args.searchQuery.trim()) {
      // Use search index for text search
      const searchResults = await ctx.db
        .query('items')
        .withSearchIndex('search_items', (q) => {
          let search = q.search('name', args.searchQuery!);
          if (args.category) {
            search = search.eq('category', args.category);
          }
          if (args.gender) {
            search = search.eq('gender', args.gender);
          }
          if (args.isActive !== undefined) {
            search = search.eq('isActive', args.isActive);
          }
          return search;
        })
        .take(limit * 2); // Get more to handle filtering

      allItems = searchResults;
    } else {
      // Use regular query with index
      let query;
      if (args.category && args.gender) {
        query = ctx.db
          .query('items')
          .withIndex('by_gender_and_category', (q) =>
            q.eq('gender', args.gender!).eq('category', args.category!)
          );
      } else if (args.category) {
        query = ctx.db.query('items').withIndex('by_category', (q) => q.eq('category', args.category!));
      } else {
        query = ctx.db.query('items');
      }

      allItems = await query.order('desc').collect();
    }

    // Apply additional filters
    let filteredItems = allItems;

    if (args.gender && !args.searchQuery) {
      filteredItems = filteredItems.filter((item) => item.gender === args.gender);
    }

    if (args.isActive !== undefined) {
      filteredItems = filteredItems.filter((item) => item.isActive === args.isActive);
    }

    const totalCount = filteredItems.length;

    // Handle cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = filteredItems.findIndex((item) => item._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedItems = filteredItems.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedItems.length > limit;
    const items = paginatedItems.slice(0, limit);

    // Get primary images for each item
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
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
      })
    );

    return {
      items: itemsWithImages,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1]._id : null,
      hasMore,
      totalCount,
    };
  },
});

/**
 * Get a single item for admin editing (includes inactive)
 */
export const getItemForAdmin = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      item: itemValidator,
      images: v.array(
        v.object({
          _id: v.id('item_images'),
          _creationTime: v.number(),
          itemId: v.id('items'),
          storageId: v.optional(v.id('_storage')),
          externalUrl: v.optional(v.string()),
          altText: v.optional(v.string()),
          sortOrder: v.number(),
          isPrimary: v.boolean(),
          imageType: imageTypeValidator,
          createdAt: v.number(),
          url: v.union(v.string(), v.null()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemId: Id<'items'> }
  ): Promise<{
    item: Doc<'items'>;
    images: Array<Doc<'item_images'> & { url: string | null }>;
  } | null> => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return null;
    }

    // Get all images for the item
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

    return {
      item,
      images: imagesWithUrls,
    };
  },
});

/**
 * Check if the current user is an admin
 */
export const isCurrentUserAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx: QueryCtx): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    return user.role === 'admin';
  },
});

/**
 * Get admin dashboard stats
 */
export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalItems: v.number(),
    activeItems: v.number(),
    inactiveItems: v.number(),
    itemsByCategory: v.array(
      v.object({
        category: v.string(),
        count: v.number(),
      })
    ),
    // Cart statistics
    totalCartsWithItems: v.number(),
    totalCartItems: v.number(),
    cartTotalValue: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    itemsByCategory: Array<{ category: string; count: number }>;
    totalCartsWithItems: number;
    totalCartItems: number;
    cartTotalValue: number;
  }> => {
    const allItems = await ctx.db.query('items').collect();

    const totalItems = allItems.length;
    const activeItems = allItems.filter((item) => item.isActive).length;
    const inactiveItems = totalItems - activeItems;

    // Count by category
    const categoryCount: Record<string, number> = {};
    for (const item of allItems) {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    }

    const itemsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count,
    }));

    // Cart statistics
    const allCartItems = await ctx.db.query('cart_items').collect();
    
    // Count unique users with items in cart
    const usersWithCarts = new Set(allCartItems.map((item) => item.userId));
    const totalCartsWithItems = usersWithCarts.size;
    
    // Count total cart items (sum of quantities)
    const totalCartItems = allCartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate total cart value
    let cartTotalValue = 0;
    for (const cartItem of allCartItems) {
      const item = await ctx.db.get(cartItem.itemId);
      if (item) {
        cartTotalValue += item.price * cartItem.quantity;
      }
    }

    return {
      totalItems,
      activeItems,
      inactiveItems,
      itemsByCategory,
      totalCartsWithItems,
      totalCartItems,
      cartTotalValue,
    };
  },
});

