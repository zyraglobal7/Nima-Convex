import {
  query,
  internalQuery,
  QueryCtx,
} from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { v } from 'convex/values';

const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  starter: 500,
  growth: 5000,
  enterprise: 999999,
};

/**
 * Get session by token (internal) - returns session + partner name
 */
export const getSessionByToken = internalQuery({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('api_sessions'),
      partnerId: v.id('api_partners'),
      partnerName: v.string(),
      sessionToken: v.string(),
      nimaUserId: v.optional(v.id('users')),
      guestFingerprint: v.optional(v.string()),
      externalProductId: v.string(),
      externalProductUrl: v.optional(v.string()),
      productImageUrl: v.string(),
      productName: v.optional(v.string()),
      productCategory: v.optional(
        v.union(
          v.literal('top'),
          v.literal('bottom'),
          v.literal('dress'),
          v.literal('outfit'),
          v.literal('outerwear'),
        )
      ),
      guestImageStorageId: v.optional(v.id('_storage')),
      resultStorageId: v.optional(v.id('_storage')),
      guestTryOnUsed: v.boolean(),
      guestTryOnCount: v.optional(v.number()),
      status: v.union(
        v.literal('created'),
        v.literal('photo_needed'),
        v.literal('photo_uploaded'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('expired'),
      ),
      errorMessage: v.optional(v.string()),
      expiresAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sessionToken: string }
  ): Promise<{
    _id: Id<'api_sessions'>;
    partnerId: Id<'api_partners'>;
    partnerName: string;
    sessionToken: string;
    nimaUserId?: Id<'users'>;
    guestFingerprint?: string;
    externalProductId: string;
    externalProductUrl?: string;
    productImageUrl: string;
    productName?: string;
    productCategory?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear';
    guestImageStorageId?: Id<'_storage'>;
    resultStorageId?: Id<'_storage'>;
    guestTryOnUsed: boolean;
    guestTryOnCount?: number;
    status: 'created' | 'photo_needed' | 'photo_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
    errorMessage?: string;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
  } | null> => {
    const session = await ctx.db
      .query('api_sessions')
      .withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;

    const partner = await ctx.db.get(session.partnerId);
    return {
      _id: session._id,
      partnerId: session.partnerId,
      partnerName: partner?.name ?? 'Unknown Partner',
      sessionToken: session.sessionToken,
      nimaUserId: session.nimaUserId,
      guestFingerprint: session.guestFingerprint,
      externalProductId: session.externalProductId,
      externalProductUrl: session.externalProductUrl,
      productImageUrl: session.productImageUrl,
      productName: session.productName,
      productCategory: session.productCategory,
      guestImageStorageId: session.guestImageStorageId,
      resultStorageId: session.resultStorageId,
      guestTryOnUsed: session.guestTryOnUsed,
      guestTryOnCount: session.guestTryOnCount,
      status: session.status,
      errorMessage: session.errorMessage,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  },
});

/**
 * Validate an API key by prefix (internal)
 * Returns partner if active, null otherwise
 */
export const validateApiKey = internalQuery({
  args: { prefix: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('api_partners'),
      name: v.string(),
      slug: v.string(),
      websiteUrl: v.string(),
      apiKeyHash: v.string(),
      apiKeyPrefix: v.string(),
      allowedDomains: v.array(v.string()),
      webhookUrl: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      monthlyTryOnLimit: v.number(),
      tryOnsUsedThisMonth: v.number(),
      billingResetAt: v.number(),
      isActive: v.boolean(),
      sellerId: v.optional(v.id('sellers')),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { prefix: string }
  ) => {
    const partner = await ctx.db
      .query('api_partners')
      .withIndex('by_api_key_prefix', (q) => q.eq('apiKeyPrefix', args.prefix))
      .first();
    if (!partner || !partner.isActive) return null;
    return {
      _id: partner._id,
      name: partner.name,
      slug: partner.slug,
      websiteUrl: partner.websiteUrl,
      apiKeyHash: partner.apiKeyHash,
      apiKeyPrefix: partner.apiKeyPrefix,
      allowedDomains: partner.allowedDomains,
      webhookUrl: partner.webhookUrl,
      webhookSecret: partner.webhookSecret,
      plan: partner.plan,
      monthlyTryOnLimit: partner.monthlyTryOnLimit,
      tryOnsUsedThisMonth: partner.tryOnsUsedThisMonth,
      billingResetAt: partner.billingResetAt,
      isActive: partner.isActive,
      sellerId: partner.sellerId,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };
  },
});

/**
 * Get partner usage stats (internal)
 */
export const getPartnerUsage = internalQuery({
  args: { prefix: v.string() },
  returns: v.union(
    v.object({
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      used: v.number(),
      limit: v.number(),
      resetAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { prefix: string }
  ): Promise<{ plan: 'free' | 'starter' | 'growth' | 'enterprise'; used: number; limit: number; resetAt: number } | null> => {
    const partner = await ctx.db
      .query('api_partners')
      .withIndex('by_api_key_prefix', (q) => q.eq('apiKeyPrefix', args.prefix))
      .first();
    if (!partner) return null;
    return {
      plan: partner.plan,
      used: partner.tryOnsUsedThisMonth,
      limit: partner.monthlyTryOnLimit,
      resetAt: partner.billingResetAt,
    };
  },
});

/**
 * Public query — widget subscribes to this for real-time status updates
 */
export const getSessionStatus = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      status: v.union(
        v.literal('created'),
        v.literal('photo_needed'),
        v.literal('photo_uploaded'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('expired'),
      ),
      resultImageUrl: v.optional(v.string()),
      productName: v.optional(v.string()),
      productImageUrl: v.string(),
      partnerName: v.string(),
      guestTryOnUsed: v.boolean(),
      guestTryOnCount: v.optional(v.number()),
      nimaUserId: v.optional(v.id('users')),
      errorMessage: v.optional(v.string()),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sessionToken: string }
  ): Promise<{
    status: 'created' | 'photo_needed' | 'photo_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
    resultImageUrl?: string;
    productName?: string;
    productImageUrl: string;
    partnerName: string;
    guestTryOnUsed: boolean;
    guestTryOnCount?: number;
    nimaUserId?: Id<'users'>;
    errorMessage?: string;
    expiresAt: number;
  } | null> => {
    const session = await ctx.db
      .query('api_sessions')
      .withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return null;

    const partner = await ctx.db.get(session.partnerId);

    let resultImageUrl: string | undefined;
    if (session.resultStorageId) {
      resultImageUrl = (await ctx.storage.getUrl(session.resultStorageId)) ?? undefined;
    }

    return {
      status: session.status,
      resultImageUrl,
      productName: session.productName,
      productImageUrl: session.productImageUrl,
      partnerName: partner?.name ?? 'Unknown Partner',
      guestTryOnUsed: session.guestTryOnUsed,
      guestTryOnCount: session.guestTryOnCount,
      nimaUserId: session.nimaUserId,
      errorMessage: session.errorMessage,
      expiresAt: session.expiresAt,
    };
  },
});

/**
 * List all partners with stats (internal — admin use)
 */
export const listPartnersInternal = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('api_partners'),
      name: v.string(),
      slug: v.string(),
      websiteUrl: v.string(),
      apiKeyPrefix: v.string(),
      allowedDomains: v.array(v.string()),
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      monthlyTryOnLimit: v.number(),
      tryOnsUsedThisMonth: v.number(),
      billingResetAt: v.number(),
      isActive: v.boolean(),
      sellerId: v.optional(v.id('sellers')),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx: QueryCtx): Promise<Array<{
    _id: Id<'api_partners'>;
    name: string;
    slug: string;
    websiteUrl: string;
    apiKeyPrefix: string;
    allowedDomains: string[];
    plan: 'free' | 'starter' | 'growth' | 'enterprise';
    monthlyTryOnLimit: number;
    tryOnsUsedThisMonth: number;
    billingResetAt: number;
    isActive: boolean;
    sellerId?: Id<'sellers'>;
    createdAt: number;
    updatedAt: number;
  }>> => {
    const partners = await ctx.db.query('api_partners').order('desc').collect();
    return partners.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      websiteUrl: p.websiteUrl,
      apiKeyPrefix: p.apiKeyPrefix,
      allowedDomains: p.allowedDomains,
      plan: p.plan,
      monthlyTryOnLimit: p.monthlyTryOnLimit,
      tryOnsUsedThisMonth: p.tryOnsUsedThisMonth,
      billingResetAt: p.billingResetAt,
      isActive: p.isActive,
      sellerId: p.sellerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Get partner by ID (internal)
 */
export const getPartnerById = internalQuery({
  args: { partnerId: v.id('api_partners') },
  returns: v.union(
    v.object({
      _id: v.id('api_partners'),
      isActive: v.boolean(),
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      monthlyTryOnLimit: v.number(),
      tryOnsUsedThisMonth: v.number(),
      billingResetAt: v.number(),
      allowedDomains: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<{
    _id: Id<'api_partners'>;
    isActive: boolean;
    plan: 'free' | 'starter' | 'growth' | 'enterprise';
    monthlyTryOnLimit: number;
    tryOnsUsedThisMonth: number;
    billingResetAt: number;
    allowedDomains: string[];
  } | null> => {
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) return null;
    return {
      _id: partner._id,
      isActive: partner.isActive,
      plan: partner.plan,
      monthlyTryOnLimit: partner.monthlyTryOnLimit,
      tryOnsUsedThisMonth: partner.tryOnsUsedThisMonth,
      billingResetAt: partner.billingResetAt,
      allowedDomains: partner.allowedDomains,
    };
  },
});

/**
 * Get partner linked to a seller (internal)
 */
export const getPartnerBySeller = internalQuery({
  args: { sellerId: v.id('sellers') },
  returns: v.union(
    v.object({
      _id: v.id('api_partners'),
      name: v.string(),
      slug: v.string(),
      websiteUrl: v.string(),
      apiKeyPrefix: v.string(),
      allowedDomains: v.array(v.string()),
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      monthlyTryOnLimit: v.number(),
      tryOnsUsedThisMonth: v.number(),
      billingResetAt: v.number(),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { sellerId: Id<'sellers'> }
  ) => {
    const partner = await ctx.db
      .query('api_partners')
      .withIndex('by_seller', (q) => q.eq('sellerId', args.sellerId))
      .first();
    if (!partner) return null;
    return {
      _id: partner._id,
      name: partner.name,
      slug: partner.slug,
      websiteUrl: partner.websiteUrl,
      apiKeyPrefix: partner.apiKeyPrefix,
      allowedDomains: partner.allowedDomains,
      plan: partner.plan,
      monthlyTryOnLimit: partner.monthlyTryOnLimit,
      tryOnsUsedThisMonth: partner.tryOnsUsedThisMonth,
      billingResetAt: partner.billingResetAt,
      isActive: partner.isActive,
    };
  },
});

/**
 * Public admin-gated query — lists all partners (checks admin role)
 */
export const getPartnersAdmin = query({
  args: {},
  returns: v.union(
    v.array(
      v.object({
        _id: v.id('api_partners'),
        name: v.string(),
        slug: v.string(),
        websiteUrl: v.string(),
        apiKeyPrefix: v.string(),
        allowedDomains: v.array(v.string()),
        plan: v.union(
          v.literal('free'),
          v.literal('starter'),
          v.literal('growth'),
          v.literal('enterprise'),
        ),
        monthlyTryOnLimit: v.number(),
        tryOnsUsedThisMonth: v.number(),
        billingResetAt: v.number(),
        isActive: v.boolean(),
        sellerId: v.optional(v.id('sellers')),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<Array<{
    _id: Id<'api_partners'>;
    name: string;
    slug: string;
    websiteUrl: string;
    apiKeyPrefix: string;
    allowedDomains: string[];
    plan: 'free' | 'starter' | 'growth' | 'enterprise';
    monthlyTryOnLimit: number;
    tryOnsUsedThisMonth: number;
    billingResetAt: number;
    isActive: boolean;
    sellerId?: Id<'sellers'>;
    createdAt: number;
    updatedAt: number;
  }> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .first();
    if (!user || user.role !== 'admin') return null;

    const partners = await ctx.db.query('api_partners').order('desc').collect();
    return partners.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      websiteUrl: p.websiteUrl,
      apiKeyPrefix: p.apiKeyPrefix,
      allowedDomains: p.allowedDomains,
      plan: p.plan,
      monthlyTryOnLimit: p.monthlyTryOnLimit,
      tryOnsUsedThisMonth: p.tryOnsUsedThisMonth,
      billingResetAt: p.billingResetAt,
      isActive: p.isActive,
      sellerId: p.sellerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Public seller-gated query — returns partner linked to the current seller
 */
export const getMyPartner = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('api_partners'),
      name: v.string(),
      slug: v.string(),
      websiteUrl: v.string(),
      apiKeyPrefix: v.string(),
      allowedDomains: v.array(v.string()),
      plan: v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      ),
      monthlyTryOnLimit: v.number(),
      tryOnsUsedThisMonth: v.number(),
      billingResetAt: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx): Promise<{
    _id: Id<'api_partners'>;
    name: string;
    slug: string;
    websiteUrl: string;
    apiKeyPrefix: string;
    allowedDomains: string[];
    plan: 'free' | 'starter' | 'growth' | 'enterprise';
    monthlyTryOnLimit: number;
    tryOnsUsedThisMonth: number;
    billingResetAt: number;
    isActive: boolean;
    createdAt: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .first();
    if (!user) return null;

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    if (!seller) return null;

    const partner = await ctx.db
      .query('api_partners')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .first();
    if (!partner) return null;

    return {
      _id: partner._id,
      name: partner.name,
      slug: partner.slug,
      websiteUrl: partner.websiteUrl,
      apiKeyPrefix: partner.apiKeyPrefix,
      allowedDomains: partner.allowedDomains,
      plan: partner.plan,
      monthlyTryOnLimit: partner.monthlyTryOnLimit,
      tryOnsUsedThisMonth: partner.tryOnsUsedThisMonth,
      billingResetAt: partner.billingResetAt,
      isActive: partner.isActive,
      createdAt: partner.createdAt,
    };
  },
});

/**
 * Get recent usage logs for a partner (seller-gated)
 */
export const getMyRecentUsageLogs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('api_usage_logs'),
      eventType: v.union(
        v.literal('session_created'),
        v.literal('photo_uploaded'),
        v.literal('tryon_generated'),
        v.literal('tryon_failed'),
        v.literal('user_converted'),
        v.literal('item_added_to_cart'),
        v.literal('item_purchased'),
      ),
      wasAuthenticated: v.boolean(),
      generationTimeMs: v.optional(v.number()),
      itemValue: v.optional(v.number()),
      currency: v.optional(v.string()),
      trackingId: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx: QueryCtx): Promise<Array<{
    _id: Id<'api_usage_logs'>;
    eventType: 'session_created' | 'photo_uploaded' | 'tryon_generated' | 'tryon_failed' | 'user_converted' | 'item_added_to_cart' | 'item_purchased';
    wasAuthenticated: boolean;
    generationTimeMs?: number;
    itemValue?: number;
    currency?: string;
    trackingId?: string;
    createdAt: number;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .first();
    if (!user) return [];

    const seller = await ctx.db
      .query('sellers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    if (!seller) return [];

    const partner = await ctx.db
      .query('api_partners')
      .withIndex('by_seller', (q) => q.eq('sellerId', seller._id))
      .first();
    if (!partner) return [];

    const logs = await ctx.db
      .query('api_usage_logs')
      .withIndex('by_partner_and_created', (q) => q.eq('partnerId', partner._id))
      .order('desc')
      .take(50);

    return logs.map((l) => ({
      _id: l._id,
      eventType: l.eventType,
      wasAuthenticated: l.wasAuthenticated,
      generationTimeMs: l.generationTimeMs,
      itemValue: l.itemValue,
      currency: l.currency,
      trackingId: l.trackingId,
      createdAt: l.createdAt,
    }));
  },
});

// Export PLAN_LIMITS for use in actions
export { PLAN_LIMITS };
