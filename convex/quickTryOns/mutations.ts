import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * Generate an upload URL for a quick try-on item capture
 * Called before uploading the camera-captured item photo
 */
export const generateQuickCaptureUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a quick try-on record and schedule image generation
 * Uses the user's primary image + camera-captured item photo
 */
export const createQuickTryOn = mutation({
  args: {
    capturedItemStorageId: v.id('_storage'),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      quickTryOnId: v.id('quick_try_ons'),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx: MutationCtx,
    args: { capturedItemStorageId: Id<'_storage'> }
  ): Promise<
    | { success: true; quickTryOnId: Id<'quick_try_ons'> }
    | { success: false; error: string }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get user's primary image
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .first();

    if (!userImage) {
      return { success: false, error: 'No primary photo found. Please upload a photo first in your profile.' };
    }

    // Deduct 1 credit
    const creditResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
      userId: user._id,
      count: 1,
    });

    if (!creditResult.success) {
      // Clean up uploaded capture if credit check fails
      await ctx.storage.delete(args.capturedItemStorageId);
      return { success: false, error: 'insufficient_credits' };
    }

    const now = Date.now();
    const quickTryOnId = await ctx.db.insert('quick_try_ons', {
      userId: user._id,
      userImageId: userImage._id,
      capturedItemStorageId: args.capturedItemStorageId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Schedule image generation
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateQuickTryOnImage, {
      quickTryOnId,
      userId: user._id,
    });

    return { success: true, quickTryOnId };
  },
});

/**
 * Update quick try-on status (internal - called by workflow)
 */
export const updateQuickTryOnStatus = internalMutation({
  args: {
    quickTryOnId: v.id('quick_try_ons'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    resultStorageId: v.optional(v.id('_storage')),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      quickTryOnId: Id<'quick_try_ons'>;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
    }
  ): Promise<null> => {
    const tryOn = await ctx.db.get(args.quickTryOnId);
    if (!tryOn) throw new Error('Quick try-on not found');

    const updates: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      updatedAt: number;
      resultStorageId?: Id<'_storage'>;
      errorMessage?: string;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.resultStorageId !== undefined) updates.resultStorageId = args.resultStorageId;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.quickTryOnId, updates);
    return null;
  },
});
