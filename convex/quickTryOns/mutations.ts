import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { generateShareToken, generatePublicId } from '../types';

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

/**
 * Save a quick try-on result to a "Tried On Looks" lookbook
 */
export const saveQuickTryOnToLookbook = mutation({
  args: {
    quickTryOnId: v.id('quick_try_ons'),
  },
  returns: v.object({
    success: v.boolean(),
    lookbookId: v.optional(v.id('lookbooks')),
    message: v.string(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { quickTryOnId: Id<'quick_try_ons'> }
  ): Promise<{
    success: boolean;
    lookbookId?: Id<'lookbooks'>;
    message: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();
    if (!user) throw new Error('User not found');

    const tryOn = await ctx.db.get(args.quickTryOnId);
    if (!tryOn) throw new Error('Try-on not found');
    if (tryOn.userId !== user._id) throw new Error('Not authorized');
    if (tryOn.status !== 'completed' || !tryOn.resultStorageId) {
      throw new Error('Try-on is not completed');
    }

    // Find or create "Tried On Looks" lookbook
    let lookbook = await ctx.db
      .query('lookbooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('name'), 'Tried On Looks'))
      .first();

    if (!lookbook) {
      const now = Date.now();
      const lookbookId = await ctx.db.insert('lookbooks', {
        userId: user._id,
        name: 'Tried On Looks',
        description: 'My virtual try-on history',
        isPublic: false,
        shareToken: generateShareToken(),
        itemCount: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      lookbook = await ctx.db.get(lookbookId);
    }

    if (!lookbook) throw new Error('Failed to create lookbook');

    const now = Date.now();

    // Create a Look to represent this try-on
    const lookId = await ctx.db.insert('looks', {
      publicId: generatePublicId('look'),
      itemIds: [],
      totalPrice: 0,
      currency: 'KES',
      name: 'Quick Try-On',
      styleTags: [],
      targetGender: 'unisex' as const,
      isActive: true,
      isFeatured: false,
      isPublic: false,
      sharedWithFriends: false,
      viewCount: 0,
      saveCount: 1,
      generationStatus: 'completed',
      status: 'saved',
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'apparel',
      createdAt: now,
      updatedAt: now,
    });

    // Link try-on image to the look
    await ctx.db.insert('look_images', {
      lookId,
      userId: user._id,
      storageId: tryOn.resultStorageId,
      userImageId: tryOn.userImageId,
      status: 'completed',
      generationProvider: 'google-gemini',
      createdAt: now,
      updatedAt: now,
    });

    // Check not already saved (belt-and-suspenders)
    const existing = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', lookbook!._id))
      .collect();

    await ctx.db.insert('lookbook_items', {
      lookbookId: lookbook._id,
      userId: user._id,
      itemType: 'look',
      lookId,
      sortOrder: existing.length,
      createdAt: now,
    });

    await ctx.db.patch(lookbook._id, {
      itemCount: lookbook.itemCount + 1,
      updatedAt: now,
    });

    return { success: true, lookbookId: lookbook._id, message: 'Saved to Tried On Looks' };
  },
});
