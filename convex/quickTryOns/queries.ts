import { query, internalQuery, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Get a quick try-on by ID (polling)
 */
export const getQuickTryOn = query({
  args: {
    quickTryOnId: v.id('quick_try_ons'),
  },
  returns: v.union(
    v.object({
      _id: v.id('quick_try_ons'),
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      ),
      resultUrl: v.union(v.string(), v.null()),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { quickTryOnId: Id<'quick_try_ons'> }
  ): Promise<{
    _id: Id<'quick_try_ons'>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    resultUrl: string | null;
    errorMessage?: string;
    createdAt: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) return null;

    const tryOn = await ctx.db.get(args.quickTryOnId);
    if (!tryOn || tryOn.userId !== user._id) return null;

    let resultUrl: string | null = null;
    if (tryOn.resultStorageId) {
      resultUrl = await ctx.storage.getUrl(tryOn.resultStorageId);
    }

    return {
      _id: tryOn._id,
      status: tryOn.status,
      resultUrl,
      errorMessage: tryOn.errorMessage,
      createdAt: tryOn.createdAt,
    };
  },
});

/**
 * Internal query to get quick try-on record (for workflow)
 */
export const getQuickTryOnInternal = internalQuery({
  args: {
    quickTryOnId: v.id('quick_try_ons'),
  },
  returns: v.union(
    v.object({
      _id: v.id('quick_try_ons'),
      userId: v.id('users'),
      userImageId: v.id('user_images'),
      capturedItemStorageId: v.id('_storage'),
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
    args: { quickTryOnId: Id<'quick_try_ons'> }
  ): Promise<{
    _id: Id<'quick_try_ons'>;
    userId: Id<'users'>;
    userImageId: Id<'user_images'>;
    capturedItemStorageId: Id<'_storage'>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  } | null> => {
    const tryOn = await ctx.db.get(args.quickTryOnId);
    if (!tryOn) return null;
    return {
      _id: tryOn._id,
      userId: tryOn.userId,
      userImageId: tryOn.userImageId,
      capturedItemStorageId: tryOn.capturedItemStorageId,
      status: tryOn.status,
    };
  },
});
