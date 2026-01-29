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
  sellerId: v.optional(v.id('sellers')),
  viewCount: v.optional(v.number()),
  saveCount: v.optional(v.number()),
  purchaseCount: v.optional(v.number()),
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

/**
 * List items with their primary images for the Apparel grid
 * Returns items with image URLs for efficient grid rendering
 */
export const listItemsWithImages = query({
  args: {
    category: v.optional(categoryValidator),
    gender: v.optional(genderValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    items: v.array(
      v.object({
        _id: v.id('items'),
        _creationTime: v.number(),
        publicId: v.string(),
        name: v.string(),
        brand: v.optional(v.string()),
        description: v.optional(v.string()),
        category: categoryValidator,
        gender: genderValidator,
        price: v.number(),
        currency: v.string(),
        originalPrice: v.optional(v.number()),
        colors: v.array(v.string()),
        sizes: v.array(v.string()),
        tags: v.array(v.string()),
        inStock: v.boolean(),
        isFeatured: v.optional(v.boolean()),
        primaryImageUrl: v.union(v.string(), v.null()),
      })
    ),
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
    items: Array<{
      _id: Id<'items'>;
      _creationTime: number;
      publicId: string;
      name: string;
      brand?: string;
      description?: string;
      category: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';
      gender: 'male' | 'female' | 'unisex';
      price: number;
      currency: string;
      originalPrice?: number;
      colors: string[];
      sizes: string[];
      tags: string[];
      inStock: boolean;
      isFeatured?: boolean;
      primaryImageUrl: string | null;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // If cursor is provided, get the cursor item to find its creation time for pagination
    let cursorCreationTime: number | null = null;
    if (args.cursor) {
      const cursorItem = await ctx.db.get(args.cursor as Id<'items'>);
      if (cursorItem) {
        cursorCreationTime = cursorItem._creationTime;
      }
    }

    let baseQuery;
    if (args.gender && args.category) {
      baseQuery = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', args.gender!).eq('category', args.category!)
        );
    } else if (args.category) {
      baseQuery = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', args.category!)
        );
    } else if (args.gender) {
      baseQuery = ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', args.gender!));
    } else {
      baseQuery = ctx.db.query('items').withIndex('by_active_and_category', (q) => q.eq('isActive', true));
    }

    // Apply cursor-based pagination: get items created BEFORE the cursor item (for desc order)
    let results;
    if (cursorCreationTime !== null) {
      results = await baseQuery
        .filter((q) => q.lt(q.field('_creationTime'), cursorCreationTime!))
        .order('desc')
        .take(limit + 1);
    } else {
      results = await baseQuery.order('desc').take(limit + 1);
    }

    const activeItems = results.filter((item) => item.isActive);
    const hasMore = activeItems.length > limit;
    const items = activeItems.slice(0, limit);

    // Fetch primary images for all items in parallel
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
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
          _creationTime: item._creationTime,
          publicId: item.publicId,
          name: item.name,
          brand: item.brand,
          description: item.description,
          category: item.category,
          gender: item.gender,
          price: item.price,
          currency: item.currency,
          originalPrice: item.originalPrice,
          colors: item.colors,
          sizes: item.sizes,
          tags: item.tags,
          inStock: item.inStock,
          isFeatured: item.isFeatured,
          primaryImageUrl,
        };
      })
    );

    return {
      items: itemsWithImages,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1]._id : null,
      hasMore,
    };
  },
});

// Category type for the carousel
type CategoryType = 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';

/**
 * Get one sample item with image per category for the Shop by Category carousel
 * Returns an array of categories with their sample product image
 */
export const getCategorySamples = query({
  args: {},
  returns: v.array(
    v.object({
      category: categoryValidator,
      label: v.string(),
      sampleImageUrl: v.union(v.string(), v.null()),
      itemCount: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: Record<string, never>
  ): Promise<
    Array<{
      category: CategoryType;
      label: string;
      sampleImageUrl: string | null;
      itemCount: number;
    }>
  > => {
    const categories: Array<{ key: CategoryType; label: string }> = [
      { key: 'top', label: 'Tops' },
      { key: 'bottom', label: 'Bottoms' },
      { key: 'dress', label: 'Dresses' },
      { key: 'outerwear', label: 'Outerwear' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'accessory', label: 'Accessories' },
      { key: 'bag', label: 'Bags' },
      { key: 'jewelry', label: 'Jewelry' },
    ];

    const results = await Promise.all(
      categories.map(async ({ key, label }) => {
        // Get one active item from this category
        const items = await ctx.db
          .query('items')
          .withIndex('by_active_and_category', (q) => q.eq('isActive', true).eq('category', key))
          .take(10);

        // Count total items in category
        const allCategoryItems = await ctx.db
          .query('items')
          .withIndex('by_active_and_category', (q) => q.eq('isActive', true).eq('category', key))
          .collect();
        const itemCount = allCategoryItems.length;

        // Find a sample item with an image
        let sampleImageUrl: string | null = null;
        for (const item of items) {
          const primaryImage = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
            .unique();

          if (primaryImage) {
            if (primaryImage.storageId) {
              sampleImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
            } else if (primaryImage.externalUrl) {
              sampleImageUrl = primaryImage.externalUrl;
            }
            if (sampleImageUrl) break;
          }
        }

        return {
          category: key,
          label,
          sampleImageUrl,
          itemCount,
        };
      })
    );

    // Filter out categories with no items
    return results.filter((cat) => cat.itemCount > 0);
  },
});

// Extended category type that includes gender-based categories
type ExtendedCategoryType = CategoryType | 'male' | 'female';

/**
 * Get category samples with gender awareness
 * Returns categories with an opposite-gender category as the first item
 * For male users: shows "For Her" first, then regular categories
 * For female users: shows "For Him" first, then regular categories
 */
export const getCategorySamplesWithGender = query({
  args: {
    userGender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))),
  },
  returns: v.array(
    v.object({
      category: v.union(categoryValidator, v.literal('male'), v.literal('female')),
      label: v.string(),
      sampleImageUrl: v.union(v.string(), v.null()),
      itemCount: v.number(),
      isGenderCategory: v.optional(v.boolean()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      userGender?: 'male' | 'female' | 'prefer-not-to-say';
    }
  ): Promise<
    Array<{
      category: ExtendedCategoryType;
      label: string;
      sampleImageUrl: string | null;
      itemCount: number;
      isGenderCategory?: boolean;
    }>
  > => {
    const results: Array<{
      category: ExtendedCategoryType;
      label: string;
      sampleImageUrl: string | null;
      itemCount: number;
      isGenderCategory?: boolean;
    }> = [];

    // Determine opposite gender for the first category
    const oppositeGender: 'male' | 'female' | null = 
      args.userGender === 'male' ? 'female' :
      args.userGender === 'female' ? 'male' :
      null;

    // Add opposite gender category first (if user has a gender set)
    if (oppositeGender) {
      const genderLabel = oppositeGender === 'female' ? 'For Her' : 'For Him';
      
      // Get items of the opposite gender
      const oppositeGenderItems = await ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', oppositeGender))
        .take(10);

      // Count total items for opposite gender
      const allOppositeGenderItems = await ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('gender', oppositeGender))
        .collect();
      const oppositeGenderCount = allOppositeGenderItems.length;

      // Find a sample image from opposite gender items
      let sampleImageUrl: string | null = null;
      for (const item of oppositeGenderItems) {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
          .unique();

        if (primaryImage) {
          if (primaryImage.storageId) {
            sampleImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            sampleImageUrl = primaryImage.externalUrl;
          }
          if (sampleImageUrl) break;
        }
      }

      if (oppositeGenderCount > 0) {
        results.push({
          category: oppositeGender,
          label: genderLabel,
          sampleImageUrl,
          itemCount: oppositeGenderCount,
          isGenderCategory: true,
        });
      }
    }

    // Standard categories
    const categories: Array<{ key: CategoryType; label: string }> = [
      { key: 'top', label: 'Tops' },
      { key: 'bottom', label: 'Bottoms' },
      { key: 'dress', label: 'Dresses' },
      { key: 'outerwear', label: 'Outerwear' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'accessory', label: 'Accessories' },
      { key: 'bag', label: 'Bags' },
      { key: 'jewelry', label: 'Jewelry' },
    ];

    // Determine user's gender for filtering categories
    // If user is male, show male + unisex items; if female, show female + unisex
    const userGender: 'male' | 'female' | null = 
      args.userGender === 'male' ? 'male' :
      args.userGender === 'female' ? 'female' :
      null;

    const categoryResults = await Promise.all(
      categories.map(async ({ key, label }) => {
        let items: Doc<'items'>[] = [];
        let itemCount = 0;

        if (userGender) {
          // Filter by user's gender + unisex items
          const genderItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) => q.eq('gender', userGender).eq('category', key))
            .take(10);
          
          const unisexItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) => q.eq('gender', 'unisex').eq('category', key))
            .take(10);
          
          items = [...genderItems, ...unisexItems].filter(item => item.isActive);

          // Count total items (user's gender + unisex)
          const allGenderItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) => q.eq('gender', userGender).eq('category', key))
            .collect();
          const allUnisexItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) => q.eq('gender', 'unisex').eq('category', key))
            .collect();
          
          itemCount = allGenderItems.filter(i => i.isActive).length + allUnisexItems.filter(i => i.isActive).length;
        } else {
          // No gender preference - get all items in this category
          items = await ctx.db
            .query('items')
            .withIndex('by_active_and_category', (q) => q.eq('isActive', true).eq('category', key))
            .take(10);

          const allCategoryItems = await ctx.db
            .query('items')
            .withIndex('by_active_and_category', (q) => q.eq('isActive', true).eq('category', key))
            .collect();
          itemCount = allCategoryItems.length;
        }

        // Find a sample item with an image
        let sampleImageUrl: string | null = null;
        for (const item of items) {
          const primaryImage = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
            .unique();

          if (primaryImage) {
            if (primaryImage.storageId) {
              sampleImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
            } else if (primaryImage.externalUrl) {
              sampleImageUrl = primaryImage.externalUrl;
            }
            if (sampleImageUrl) break;
          }
        }

        return {
          category: key as ExtendedCategoryType,
          label,
          sampleImageUrl,
          itemCount,
        };
      })
    );

    // Add non-empty categories to results
    results.push(...categoryResults.filter((cat) => cat.itemCount > 0));

    return results;
  },
});

