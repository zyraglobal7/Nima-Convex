import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, TIER_PRICES_KES } from '../types';

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
  tryOnCount: v.optional(v.number()),
  cartAddCount: v.optional(v.number()),
  lookbookSaveCount: v.optional(v.number()),
  lookInclusionCount: v.optional(v.number()),
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

// ============================================
// SELLER SUBSCRIPTION ADMIN QUERIES
// ============================================

const adminSellerTierValidator = v.optional(v.union(
  v.literal('basic'),
  v.literal('starter'),
  v.literal('growth'),
  v.literal('premium')
));

const adminSubStatusValidator = v.optional(v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('expired'),
  v.literal('cancelled'),
  v.literal('failed')
));

/**
 * Admin: list all sellers with their current tier and active subscription info
 */
export const listSellersAdmin = query({
  args: {
    tier: adminSellerTierValidator,
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    sellers: v.array(v.object({
      _id: v.id('sellers'),
      shopName: v.string(),
      slug: v.string(),
      tier: v.optional(v.union(
        v.literal('basic'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('premium')
      )),
      verificationStatus: v.union(
        v.literal('pending'),
        v.literal('verified'),
        v.literal('rejected')
      ),
      isActive: v.boolean(),
      createdAt: v.number(),
      activeSub: v.optional(v.object({
        _id: v.id('seller_subscriptions'),
        tier: v.union(v.literal('starter'), v.literal('growth'), v.literal('premium')),
        status: v.union(
          v.literal('pending'),
          v.literal('active'),
          v.literal('expired'),
          v.literal('cancelled'),
          v.literal('failed')
        ),
        periodEnd: v.optional(v.number()),
        amountKes: v.number(),
        createdAt: v.number(),
      })),
    })),
    hasMore: v.boolean(),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx: QueryCtx, args: { tier?: 'basic' | 'starter' | 'growth' | 'premium'; limit?: number; cursor?: string }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let allSellers: Doc<'sellers'>[];
    if (args.tier) {
      allSellers = await ctx.db
        .query('sellers')
        .withIndex('by_tier', (q) => q.eq('tier', args.tier))
        .order('desc')
        .collect();
    } else {
      allSellers = await ctx.db.query('sellers').order('desc').collect();
    }

    // Handle cursor
    let startIndex = 0;
    if (args.cursor) {
      const idx = allSellers.findIndex((s) => s._id === args.cursor);
      if (idx !== -1) startIndex = idx + 1;
    }

    const page = allSellers.slice(startIndex, startIndex + limit + 1);
    const hasMore = page.length > limit;
    const result = page.slice(0, limit);

    const enriched = await Promise.all(result.map(async (seller) => {
      const activeSub = await ctx.db
        .query('seller_subscriptions')
        .withIndex('by_seller_and_status', (q) => q.eq('sellerId', seller._id).eq('status', 'active'))
        .order('desc')
        .first();

      return {
        _id: seller._id,
        shopName: seller.shopName,
        slug: seller.slug,
        tier: seller.tier,
        verificationStatus: seller.verificationStatus,
        isActive: seller.isActive,
        createdAt: seller.createdAt,
        activeSub: activeSub ? {
          _id: activeSub._id,
          tier: activeSub.tier,
          status: activeSub.status,
          periodEnd: activeSub.periodEnd,
          amountKes: activeSub.amountKes,
          createdAt: activeSub.createdAt,
        } : undefined,
      };
    }));

    return {
      sellers: enriched,
      hasMore,
      nextCursor: hasMore && result.length > 0 ? result[result.length - 1]._id : null,
    };
  },
});

/**
 * Admin: subscription stats overview
 */
export const getSubscriptionStats = query({
  args: {},
  returns: v.object({
    activeByTier: v.object({
      starter: v.number(),
      growth: v.number(),
      premium: v.number(),
    }),
    mrrKes: v.number(),
    expiringIn7Days: v.number(),
    failedLast30Days: v.number(),
    totalSellers: v.number(),
  }),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const activeSubs = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    const activeByTier = { starter: 0, growth: 0, premium: 0 };
    let mrrKes = 0;
    let expiringIn7Days = 0;

    for (const sub of activeSubs) {
      activeByTier[sub.tier]++;
      mrrKes += sub.amountKes;
      if (sub.periodEnd && sub.periodEnd <= sevenDaysFromNow) {
        expiringIn7Days++;
      }
    }

    const failedSubs = await ctx.db
      .query('seller_subscriptions')
      .withIndex('by_status', (q) => q.eq('status', 'failed'))
      .collect();
    const failedLast30Days = failedSubs.filter((s) => s.createdAt >= thirtyDaysAgo).length;

    const totalSellers = (await ctx.db.query('sellers').collect()).length;

    return {
      activeByTier,
      mrrKes,
      expiringIn7Days,
      failedLast30Days,
      totalSellers,
    };
  },
});

/**
 * Admin: get all subscriptions for a specific seller
 */
const tierConfigValidator = v.object({
  _id: v.id('tier_config'),
  _creationTime: v.number(),
  tier: v.union(v.literal('basic'), v.literal('starter'), v.literal('growth'), v.literal('premium')),
  maxProducts: v.union(v.number(), v.null()),
  revenueChartDays: v.number(),
  orderHistoryDays: v.union(v.number(), v.null()),
  topProductsLimit: v.union(v.number(), v.null()),
  showEngagementCounts: v.boolean(),
  showCartCounts: v.boolean(),
  priceKes: v.number(),
  updatedAt: v.number(),
});

export const getTierConfigs = query({
  args: {},
  returns: v.array(tierConfigValidator),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    return ctx.db.query('tier_config').collect();
  },
});

export const getSellerSubscriptionsAdmin = query({
  args: { sellerId: v.id('sellers') },
  returns: v.array(v.object({
    _id: v.id('seller_subscriptions'),
    _creationTime: v.number(),
    sellerId: v.id('sellers'),
    tier: v.union(v.literal('starter'), v.literal('growth'), v.literal('premium')),
    status: v.union(
      v.literal('pending'),
      v.literal('active'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed')
    ),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    amountKes: v.number(),
    phoneNumber: v.string(),
    merchantTransactionId: v.string(),
    fingoTransactionId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })),
  handler: async (ctx: QueryCtx, args: { sellerId: Id<'sellers'> }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    return ctx.db
      .query('seller_subscriptions')
      .withIndex('by_seller', (q) => q.eq('sellerId', args.sellerId))
      .order('desc')
      .collect();
  },
});

/**
 * Admin: recent subscription events across all sellers (last 50), enriched with shop name.
 * Used in the admin billing page events feed.
 */
export const getRecentSubscriptionEvents = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id('seller_subscriptions'),
    sellerId: v.id('sellers'),
    shopName: v.string(),
    tier: v.union(v.literal('starter'), v.literal('growth'), v.literal('premium')),
    status: v.union(
      v.literal('pending'),
      v.literal('active'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed')
    ),
    amountKes: v.number(),
    periodEnd: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx: QueryCtx): Promise<Array<{
    _id: Id<'seller_subscriptions'>;
    sellerId: Id<'sellers'>;
    shopName: string;
    tier: 'starter' | 'growth' | 'premium';
    status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
    amountKes: number;
    periodEnd?: number;
    failureReason?: string;
    createdAt: number;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user || user.role !== 'admin') throw new Error('Not authorized');

    // Get last 50 subscription events by creation time
    const events = await ctx.db
      .query('seller_subscriptions')
      .order('desc')
      .take(50);

    const enriched = await Promise.all(
      events.map(async (ev) => {
        const seller = await ctx.db.get(ev.sellerId);
        return {
          _id: ev._id,
          sellerId: ev.sellerId,
          shopName: seller?.shopName ?? 'Unknown Shop',
          tier: ev.tier,
          status: ev.status,
          amountKes: ev.amountKes,
          periodEnd: ev.periodEnd,
          failureReason: ev.failureReason,
          createdAt: ev.createdAt,
        };
      })
    );

    return enriched;
  },
});

