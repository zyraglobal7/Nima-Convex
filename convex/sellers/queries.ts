import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';

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
      currency: 'KES', // Default currency
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
      createdAt: number;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
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
          viewCount: product.viewCount,
          saveCount: product.saveCount,
          purchaseCount: product.purchaseCount,
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

    // Get order items from the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const orderItems = await ctx.db
      .query('order_items')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .filter((q) => q.gte(q.field('createdAt'), thirtyDaysAgo))
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

    // Generate array for all 30 days (including days with no sales)
    const result: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = 29; i >= 0; i--) {
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
