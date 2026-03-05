import {
  mutation,
  internalMutation,
  MutationCtx,
} from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { v } from 'convex/values';

/**
 * Create a new Connect API session
 */
export const createSession = internalMutation({
  args: {
    partnerId: v.id('api_partners'),
    sessionToken: v.string(),
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
    guestFingerprint: v.optional(v.string()),
  },
  returns: v.id('api_sessions'),
  handler: async (
    ctx: MutationCtx,
    args: {
      partnerId: Id<'api_partners'>;
      sessionToken: string;
      externalProductId: string;
      externalProductUrl?: string;
      productImageUrl: string;
      productName?: string;
      productCategory?: 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear';
      guestFingerprint?: string;
    }
  ): Promise<Id<'api_sessions'>> => {
    const now = Date.now();
    return await ctx.db.insert('api_sessions', {
      partnerId: args.partnerId,
      sessionToken: args.sessionToken,
      externalProductId: args.externalProductId,
      externalProductUrl: args.externalProductUrl,
      productImageUrl: args.productImageUrl,
      productName: args.productName,
      productCategory: args.productCategory,
      guestFingerprint: args.guestFingerprint,
      guestTryOnUsed: false,
      status: 'photo_needed',
      expiresAt: now + 60 * 60 * 1000, // 1 hour
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Save a guest photo to a session
 */
export const saveGuestPhoto = internalMutation({
  args: {
    sessionToken: v.string(),
    storageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { sessionToken: string; storageId: Id<'_storage'> }
  ): Promise<null> => {
    const session = await ctx.db
      .query('api_sessions')
      .withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) throw new Error('Session not found');

    await ctx.db.patch(session._id, {
      guestImageStorageId: args.storageId,
      status: 'photo_uploaded',
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Update session status and optional result/error fields
 */
export const updateSessionStatus = internalMutation({
  args: {
    sessionToken: v.string(),
    status: v.union(
      v.literal('created'),
      v.literal('photo_needed'),
      v.literal('photo_uploaded'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('expired'),
    ),
    resultStorageId: v.optional(v.id('_storage')),
    errorMessage: v.optional(v.string()),
    guestTryOnUsed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      sessionToken: string;
      status: 'created' | 'photo_needed' | 'photo_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
      guestTryOnUsed?: boolean;
    }
  ): Promise<null> => {
    const session = await ctx.db
      .query('api_sessions')
      .withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) throw new Error('Session not found');

    const patch: {
      status: typeof args.status;
      updatedAt: number;
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
      guestTryOnUsed?: boolean;
    } = { status: args.status, updatedAt: Date.now() };
    if (args.resultStorageId !== undefined) patch.resultStorageId = args.resultStorageId;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.guestTryOnUsed !== undefined) patch.guestTryOnUsed = args.guestTryOnUsed;

    await ctx.db.patch(session._id, patch);
    return null;
  },
});

/**
 * Increment partner monthly usage counter, resetting if billing period has rolled over
 */
export const incrementPartnerUsage = internalMutation({
  args: { partnerId: v.id('api_partners') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<null> => {
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error('Partner not found');

    const now = Date.now();
    let used = partner.tryOnsUsedThisMonth;
    let resetAt = partner.billingResetAt;

    // Reset monthly counter if billing period has rolled over
    if (now > partner.billingResetAt) {
      used = 0;
      resetAt = now + 30 * 24 * 60 * 60 * 1000; // +30 days
    }

    await ctx.db.patch(args.partnerId, {
      tryOnsUsedThisMonth: used + 1,
      billingResetAt: resetAt,
      updatedAt: now,
    });
    return null;
  },
});

/**
 * Log a usage event for a session
 */
export const logUsageEvent = internalMutation({
  args: {
    partnerId: v.id('api_partners'),
    sessionId: v.id('api_sessions'),
    eventType: v.union(
      v.literal('session_created'),
      v.literal('photo_uploaded'),
      v.literal('tryon_generated'),
      v.literal('tryon_failed'),
      v.literal('user_converted'),
    ),
    externalProductId: v.optional(v.string()),
    wasAuthenticated: v.boolean(),
    generationTimeMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      partnerId: Id<'api_partners'>;
      sessionId: Id<'api_sessions'>;
      eventType: 'session_created' | 'photo_uploaded' | 'tryon_generated' | 'tryon_failed' | 'user_converted';
      externalProductId?: string;
      wasAuthenticated: boolean;
      generationTimeMs?: number;
    }
  ): Promise<null> => {
    await ctx.db.insert('api_usage_logs', {
      partnerId: args.partnerId,
      sessionId: args.sessionId,
      eventType: args.eventType,
      externalProductId: args.externalProductId,
      wasAuthenticated: args.wasAuthenticated,
      generationTimeMs: args.generationTimeMs,
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Link a Nima user to a session (after auth)
 */
export const linkNimaUser = internalMutation({
  args: {
    sessionToken: v.string(),
    nimaUserId: v.id('users'),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { sessionToken: string; nimaUserId: Id<'users'> }
  ): Promise<null> => {
    const session = await ctx.db
      .query('api_sessions')
      .withIndex('by_session_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) throw new Error('Session not found');

    await ctx.db.patch(session._id, {
      nimaUserId: args.nimaUserId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Create a new API partner (called from admin action after key generation)
 */
export const createPartner = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    websiteUrl: v.string(),
    apiKeyHash: v.string(),
    apiKeyPrefix: v.string(),
    allowedDomains: v.array(v.string()),
    plan: v.union(
      v.literal('free'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('enterprise'),
    ),
    monthlyTryOnLimit: v.number(),
    sellerId: v.optional(v.id('sellers')),
  },
  returns: v.id('api_partners'),
  handler: async (
    ctx: MutationCtx,
    args: {
      name: string;
      slug: string;
      websiteUrl: string;
      apiKeyHash: string;
      apiKeyPrefix: string;
      allowedDomains: string[];
      plan: 'free' | 'starter' | 'growth' | 'enterprise';
      monthlyTryOnLimit: number;
      sellerId?: Id<'sellers'>;
    }
  ): Promise<Id<'api_partners'>> => {
    const now = Date.now();
    return await ctx.db.insert('api_partners', {
      name: args.name,
      slug: args.slug,
      websiteUrl: args.websiteUrl,
      apiKeyHash: args.apiKeyHash,
      apiKeyPrefix: args.apiKeyPrefix,
      allowedDomains: args.allowedDomains,
      plan: args.plan,
      monthlyTryOnLimit: args.monthlyTryOnLimit,
      tryOnsUsedThisMonth: 0,
      billingResetAt: now + 30 * 24 * 60 * 60 * 1000,
      isActive: true,
      sellerId: args.sellerId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update partner fields
 */
export const updatePartner = internalMutation({
  args: {
    partnerId: v.id('api_partners'),
    name: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    allowedDomains: v.optional(v.array(v.string())),
    plan: v.optional(
      v.union(
        v.literal('free'),
        v.literal('starter'),
        v.literal('growth'),
        v.literal('enterprise'),
      )
    ),
    monthlyTryOnLimit: v.optional(v.number()),
    apiKeyHash: v.optional(v.string()),
    apiKeyPrefix: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      partnerId: Id<'api_partners'>;
      name?: string;
      websiteUrl?: string;
      allowedDomains?: string[];
      plan?: 'free' | 'starter' | 'growth' | 'enterprise';
      monthlyTryOnLimit?: number;
      apiKeyHash?: string;
      apiKeyPrefix?: string;
      webhookUrl?: string;
      webhookSecret?: string;
    }
  ): Promise<null> => {
    const patch: {
      updatedAt: number;
      name?: string;
      websiteUrl?: string;
      allowedDomains?: string[];
      plan?: 'free' | 'starter' | 'growth' | 'enterprise';
      monthlyTryOnLimit?: number;
      apiKeyHash?: string;
      apiKeyPrefix?: string;
      webhookUrl?: string;
      webhookSecret?: string;
    } = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.websiteUrl !== undefined) patch.websiteUrl = args.websiteUrl;
    if (args.allowedDomains !== undefined) patch.allowedDomains = args.allowedDomains;
    if (args.plan !== undefined) patch.plan = args.plan;
    if (args.monthlyTryOnLimit !== undefined) patch.monthlyTryOnLimit = args.monthlyTryOnLimit;
    if (args.apiKeyHash !== undefined) patch.apiKeyHash = args.apiKeyHash;
    if (args.apiKeyPrefix !== undefined) patch.apiKeyPrefix = args.apiKeyPrefix;
    if (args.webhookUrl !== undefined) patch.webhookUrl = args.webhookUrl;
    if (args.webhookSecret !== undefined) patch.webhookSecret = args.webhookSecret;

    await ctx.db.patch(args.partnerId, patch);
    return null;
  },
});

/**
 * Deactivate a partner (internal)
 */
export const deactivatePartner = internalMutation({
  args: { partnerId: v.id('api_partners') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<null> => {
    await ctx.db.patch(args.partnerId, { isActive: false, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Deactivate a partner (public — admin only)
 */
export const deactivatePartnerPublic = mutation({
  args: { partnerId: v.id('api_partners') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { partnerId: Id<'api_partners'> }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .first();
    if (!user || user.role !== 'admin') throw new Error('Admin access required');

    await ctx.db.patch(args.partnerId, { isActive: false, updatedAt: Date.now() });
    return null;
  },
});
