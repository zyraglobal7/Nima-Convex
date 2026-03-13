import { query, internalQuery, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Get a seller try-on by ID (polling)
 */
export const getSellerTryOn = query({
  args: {
    sellerTryOnId: v.id('seller_try_ons'),
  },
  returns: v.union(
    v.object({
      _id: v.id('seller_try_ons'),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      ),
      resultUrl: v.union(v.string(), v.null()),
      errorMessage: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sellerTryOnId: Id<'seller_try_ons'> }
  ): Promise<{
    _id: Id<'seller_try_ons'>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    resultUrl: string | null;
    errorMessage?: string;
  } | null> => {
    const tryOn = await ctx.db.get(args.sellerTryOnId);
    if (!tryOn) return null;

    let resultUrl: string | null = null;
    if (tryOn.resultStorageId) {
      resultUrl = await ctx.storage.getUrl(tryOn.resultStorageId);
    }

    return {
      _id: tryOn._id,
      status: tryOn.status,
      resultUrl,
      errorMessage: tryOn.errorMessage,
    };
  },
});

/**
 * Get seller try-on credits (for seller dashboard)
 */
export const getSellerTryOnCredits = query({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<number | null> => {
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

    return seller.tryOnCredits ?? 0;
  },
});

/**
 * Get seller by slug with item for try-on page (public, no auth)
 */
export const getSellerAndItemForTryOn = query({
  args: {
    sellerSlug: v.string(),
    itemId: v.id('items'),
  },
  returns: v.union(
    v.object({
      seller: v.object({
        _id: v.id('sellers'),
        shopName: v.string(),
        slug: v.string(),
        logoUrl: v.union(v.string(), v.null()),
        tryOnCredits: v.number(),
      }),
      item: v.object({
        _id: v.id('items'),
        name: v.string(),
        brand: v.optional(v.string()),
        price: v.number(),
        currency: v.string(),
        imageUrl: v.union(v.string(), v.null()),
        category: v.string(),
      }),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sellerSlug: string; itemId: Id<'items'> }
  ): Promise<{
    seller: {
      _id: Id<'sellers'>;
      shopName: string;
      slug: string;
      logoUrl: string | null;
      tryOnCredits: number;
    };
    item: {
      _id: Id<'items'>;
      name: string;
      brand?: string;
      price: number;
      currency: string;
      imageUrl: string | null;
      category: string;
    };
  } | null> => {
    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_slug', (q) => q.eq('slug', args.sellerSlug))
      .unique();

    if (!seller || !seller.isActive) return null;

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive || item.sellerId !== seller._id) return null;

    // Get item primary image
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

    // Get seller logo
    let logoUrl: string | null = null;
    if (seller.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(seller.logoStorageId);
    }

    return {
      seller: {
        _id: seller._id,
        shopName: seller.shopName,
        slug: seller.slug,
        logoUrl,
        tryOnCredits: seller.tryOnCredits ?? 0,
      },
      item: {
        _id: item._id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        currency: item.currency,
        imageUrl,
        category: item.category,
      },
    };
  },
});

/**
 * Internal query to get seller try-on record (for workflow)
 */
export const getSellerTryOnInternal = internalQuery({
  args: {
    sellerTryOnId: v.id('seller_try_ons'),
  },
  returns: v.union(
    v.object({
      _id: v.id('seller_try_ons'),
      sellerId: v.id('sellers'),
      itemId: v.id('items'),
      customerImageStorageId: v.id('_storage'),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sellerTryOnId: Id<'seller_try_ons'> }
  ): Promise<{
    _id: Id<'seller_try_ons'>;
    sellerId: Id<'sellers'>;
    itemId: Id<'items'>;
    customerImageStorageId: Id<'_storage'>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  } | null> => {
    const tryOn = await ctx.db.get(args.sellerTryOnId);
    if (!tryOn) return null;
    return {
      _id: tryOn._id,
      sellerId: tryOn.sellerId,
      itemId: tryOn.itemId,
      customerImageStorageId: tryOn.customerImageStorageId,
      status: tryOn.status,
    };
  },
});
