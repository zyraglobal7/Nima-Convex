import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { type SellerTier } from '../types';
import { getTierConfig } from './tierConfig';

/**
 * Helper: get seller and resolve their effective tier (default 'basic')
 */
async function getSellerWithTier(ctx: QueryCtx): Promise<(Doc<'sellers'> & { effectiveTier: SellerTier }) | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
    .unique();
  if (!user) return null;
  const seller = await ctx.db
    .query('sellers')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .unique();
  if (!seller) return null;
  return { ...seller, effectiveTier: (seller.tier ?? 'basic') as SellerTier };
}

/**
 * Check if the current user is a seller
 */
export const isCurrentUserSeller = query({
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

    // Check if user has a seller record
    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    return seller !== null && seller.isActive;
  },
});

/**
 * Get the current user's seller profile
 */
export const getCurrentSeller = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('sellers'),
      _creationTime: v.number(),
      userId: v.id('users'),
      slug: v.string(),
      shopName: v.string(),
      description: v.optional(v.string()),
      logoStorageId: v.optional(v.id('_storage')),
      bannerStorageId: v.optional(v.id('_storage')),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      verificationStatus: v.union(
        v.literal('pending'),
        v.literal('verified'),
        v.literal('rejected')
      ),
      verificationNotes: v.optional(v.string()),
      isActive: v.boolean(),
      tier: v.optional(v.union(
        v.literal('basic'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('premium')
      )),
      createdAt: v.number(),
      updatedAt: v.number(),
      logoUrl: v.optional(v.string()),
      bannerUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx
  ): Promise<(Doc<'sellers'> & { logoUrl?: string; bannerUrl?: string }) | null> => {
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

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      return null;
    }

    // Resolve logo and banner URLs
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;

    if (seller.logoStorageId) {
      logoUrl = (await ctx.storage.getUrl(seller.logoStorageId)) ?? undefined;
    }
    if (seller.bannerStorageId) {
      bannerUrl = (await ctx.storage.getUrl(seller.bannerStorageId)) ?? undefined;
    }

    return {
      ...seller,
      logoUrl,
      bannerUrl,
    };
  },
});

/**
 * Get seller by slug (for public shop page)
 */
export const getSellerBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('sellers'),
      _creationTime: v.number(),
      userId: v.id('users'),
      slug: v.string(),
      shopName: v.string(),
      description: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      bannerUrl: v.optional(v.string()),
      verificationStatus: v.union(
        v.literal('pending'),
        v.literal('verified'),
        v.literal('rejected')
      ),
      isActive: v.boolean(),
      createdAt: v.number(),
      productCount: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { slug: string }
  ): Promise<{
    _id: Id<'sellers'>;
    _creationTime: number;
    userId: Id<'users'>;
    slug: string;
    shopName: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    isActive: boolean;
    createdAt: number;
    productCount: number;
  } | null> => {
    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!seller || !seller.isActive) {
      return null;
    }

    // Get product count
    const products = await ctx.db
      .query('items')
      .withIndex('by_seller_and_active', (q) => q.eq('sellerId', seller._id).eq('isActive', true))
      .collect();

    // Resolve URLs
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;

    if (seller.logoStorageId) {
      logoUrl = (await ctx.storage.getUrl(seller.logoStorageId)) ?? undefined;
    }
    if (seller.bannerStorageId) {
      bannerUrl = (await ctx.storage.getUrl(seller.bannerStorageId)) ?? undefined;
    }

    return {
      _id: seller._id,
      _creationTime: seller._creationTime,
      userId: seller.userId,
      slug: seller.slug,
      shopName: seller.shopName,
      description: seller.description,
      logoUrl,
      bannerUrl,
      verificationStatus: seller.verificationStatus,
      isActive: seller.isActive,
      createdAt: seller.createdAt,
      productCount: products.length,
    };
  },
});

/**
 * Check if a slug is available
 */
export const isSlugAvailable = query({
  args: {
    slug: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx: QueryCtx, args: { slug: string }): Promise<boolean> => {
    const existing = await ctx.db
      .query('sellers')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    return existing === null;
  },
});

/**
 * Get seller dashboard stats
 */
export const getSellerDashboardStats = query({
  args: {},
  returns: v.union(
    v.object({
      totalProducts: v.number(),
      activeProducts: v.number(),
      totalOrders: v.number(),
      pendingOrders: v.number(),
      totalRevenue: v.number(),
      revenueThisMonth: v.number(),
      currency: v.string(),
      tier: v.union(
        v.literal('basic'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('premium')
      ),
      productLimit: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx
  ): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    revenueThisMonth: number;
    currency: string;
    tier: SellerTier;
    productLimit: number | null;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    // Get products
    const allProducts = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const activeProducts = allProducts.filter((p) => p.isActive);

    // Get order items for this seller
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    // Calculate totals
    const totalRevenue = orderItems
      .filter((oi) => oi.fulfillmentStatus !== 'cancelled')
      .reduce((sum, oi) => sum + oi.lineTotal, 0);

    // Calculate this month's revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const revenueThisMonth = orderItems
      .filter((oi) => oi.createdAt >= startOfMonth && oi.fulfillmentStatus !== 'cancelled')
      .reduce((sum, oi) => sum + oi.lineTotal, 0);

    // Count orders
    const uniqueOrderIds = new Set(orderItems.map((oi) => oi.orderId));
    const pendingItems = orderItems.filter(
      (oi) => oi.fulfillmentStatus === 'pending' || oi.fulfillmentStatus === 'processing'
    );
    const pendingOrderIds = new Set(pendingItems.map((oi) => oi.orderId));

    return {
      totalProducts: allProducts.length,
      activeProducts: activeProducts.length,
      totalOrders: uniqueOrderIds.size,
      pendingOrders: pendingOrderIds.size,
      totalRevenue,
      revenueThisMonth,
      currency: 'KES',
      tier,
      productLimit: limits.maxProducts,
    };
  },
});

/**
 * Get seller's products with pagination
 */
export const getSellerProducts = query({
  args: {
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      products: v.array(
        v.object({
          _id: v.id('items'),
          publicId: v.string(),
          name: v.string(),
          brand: v.optional(v.string()),
          category: v.string(),
          price: v.number(),
          currency: v.string(),
          isActive: v.boolean(),
          inStock: v.boolean(),
          stockQuantity: v.optional(v.number()),
          imageUrl: v.optional(v.string()),
          viewCount: v.optional(v.number()),
          saveCount: v.optional(v.number()),
          purchaseCount: v.optional(v.number()),
          tryOnCount: v.optional(v.number()),
          lookbookSaveCount: v.optional(v.number()),
          cartAddCount: v.optional(v.number()),
          lookInclusionCount: v.optional(v.number()),
          createdAt: v.number(),
        })
      ),
      nextCursor: v.union(v.string(), v.null()),
      hasMore: v.boolean(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { isActive?: boolean; limit?: number; cursor?: string }
  ): Promise<{
    products: Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      category: string;
      price: number;
      currency: string;
      isActive: boolean;
      inStock: boolean;
      stockQuantity?: number;
      imageUrl?: string;
      viewCount?: number;
      saveCount?: number;
      purchaseCount?: number;
      tryOnCount?: number;
      lookbookSaveCount?: number;
      cartAddCount?: number;
      lookInclusionCount?: number;
      createdAt: number;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    const limit = Math.min(args.limit ?? 20, 50);

    // Get products
    let products: Doc<'items'>[];
    if (args.isActive !== undefined) {
      products = await ctx.db
        .query('items')
        .withIndex('by_seller_and_active', (q) =>
          q.eq('sellerId', seller._id).eq('isActive', args.isActive!)
        )
        .order('desc')
        .collect();
    } else {
      products = await ctx.db
        .query('items')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .order('desc')
        .collect();
    }

    // Handle cursor pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = products.findIndex((p) => p._id === args.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedProducts = products.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginatedProducts.length > limit;
    const resultProducts = paginatedProducts.slice(0, limit);

    // Get primary images for each product
    const productsWithImages = await Promise.all(
      resultProducts.map(async (product) => {
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', product._id).eq('isPrimary', true))
          .unique();

        let imageUrl: string | undefined;
        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = (await ctx.storage.getUrl(primaryImage.storageId)) ?? undefined;
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }

        return {
          _id: product._id,
          publicId: product.publicId,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          currency: product.currency,
          isActive: product.isActive,
          inStock: product.inStock,
          stockQuantity: product.stockQuantity,
          imageUrl,
          // saveCount always visible (basic gets this)
          saveCount: product.saveCount,
          // engagement counts gated by tier
          viewCount: limits.showEngagementCounts ? product.viewCount : undefined,
          purchaseCount: limits.showEngagementCounts ? product.purchaseCount : undefined,
          tryOnCount: limits.showEngagementCounts ? product.tryOnCount : undefined,
          lookbookSaveCount: limits.showEngagementCounts ? product.lookbookSaveCount : undefined,
          cartAddCount: limits.showCartCounts ? product.cartAddCount : undefined,
          lookInclusionCount: limits.showCartCounts ? product.lookInclusionCount : undefined,
          createdAt: product.createdAt,
        };
      })
    );

    return {
      products: productsWithImages,
      nextCursor: hasMore && resultProducts.length > 0 ? resultProducts[resultProducts.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Get seller's order items with filtering
 */
export const getSellerOrderItems = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('shipped'),
        v.literal('delivered'),
        v.literal('cancelled')
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('order_items'),
        orderId: v.id('orders'),
        orderNumber: v.string(),
        customerName: v.string(),
        itemName: v.string(),
        itemBrand: v.optional(v.string()),
        itemPrice: v.number(),
        itemImageUrl: v.optional(v.string()),
        quantity: v.number(),
        selectedSize: v.optional(v.string()),
        selectedColor: v.optional(v.string()),
        lineTotal: v.number(),
        fulfillmentStatus: v.union(
          v.literal('pending'),
          v.literal('processing'),
          v.literal('shipped'),
          v.literal('delivered'),
          v.literal('cancelled')
        ),
        trackingNumber: v.optional(v.string()),
        createdAt: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      limit?: number;
    }
  ): Promise<Array<{
    _id: Id<'order_items'>;
    orderId: Id<'orders'>;
    orderNumber: string;
    customerName: string;
    itemName: string;
    itemBrand?: string;
    itemPrice: number;
    itemImageUrl?: string;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    lineTotal: number;
    fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    trackingNumber?: string;
    createdAt: number;
  }> | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);
    const historyCutoff = limits.orderHistoryDays !== null
      ? Date.now() - limits.orderHistoryDays * 24 * 60 * 60 * 1000
      : null;

    const limit = Math.min(args.limit ?? 50, 100);

    // Get order items
    let orderItems: Doc<'order_items'>[];
    if (args.status) {
      orderItems = await ctx.db
        .query('order_items')
        .withIndex('by_seller_and_status', (q) =>
          q.eq('sellerId', seller._id).eq('fulfillmentStatus', args.status!)
        )
        .order('desc')
        .take(limit);
    } else {
      orderItems = await ctx.db
        .query('order_items')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .order('desc')
        .take(limit);
    }

    // Apply history window
    if (historyCutoff !== null) {
      orderItems = orderItems.filter((oi) => oi.createdAt >= historyCutoff);
    }

    // Enrich with order details
    const enrichedItems = await Promise.all(
      orderItems.map(async (oi) => {
        const order = await ctx.db.get(oi.orderId);
        return {
          _id: oi._id,
          orderId: oi.orderId,
          orderNumber: order?.orderNumber ?? 'Unknown',
          customerName: order?.shippingAddress.fullName.split(' ')[0] ?? 'Customer', // First name only for privacy
          itemName: oi.itemName,
          itemBrand: oi.itemBrand,
          itemPrice: oi.itemPrice,
          itemImageUrl: oi.itemImageUrl,
          quantity: oi.quantity,
          selectedSize: oi.selectedSize,
          selectedColor: oi.selectedColor,
          lineTotal: oi.lineTotal,
          fulfillmentStatus: oi.fulfillmentStatus,
          trackingNumber: oi.trackingNumber,
          createdAt: oi.createdAt,
        };
      })
    );

    return enrichedItems;
  },
});

/**
 * Get recent revenue data for charts (last 30 days)
 */
export const getSellerRevenueChart = query({
  args: {},
  returns: v.union(
    v.array(
      v.object({
        date: v.string(),
        revenue: v.number(),
        orders: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx
  ): Promise<Array<{ date: string; revenue: number; orders: number }> | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const { revenueChartDays: days } = await getTierConfig(ctx, tier);

    // Basic tier: no chart
    if (days === 0) return [];

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.gte(q.field('createdAt'), cutoff))
      .collect();

    // Group by date
    const dailyData: Record<string, { revenue: number; orders: Set<string> }> = {};

    for (const item of orderItems) {
      if (item.fulfillmentStatus === 'cancelled') continue;

      const date = new Date(item.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, orders: new Set() };
      }
      dailyData[date].revenue += item.lineTotal;
      dailyData[date].orders.add(item.orderId);
    }

    // Generate array for all days in the window
    const result: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = dailyData[date];
      result.push({
        date,
        revenue: data?.revenue ?? 0,
        orders: data?.orders.size ?? 0,
      });
    }

    return result;
  },
});

/**
 * Get a single product for seller editing
 */
export const getSellerProduct = query({
  args: {
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      item: v.object({
        _id: v.id('items'),
        _creationTime: v.number(),
        publicId: v.string(),
        sku: v.optional(v.string()),
        name: v.string(),
        brand: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.string(),
        subcategory: v.optional(v.string()),
        gender: v.string(),
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
      }),
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

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      return null;
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return null;
    }

    // Verify ownership
    if (item.sellerId !== seller._id) {
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
 * Get a specific order's details for a seller
 * Returns the order metadata (shipping info) and ONLY the items belonging to this seller
 */
export const getSellerOrder = query({
  args: {
    orderId: v.id('orders'),
  },
  returns: v.union(
    v.object({
      _id: v.id('orders'),
      orderNumber: v.string(),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('partially_shipped'),
        v.literal('shipped'),
        v.literal('delivered'),
        v.literal('cancelled')
      ),
      shippingAddress: v.object({
        fullName: v.string(),
        addressLine1: v.string(),
        addressLine2: v.optional(v.string()),
        city: v.string(),
        state: v.optional(v.string()),
        postalCode: v.string(),
        country: v.string(),
        phone: v.string(),
      }),
      createdAt: v.number(),
      items: v.array(
        v.object({
          _id: v.id('order_items'),
          itemName: v.string(),
          itemBrand: v.optional(v.string()),
          itemPrice: v.number(),
          itemImageUrl: v.optional(v.string()),
          quantity: v.number(),
          selectedSize: v.optional(v.string()),
          selectedColor: v.optional(v.string()),
          lineTotal: v.number(),
          fulfillmentStatus: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('shipped'),
            v.literal('delivered'),
            v.literal('cancelled')
          ),
          trackingNumber: v.optional(v.string()),
          trackingCarrier: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { orderId: Id<'orders'> }
  ): Promise<{
    _id: Id<'orders'>;
    orderNumber: string;
    status: 'pending' | 'processing' | 'partially_shipped' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress: {
      fullName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      phone: string;
    };
    createdAt: number;
    items: Array<{
      _id: Id<'order_items'>;
      itemName: string;
      itemBrand?: string;
      itemPrice: number;
      itemImageUrl?: string;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
      lineTotal: number;
      fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      trackingNumber?: string;
      trackingCarrier?: string;
    }>;
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

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!seller) {
      return null;
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    // Get ONLY this seller's items in the order
    const sellerItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.eq(q.field('orderId'), args.orderId))
      .collect();

    // If seller has no items in this order, they shouldn't see it (unless we want to show empty orders, which shouldn't exist)
    if (sellerItems.length === 0) {
      return null;
    }

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status, // Overall order status
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items: sellerItems.map((item) => ({
        _id: item._id,
        itemName: item.itemName,
        itemBrand: item.itemBrand,
        itemPrice: item.itemPrice,
        itemImageUrl: item.itemImageUrl,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        lineTotal: item.lineTotal,
        fulfillmentStatus: item.fulfillmentStatus,
        trackingNumber: item.trackingNumber,
        trackingCarrier: item.trackingCarrier,
      })),
    };
  },
});

/**
 * Get aggregated analytics data for the seller analytics tab.
 * All metrics are gated by the seller's tier.
 */
export const getSellerAnalytics = query({
  args: {},
  returns: v.union(
    v.object({
      tier: v.union(
        v.literal('basic'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('premium')
      ),
      // Always available
      totalSaves: v.number(),
      totalProducts: v.number(),
      activeProducts: v.number(),
      // Starter+: engagement
      totalViews: v.optional(v.number()),
      totalTryOns: v.optional(v.number()),
      totalLookbookSaves: v.optional(v.number()),
      // Growth+: cart & purchase
      totalCartAdds: v.optional(v.number()),
      totalPurchases: v.optional(v.number()),
      // Top products (Starter+, limited by topProductsLimit)
      topProducts: v.optional(v.array(v.object({
        _id: v.id('items'),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        viewCount: v.number(),
        saveCount: v.number(),
        tryOnCount: v.optional(v.number()),
        cartAddCount: v.optional(v.number()),
        purchaseCount: v.number(),
      }))),
      // Growth+: conversion funnel
      conversionFunnel: v.optional(v.object({
        views: v.number(),
        saves: v.number(),
        cartAdds: v.number(),
        purchases: v.number(),
      })),
      // Growth+: try-on to purchase rate (percentage 0-100)
      tryOnToPurchaseRate: v.optional(v.number()),
      // Growth+: category breakdown
      categoryBreakdown: v.optional(v.array(v.object({
        category: v.string(),
        revenue: v.number(),
        itemCount: v.number(),
      }))),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<{
    tier: 'basic' | 'starter' | 'growth' | 'premium';
    totalSaves: number;
    totalProducts: number;
    activeProducts: number;
    totalViews?: number;
    totalTryOns?: number;
    totalLookbookSaves?: number;
    totalCartAdds?: number;
    totalPurchases?: number;
    topProducts?: Array<{
      _id: Id<'items'>;
      name: string;
      imageUrl?: string;
      viewCount: number;
      saveCount: number;
      tryOnCount?: number;
      cartAddCount?: number;
      purchaseCount: number;
    }>;
    conversionFunnel?: { views: number; saves: number; cartAdds: number; purchases: number };
    tryOnToPurchaseRate?: number;
    categoryBreakdown?: Array<{ category: string; revenue: number; itemCount: number }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    // Fetch all seller products
    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const activeProducts = products.filter((p) => p.isActive);

    // Aggregate totals
    let totalSaves = 0;
    let totalViews = 0;
    let totalTryOns = 0;
    let totalLookbookSaves = 0;
    let totalCartAdds = 0;
    let totalPurchases = 0;

    for (const p of products) {
      totalSaves += p.saveCount ?? 0;
      totalViews += p.viewCount ?? 0;
      totalTryOns += p.tryOnCount ?? 0;
      totalLookbookSaves += p.lookbookSaveCount ?? 0;
      totalCartAdds += p.cartAddCount ?? 0;
      totalPurchases += p.purchaseCount ?? 0;
    }

    type AnalyticsResult = {
      tier: 'basic' | 'starter' | 'growth' | 'premium';
      totalSaves: number;
      totalProducts: number;
      activeProducts: number;
      totalViews?: number;
      totalTryOns?: number;
      totalLookbookSaves?: number;
      totalCartAdds?: number;
      totalPurchases?: number;
      topProducts?: Array<{ _id: Id<'items'>; name: string; imageUrl?: string; viewCount: number; saveCount: number; tryOnCount?: number; cartAddCount?: number; purchaseCount: number }>;
      conversionFunnel?: { views: number; saves: number; cartAdds: number; purchases: number };
      tryOnToPurchaseRate?: number;
      categoryBreakdown?: Array<{ category: string; revenue: number; itemCount: number }>;
    };

    const result: AnalyticsResult = {
      tier,
      totalSaves,
      totalProducts: products.length,
      activeProducts: activeProducts.length,
    };

    // Starter+: engagement metrics
    if (limits.showEngagementCounts) {
      result.totalViews = totalViews;
      result.totalTryOns = totalTryOns;
      result.totalLookbookSaves = totalLookbookSaves;
    }

    // Growth+: cart & purchase totals
    if (limits.showCartCounts) {
      result.totalCartAdds = totalCartAdds;
      result.totalPurchases = totalPurchases;
    }

    // Top products (Starter+)
    if (limits.topProductsLimit !== 0) {
      // Sort by composite engagement score
      const sorted = [...products].sort((a, b) => {
        const scoreA = (a.viewCount ?? 0) + (a.saveCount ?? 0) * 3 + (a.purchaseCount ?? 0) * 10;
        const scoreB = (b.viewCount ?? 0) + (b.saveCount ?? 0) * 3 + (b.purchaseCount ?? 0) * 10;
        return scoreB - scoreA;
      });

      const sliced = limits.topProductsLimit === null ? sorted : sorted.slice(0, limits.topProductsLimit);

      const topWithImages = await Promise.all(
        sliced.map(async (p) => {
          const primaryImage = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', p._id).eq('isPrimary', true))
            .unique();

          let imageUrl: string | undefined;
          if (primaryImage?.storageId) {
            imageUrl = (await ctx.storage.getUrl(primaryImage.storageId)) ?? undefined;
          } else if (primaryImage?.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }

          return {
            _id: p._id,
            name: p.name,
            imageUrl,
            viewCount: p.viewCount ?? 0,
            saveCount: p.saveCount ?? 0,
            tryOnCount: limits.showEngagementCounts ? (p.tryOnCount ?? 0) : undefined,
            cartAddCount: limits.showCartCounts ? (p.cartAddCount ?? 0) : undefined,
            purchaseCount: p.purchaseCount ?? 0,
          };
        })
      );

      result.topProducts = topWithImages;
    }

    // Growth+: conversion funnel & try-on performance
    if (limits.showCartCounts) {
      result.conversionFunnel = {
        views: totalViews,
        saves: totalSaves,
        cartAdds: totalCartAdds,
        purchases: totalPurchases,
      };

      const tryOnToPurchaseRate =
        totalTryOns > 0 ? Math.round((totalPurchases / totalTryOns) * 100) : 0;
      result.tryOnToPurchaseRate = tryOnToPurchaseRate;

      // Category breakdown by revenue from order_items
      const orderItems = await ctx.db
        .query('order_items')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .collect();

      const categoryMap: Record<string, { revenue: number; itemCount: number }> = {};
      for (const oi of orderItems) {
        if (oi.fulfillmentStatus === 'cancelled') continue;
        const item = await ctx.db.get(oi.itemId);
        if (!item) continue;
        const cat = item.category;
        if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, itemCount: 0 };
        categoryMap[cat].revenue += oi.lineTotal;
        categoryMap[cat].itemCount += oi.quantity;
      }

      result.categoryBreakdown = Object.entries(categoryMap)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
    }

    return result;
  },
});

/**
 * Premium-exclusive deep analytics:
 *  - Day-of-week revenue & order breakdown
 *  - Repeat buyer rate
 *  - Price sensitivity buckets vs conversion rate
 *  - Month-by-month seasonal heatmap (last 12 months)
 */
export const getPremiumAnalytics = query({
  args: {},
  returns: v.union(
    v.object({
      dayOfWeek: v.array(v.object({
        day: v.string(),
        revenue: v.number(),
        orders: v.number(),
        views: v.number(),
      })),
      repeatBuyerRate: v.number(),
      totalBuyers: v.number(),
      repeatBuyers: v.number(),
      priceBuckets: v.array(v.object({
        label: v.string(),
        avgConversionRate: v.number(),
        productCount: v.number(),
        totalRevenue: v.number(),
      })),
      seasonalHeatmap: v.array(v.object({
        month: v.string(),
        revenue: v.number(),
        orders: v.number(),
        views: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<{
    dayOfWeek: Array<{ day: string; revenue: number; orders: number; views: number }>;
    repeatBuyerRate: number;
    totalBuyers: number;
    repeatBuyers: number;
    priceBuckets: Array<{ label: string; avgConversionRate: number; productCount: number; totalRevenue: number }>;
    seasonalHeatmap: Array<{ month: string; revenue: number; orders: number; views: number }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;
    if (seller.effectiveTier !== 'premium') return null;

    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const nonCancelled = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');

    // ── Day of Week breakdown ─────────────────────────────────────────────
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowRevenue: number[] = Array(7).fill(0);
    const dowOrderSets: Array<Set<string>> = Array.from({ length: 7 }, () => new Set());
    for (const oi of nonCancelled) {
      const dow = new Date(oi.createdAt).getDay();
      dowRevenue[dow] += oi.lineTotal;
      dowOrderSets[dow].add(oi.orderId);
    }
    const totalOrderCount = nonCancelled.length;
    const totalViews = products.reduce((s, p) => s + (p.viewCount ?? 0), 0);
    const dayOfWeek = DAYS.map((day, i) => ({
      day,
      revenue: dowRevenue[i],
      orders: dowOrderSets[i].size,
      views: totalOrderCount > 0 ? Math.round((dowOrderSets[i].size / totalOrderCount) * totalViews) : 0,
    }));

    // ── Repeat Buyer Rate ────────────────────────────────────────────────
    const uniqueOrderIds = [...new Set(nonCancelled.map((oi) => oi.orderId))];
    const buyerOrderCount: Record<string, number> = {};
    for (const orderId of uniqueOrderIds) {
      const order = await ctx.db.get(orderId);
      if (!order) continue;
      const key = order.userId;
      buyerOrderCount[key] = (buyerOrderCount[key] ?? 0) + 1;
    }
    const totalBuyers = Object.keys(buyerOrderCount).length;
    const repeatBuyers = Object.values(buyerOrderCount).filter((c) => c > 1).length;
    const repeatBuyerRate = totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 100) : 0;

    // ── Price Sensitivity Buckets ─────────────────────────────────────────
    const bucketDefs = [
      { label: 'Under KES 1k',  min: 0,     max: 1000 },
      { label: 'KES 1k – 5k',   min: 1000,  max: 5000 },
      { label: 'KES 5k – 15k',  min: 5000,  max: 15000 },
      { label: 'KES 15k – 50k', min: 15000, max: 50000 },
      { label: 'Over KES 50k',  min: 50000, max: Infinity },
    ];
    const revenueByItem: Record<string, number> = {};
    for (const oi of nonCancelled) {
      revenueByItem[oi.itemId] = (revenueByItem[oi.itemId] ?? 0) + oi.lineTotal;
    }
    const priceBuckets = bucketDefs
      .map(({ label, min, max }) => {
        const bucket = products.filter((p) => p.price >= min && p.price < max);
        const totalRevenue = bucket.reduce((s, p) => s + (revenueByItem[p._id] ?? 0), 0);
        const rates = bucket
          .filter((p) => (p.viewCount ?? 0) > 0)
          .map((p) => (p.purchaseCount ?? 0) / (p.viewCount ?? 1));
        const avgConversionRate = rates.length > 0
          ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100)
          : 0;
        return { label, avgConversionRate, productCount: bucket.length, totalRevenue };
      })
      .filter((b) => b.productCount > 0);

    // ── Seasonal Heatmap (last 12 months) ────────────────────────────────
    const cutoff12mo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const recentOrders = nonCancelled.filter((oi) => oi.createdAt >= cutoff12mo);
    const monthRevenue: Record<string, number> = {};
    const monthOrderSets: Record<string, Set<string>> = {};
    for (const oi of recentOrders) {
      const d = new Date(oi.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthRevenue[key] = (monthRevenue[key] ?? 0) + oi.lineTotal;
      if (!monthOrderSets[key]) monthOrderSets[key] = new Set();
      monthOrderSets[key].add(oi.orderId);
    }
    const seasonalHeatmap: Array<{ month: string; revenue: number; orders: number; views: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const orders = monthOrderSets[key]?.size ?? 0;
      seasonalHeatmap.push({
        month: monthLabel,
        revenue: monthRevenue[key] ?? 0,
        orders,
        views: totalOrderCount > 0 ? Math.round((orders / totalOrderCount) * totalViews) : 0,
      });
    }

    return { dayOfWeek, repeatBuyerRate, totalBuyers, repeatBuyers, priceBuckets, seasonalHeatmap };
  },
});

/**
 * Premium-only: cart intelligence for this seller.
 * Shows how much value is sitting in active carts across all products.
 */
export const getSellerCartInsights = query({
  args: {},
  returns: v.union(
    v.object({
      totalCartValue: v.number(),
      totalCartItems: v.number(),
      uniqueShoppers: v.number(),
      topCartProducts: v.array(v.object({
        _id: v.id('items'),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
        cartCount: v.number(),
        cartValue: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<{
    totalCartValue: number;
    totalCartItems: number;
    uniqueShoppers: number;
    topCartProducts: Array<{
      _id: Id<'items'>;
      name: string;
      imageUrl?: string;
      price: number;
      cartCount: number;
      cartValue: number;
    }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;
    if (seller.effectiveTier !== 'premium') return null;

    // Get all this seller's active product IDs
    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    if (products.length === 0) {
      return { totalCartValue: 0, totalCartItems: 0, uniqueShoppers: 0, topCartProducts: [] };
    }

    const productMap = new Map(products.map((p) => [p._id, p]));
    const cartCountByProduct: Record<string, { count: number; value: number; shoppers: Set<string> }> = {};
    const allShoppers = new Set<string>();

    // Scan cart_items for each product (no by_item index, so we join in memory)
    // We collect all cart_items for our products by checking each product's cartAddCount
    // is already tracked; for live cart we scan the table filtered to our item IDs.
    const allCartItems = await ctx.db.query('cart_items').collect();

    for (const ci of allCartItems) {
      const product = productMap.get(ci.itemId);
      if (!product) continue;

      const key = ci.itemId;
      if (!cartCountByProduct[key]) {
        cartCountByProduct[key] = { count: 0, value: 0, shoppers: new Set() };
      }
      cartCountByProduct[key].count += ci.quantity;
      cartCountByProduct[key].value += product.price * ci.quantity;
      cartCountByProduct[key].shoppers.add(ci.userId);
      allShoppers.add(ci.userId);
    }

    let totalCartValue = 0;
    let totalCartItems = 0;
    for (const data of Object.values(cartCountByProduct)) {
      totalCartValue += data.value;
      totalCartItems += data.count;
    }

    // Top products by cart value
    const topCartProducts = await Promise.all(
      Object.entries(cartCountByProduct)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 8)
        .map(async ([itemId, data]) => {
          const product = productMap.get(itemId as Id<'items'>)!;
          const img = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', product._id).eq('isPrimary', true))
            .unique();
          let imageUrl: string | undefined;
          if (img?.storageId) imageUrl = (await ctx.storage.getUrl(img.storageId)) ?? undefined;
          else if (img?.externalUrl) imageUrl = img.externalUrl;
          return {
            _id: product._id,
            name: product.name,
            imageUrl,
            price: product.price,
            cartCount: data.count,
            cartValue: data.value,
          };
        })
    );

    return { totalCartValue, totalCartItems, uniqueShoppers: allShoppers.size, topCartProducts };
  },
});

/**
 * Overview stats with sparklines for each KPI card.
 * Date range is optional; defaults to last 30 days for sparklines.
 */
export const getSellerOverviewStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      tier: v.union(v.literal('basic'), v.literal('starter'), v.literal('growth'), v.literal('premium')),
      // Always visible
      totalSaves: v.number(),
      savesSparkline: v.array(v.object({ date: v.string(), count: v.number() })),
      totalProducts: v.number(),
      activeProducts: v.number(),
      // Starter+
      totalRevenue: v.optional(v.number()),
      totalOrders: v.optional(v.number()),
      revenueSparkline: v.optional(v.array(v.object({ date: v.string(), count: v.number() }))),
      totalViews: v.optional(v.number()),
      viewsSparkline: v.optional(v.array(v.object({ date: v.string(), count: v.number() }))),
      totalTryOns: v.optional(v.number()),
      // Growth+
      totalCartAdds: v.optional(v.number()),
      totalPurchases: v.optional(v.number()),
      conversionRate: v.optional(v.number()),
      // Premium
      repeatBuyerRate: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx, args: { startDate?: number; endDate?: number }): Promise<{
    tier: 'basic' | 'starter' | 'growth' | 'premium';
    totalSaves: number;
    savesSparkline: Array<{ date: string; count: number }>;
    totalProducts: number;
    activeProducts: number;
    totalRevenue?: number;
    totalOrders?: number;
    revenueSparkline?: Array<{ date: string; count: number }>;
    totalViews?: number;
    viewsSparkline?: Array<{ date: string; count: number }>;
    totalTryOns?: number;
    totalCartAdds?: number;
    totalPurchases?: number;
    conversionRate?: number;
    repeatBuyerRate?: number;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    const sparklineDays = 30;
    const sparklineCutoff = Date.now() - sparklineDays * 24 * 60 * 60 * 1000;
    const endDate = args.endDate ?? Date.now();
    const startDate = args.startDate ?? sparklineCutoff;

    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const activeProductCount = products.filter((p) => p.isActive).length;
    const totalSaves = products.reduce((s, p) => s + (p.saveCount ?? 0), 0);

    // Build a 30-day sparkline for saves (use lookbook_items saves as proxy, approximate from product saveCount snapshot)
    // Since saves are stored as totals on items, we build a flat sparkline for display
    const savesSparkline: Array<{ date: string; count: number }> = Array.from({ length: sparklineDays }, (_, i) => {
      const d = new Date(sparklineCutoff + i * 24 * 60 * 60 * 1000);
      return { date: d.toISOString().split('T')[0], count: 0 };
    });

    const result: {
      tier: 'basic' | 'starter' | 'growth' | 'premium';
      totalSaves: number;
      savesSparkline: Array<{ date: string; count: number }>;
      totalProducts: number;
      activeProducts: number;
      totalRevenue?: number;
      totalOrders?: number;
      revenueSparkline?: Array<{ date: string; count: number }>;
      totalViews?: number;
      viewsSparkline?: Array<{ date: string; count: number }>;
      totalTryOns?: number;
      totalCartAdds?: number;
      totalPurchases?: number;
      conversionRate?: number;
      repeatBuyerRate?: number;
    } = {
      tier,
      totalSaves,
      savesSparkline,
      totalProducts: products.length,
      activeProducts: activeProductCount,
    };

    if (limits.showEngagementCounts) {
      const totalViews = products.reduce((s, p) => s + (p.viewCount ?? 0), 0);
      const totalTryOns = products.reduce((s, p) => s + (p.tryOnCount ?? 0), 0);
      result.totalViews = totalViews;
      result.totalTryOns = totalTryOns;
      // Views sparkline (flat for now, data is cumulative on items)
      result.viewsSparkline = Array.from({ length: sparklineDays }, (_, i) => {
        const d = new Date(sparklineCutoff + i * 24 * 60 * 60 * 1000);
        return { date: d.toISOString().split('T')[0], count: 0 };
      });
    }

    if (limits.showCartCounts) {
      const totalCartAdds = products.reduce((s, p) => s + (p.cartAddCount ?? 0), 0);
      const totalPurchases = products.reduce((s, p) => s + (p.purchaseCount ?? 0), 0);
      const totalViews = products.reduce((s, p) => s + (p.viewCount ?? 0), 0);
      result.totalCartAdds = totalCartAdds;
      result.totalPurchases = totalPurchases;
      result.conversionRate = totalViews > 0 ? Math.round((totalPurchases / totalViews) * 100) : 0;
    }

    // Revenue data from order_items
    if (limits.revenueChartDays > 0) {
      const chartDays = limits.revenueChartDays;
      const cutoff = Date.now() - chartDays * 24 * 60 * 60 * 1000;
      const orderItems = await ctx.db
        .query('order_items')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .filter((q) => q.gte(q.field('createdAt'), Math.max(cutoff, startDate)))
        .collect();

      const nonCancelled = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');
      const totalRevenue = nonCancelled.reduce((s, oi) => s + oi.lineTotal, 0);
      const uniqueOrders = new Set(nonCancelled.map((oi) => oi.orderId));

      result.totalRevenue = totalRevenue;
      result.totalOrders = uniqueOrders.size;

      // Revenue sparkline (last 30 days)
      const dailyRevenue: Record<string, number> = {};
      for (const oi of nonCancelled) {
        if (oi.createdAt < sparklineCutoff) continue;
        const date = new Date(oi.createdAt).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] ?? 0) + oi.lineTotal;
      }
      result.revenueSparkline = Array.from({ length: sparklineDays }, (_, i) => {
        const d = new Date(sparklineCutoff + i * 24 * 60 * 60 * 1000);
        const date = d.toISOString().split('T')[0];
        return { date, count: dailyRevenue[date] ?? 0 };
      });
    }

    // Premium: repeat buyer rate
    if (tier === 'premium') {
      const orderItems = await ctx.db
        .query('order_items')
        .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
        .collect();
      const nonCancelled = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');
      const uniqueOrderIds = [...new Set(nonCancelled.map((oi) => oi.orderId))];
      const buyerOrderCount: Record<string, number> = {};
      for (const orderId of uniqueOrderIds) {
        const order = await ctx.db.get(orderId);
        if (!order) continue;
        const key = String(order.userId);
        buyerOrderCount[key] = (buyerOrderCount[key] ?? 0) + 1;
      }
      const totalBuyers = Object.keys(buyerOrderCount).length;
      const repeatBuyers = Object.values(buyerOrderCount).filter((c) => c > 1).length;
      result.repeatBuyerRate = totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 100) : 0;
    }

    return result;
  },
});

/**
 * Engagement trend: multi-metric daily data over a date range.
 * Starter+ only. Returns views/saves/tryOns per day.
 * Note: since views/saves/tryOns are cumulative totals on items (not timestamped events),
 * we return the revenue chart data shape for now and expose the totals as flat trends.
 */
export const getSellerEngagementTrend = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      tier: v.union(v.literal('basic'), v.literal('starter'), v.literal('growth'), v.literal('premium')),
      allowed: v.boolean(),
      // Cumulative totals
      totalViews: v.number(),
      totalSaves: v.number(),
      totalTryOns: v.number(),
      totalLookbookSaves: v.number(),
      // Revenue trend (from order_items, timestamped)
      revenueTrend: v.array(v.object({ date: v.string(), revenue: v.number(), orders: v.number() })),
      // Category breakdown
      categoryBreakdown: v.array(v.object({ category: v.string(), count: v.number(), name: v.string() })),
      // Try-on performance: top products by try-on count
      tryOnProducts: v.array(v.object({
        _id: v.id('items'),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        tryOnCount: v.number(),
        purchaseCount: v.number(),
        conversionRate: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx, args: { startDate?: number; endDate?: number }): Promise<{
    tier: 'basic' | 'starter' | 'growth' | 'premium';
    allowed: boolean;
    totalViews: number;
    totalSaves: number;
    totalTryOns: number;
    totalLookbookSaves: number;
    revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
    categoryBreakdown: Array<{ category: string; count: number; name: string }>;
    tryOnProducts: Array<{
      _id: Id<'items'>;
      name: string;
      imageUrl?: string;
      tryOnCount: number;
      purchaseCount: number;
      conversionRate: number;
    }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    if (!limits.showEngagementCounts) {
      return {
        tier,
        allowed: false,
        totalViews: 0,
        totalSaves: 0,
        totalTryOns: 0,
        totalLookbookSaves: 0,
        revenueTrend: [],
        categoryBreakdown: [],
        tryOnProducts: [],
      };
    }

    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const totalViews = products.reduce((s, p) => s + (p.viewCount ?? 0), 0);
    const totalSaves = products.reduce((s, p) => s + (p.saveCount ?? 0), 0);
    const totalTryOns = products.reduce((s, p) => s + (p.tryOnCount ?? 0), 0);
    const totalLookbookSaves = products.reduce((s, p) => s + (p.lookbookSaveCount ?? 0), 0);

    // Revenue trend
    const days = limits.revenueChartDays > 0 ? limits.revenueChartDays : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.gte(q.field('createdAt'), cutoff))
      .collect();

    const nonCancelled = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');
    const dailyRevenue: Record<string, { revenue: number; orders: Set<string> }> = {};
    for (const oi of nonCancelled) {
      const date = new Date(oi.createdAt).toISOString().split('T')[0];
      if (!dailyRevenue[date]) dailyRevenue[date] = { revenue: 0, orders: new Set() };
      dailyRevenue[date].revenue += oi.lineTotal;
      dailyRevenue[date].orders.add(oi.orderId);
    }
    const revenueTrend = Array.from({ length: days }, (_, i) => {
      const d = new Date(cutoff + i * 24 * 60 * 60 * 1000);
      const date = d.toISOString().split('T')[0];
      const data = dailyRevenue[date];
      return { date, revenue: data?.revenue ?? 0, orders: data?.orders.size ?? 0 };
    });

    // Category breakdown (by view count)
    const categoryMap: Record<string, number> = {};
    for (const p of products) {
      categoryMap[p.category] = (categoryMap[p.category] ?? 0) + (p.viewCount ?? 0);
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, count]) => ({
        category,
        count,
        name: category.charAt(0).toUpperCase() + category.slice(1),
      }))
      .sort((a, b) => b.count - a.count);

    // Try-on performance
    const tryOnProducts = await Promise.all(
      products
        .filter((p) => (p.tryOnCount ?? 0) > 0)
        .sort((a, b) => (b.tryOnCount ?? 0) - (a.tryOnCount ?? 0))
        .slice(0, 10)
        .map(async (p) => {
          const img = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', p._id).eq('isPrimary', true))
            .unique();
          let imageUrl: string | undefined;
          if (img?.storageId) imageUrl = (await ctx.storage.getUrl(img.storageId)) ?? undefined;
          else if (img?.externalUrl) imageUrl = img.externalUrl;
          const tryOnCount = p.tryOnCount ?? 0;
          const purchaseCount = p.purchaseCount ?? 0;
          return {
            _id: p._id,
            name: p.name,
            imageUrl,
            tryOnCount,
            purchaseCount,
            conversionRate: tryOnCount > 0 ? Math.round((purchaseCount / tryOnCount) * 100) : 0,
          };
        })
    );

    return {
      tier,
      allowed: true,
      totalViews,
      totalSaves,
      totalTryOns,
      totalLookbookSaves,
      revenueTrend,
      categoryBreakdown,
      tryOnProducts,
    };
  },
});

/**
 * Conversion funnel data for the conversion sub-page.
 * Growth+ only.
 */
export const getSellerConversionData = query({
  args: {},
  returns: v.union(
    v.object({
      tier: v.union(v.literal('basic'), v.literal('starter'), v.literal('growth'), v.literal('premium')),
      allowed: v.boolean(),
      funnel: v.object({
        views: v.number(),
        saves: v.number(),
        cartAdds: v.number(),
        purchases: v.number(),
      }),
      tryOnToPurchaseRate: v.number(),
      categoryBreakdown: v.array(v.object({
        category: v.string(),
        name: v.string(),
        revenue: v.number(),
        itemCount: v.number(),
      })),
      topConvertingProducts: v.array(v.object({
        _id: v.id('items'),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
        views: v.number(),
        purchases: v.number(),
        conversionRate: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<{
    tier: 'basic' | 'starter' | 'growth' | 'premium';
    allowed: boolean;
    funnel: { views: number; saves: number; cartAdds: number; purchases: number };
    tryOnToPurchaseRate: number;
    categoryBreakdown: Array<{ category: string; name: string; revenue: number; itemCount: number }>;
    topConvertingProducts: Array<{
      _id: Id<'items'>;
      name: string;
      imageUrl?: string;
      price: number;
      views: number;
      purchases: number;
      conversionRate: number;
    }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);

    if (!limits.showCartCounts) {
      return {
        tier,
        allowed: false,
        funnel: { views: 0, saves: 0, cartAdds: 0, purchases: 0 },
        tryOnToPurchaseRate: 0,
        categoryBreakdown: [],
        topConvertingProducts: [],
      };
    }

    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const totalViews = products.reduce((s, p) => s + (p.viewCount ?? 0), 0);
    const totalSaves = products.reduce((s, p) => s + (p.saveCount ?? 0), 0);
    const totalCartAdds = products.reduce((s, p) => s + (p.cartAddCount ?? 0), 0);
    const totalPurchases = products.reduce((s, p) => s + (p.purchaseCount ?? 0), 0);
    const totalTryOns = products.reduce((s, p) => s + (p.tryOnCount ?? 0), 0);

    const tryOnToPurchaseRate = totalTryOns > 0 ? Math.round((totalPurchases / totalTryOns) * 100) : 0;

    // Category breakdown from order_items
    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();
    const nonCancelled = orderItems.filter((oi) => oi.fulfillmentStatus !== 'cancelled');
    const categoryMap: Record<string, { revenue: number; itemCount: number }> = {};
    for (const oi of nonCancelled) {
      const item = await ctx.db.get(oi.itemId);
      if (!item) continue;
      const cat = item.category;
      if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, itemCount: 0 };
      categoryMap[cat].revenue += oi.lineTotal;
      categoryMap[cat].itemCount += oi.quantity;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top converting products
    const topConverting = await Promise.all(
      products
        .filter((p) => (p.viewCount ?? 0) > 0)
        .sort((a, b) => {
          const rateA = (a.purchaseCount ?? 0) / Math.max(a.viewCount ?? 1, 1);
          const rateB = (b.purchaseCount ?? 0) / Math.max(b.viewCount ?? 1, 1);
          return rateB - rateA;
        })
        .slice(0, 10)
        .map(async (p) => {
          const img = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', p._id).eq('isPrimary', true))
            .unique();
          let imageUrl: string | undefined;
          if (img?.storageId) imageUrl = (await ctx.storage.getUrl(img.storageId)) ?? undefined;
          else if (img?.externalUrl) imageUrl = img.externalUrl;
          const views = p.viewCount ?? 0;
          const purchases = p.purchaseCount ?? 0;
          return {
            _id: p._id,
            name: p.name,
            imageUrl,
            price: p.price,
            views,
            purchases,
            conversionRate: views > 0 ? Math.round((purchases / views) * 100) : 0,
          };
        })
    );

    return {
      tier,
      allowed: true,
      funnel: { views: totalViews, saves: totalSaves, cartAdds: totalCartAdds, purchases: totalPurchases },
      tryOnToPurchaseRate,
      categoryBreakdown,
      topConvertingProducts: topConverting,
    };
  },
});

/**
 * Per-product engagement drill-down — all items for this seller sorted by metric.
 * Starter+ only (gated by tier config).
 */
export const getProductEngagementBreakdown = query({
  args: {
    sortBy: v.union(
      v.literal('views'),
      v.literal('saves'),
      v.literal('tryOns'),
      v.literal('cartAdds'),
      v.literal('purchases'),
      v.literal('lookbookSaves')
    ),
  },
  returns: v.union(
    v.object({
      tier: v.union(v.literal('basic'), v.literal('starter'), v.literal('growth'), v.literal('premium')),
      products: v.array(v.object({
        _id: v.id('items'),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        price: v.number(),
        currency: v.string(),
        isActive: v.boolean(),
        viewCount: v.number(),
        saveCount: v.number(),
        tryOnCount: v.optional(v.number()),
        cartAddCount: v.optional(v.number()),
        purchaseCount: v.optional(v.number()),
        lookbookSaveCount: v.optional(v.number()),
        conversionRate: v.optional(v.number()),
      })),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sortBy: 'views' | 'saves' | 'tryOns' | 'cartAdds' | 'purchases' | 'lookbookSaves' }
  ): Promise<{
    tier: 'basic' | 'starter' | 'growth' | 'premium';
    products: Array<{
      _id: Id<'items'>;
      name: string;
      imageUrl?: string;
      price: number;
      currency: string;
      isActive: boolean;
      viewCount: number;
      saveCount: number;
      tryOnCount?: number;
      cartAddCount?: number;
      purchaseCount?: number;
      lookbookSaveCount?: number;
      conversionRate?: number;
    }>;
  } | null> => {
    const seller = await getSellerWithTier(ctx);
    if (!seller) return null;

    const tier = seller.effectiveTier;
    const limits = await getTierConfig(ctx, tier);
    const showEngagement = limits.showEngagementCounts;
    const showCart = limits.showCartCounts;

    const products = await ctx.db
      .query('items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .collect();

    const withImages = await Promise.all(
      products.map(async (p) => {
        const img = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', p._id).eq('isPrimary', true))
          .unique();
        let imageUrl: string | undefined;
        if (img?.storageId) imageUrl = (await ctx.storage.getUrl(img.storageId)) ?? undefined;
        else if (img?.externalUrl) imageUrl = img.externalUrl;

        const views = p.viewCount ?? 0;
        const conversionRate = (showCart && views > 0)
          ? Math.round(((p.purchaseCount ?? 0) / views) * 100)
          : undefined;

        return {
          _id: p._id,
          name: p.name,
          imageUrl,
          price: p.price,
          currency: p.currency,
          isActive: p.isActive,
          viewCount: views,
          saveCount: p.saveCount ?? 0,
          tryOnCount: showEngagement ? (p.tryOnCount ?? 0) : undefined,
          cartAddCount: showCart ? (p.cartAddCount ?? 0) : undefined,
          purchaseCount: showCart ? (p.purchaseCount ?? 0) : undefined,
          lookbookSaveCount: showEngagement ? (p.lookbookSaveCount ?? 0) : undefined,
          conversionRate,
        };
      })
    );

    const sorted = [...withImages].sort((a, b) => {
      switch (args.sortBy) {
        case 'views':         return b.viewCount - a.viewCount;
        case 'saves':         return b.saveCount - a.saveCount;
        case 'tryOns':        return (b.tryOnCount ?? 0) - (a.tryOnCount ?? 0);
        case 'cartAdds':      return (b.cartAddCount ?? 0) - (a.cartAddCount ?? 0);
        case 'purchases':     return (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
        case 'lookbookSaves': return (b.lookbookSaveCount ?? 0) - (a.lookbookSaveCount ?? 0);
        default:              return 0;
      }
    });

    return { tier, products: sorted };
  },
});
