/**
 * Internal Mutations for Onboarding Workflow
 * These mutations are used by the workflow to create and update data
 */

import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { generatePublicId } from '../types';

// ============================================
// LOOK MUTATIONS
// ============================================

/**
 * Create a pending look with items and nimaComment
 * Called by Step 1 of the workflow
 */
export const createPendingLook = internalMutation({
  args: {
    userId: v.id('users'),
    itemIds: v.array(v.id('items')),
    name: v.optional(v.string()),
    styleTags: v.array(v.string()),
    occasion: v.optional(v.string()),
    season: v.optional(v.string()),
    nimaComment: v.string(),
    targetGender: v.union(v.literal('male'), v.literal('female'), v.literal('unisex')),
    targetBudgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
  },
  returns: v.id('looks'),
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>;
      itemIds: Id<'items'>[];
      name?: string;
      styleTags: string[];
      occasion?: string;
      season?: string;
      nimaComment: string;
      targetGender: 'male' | 'female' | 'unisex';
      targetBudgetRange?: 'low' | 'mid' | 'premium';
    }
  ): Promise<Id<'looks'>> => {
    console.log(`[WORKFLOW:ONBOARDING] Creating pending look for user ${args.userId}`);

    // Calculate total price from items
    let totalPrice = 0;
    let currency = 'KES'; // Default currency

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item) {
        console.warn(`[WORKFLOW:ONBOARDING] Item not found: ${itemId}, skipping`);
        continue;
      }
      totalPrice += item.price;
      currency = item.currency;
    }

    const now = Date.now();
    const publicId = generatePublicId('look');

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: args.itemIds,
      totalPrice,
      currency,
      name: args.name,
      styleTags: args.styleTags,
      occasion: args.occasion,
      season: args.season,
      nimaComment: args.nimaComment,
      targetGender: args.targetGender,
      targetBudgetRange: args.targetBudgetRange,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending',
      createdBy: 'system',
      creatorUserId: args.userId,
      creationSource: 'chat',
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[WORKFLOW:ONBOARDING] Created pending look ${publicId} (${lookId})`);
    return lookId;
  },
});

/**
 * Update look generation status
 * Called by Step 2 of the workflow
 */
export const updateLookGenerationStatus = internalMutation({
  args: {
    lookId: v.id('looks'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      errorMessage?: string;
    }
  ): Promise<null> => {
    console.log(`[WORKFLOW:ONBOARDING] Updating look ${args.lookId} status to ${args.status}`);

    const look = await ctx.db.get(args.lookId);
    if (!look) {
      console.error(`[WORKFLOW:ONBOARDING] Look not found: ${args.lookId}`);
      return null;
    }

    await ctx.db.patch(args.lookId, {
      generationStatus: args.status,
      updatedAt: Date.now(),
    });

    if (args.errorMessage) {
      console.error(`[WORKFLOW:ONBOARDING] Look ${args.lookId} failed: ${args.errorMessage}`);
    }

    // Send push notification when look generation completes
    // Skip for system-created (onboarding) looks — those are handled by the batch onboarding notification
    if (args.status === 'completed' && look.creatorUserId && look.createdBy === 'user') {
      await ctx.scheduler.runAfter(0, internal.notifications.actions.sendLookReadyNotification, {
        userId: look.creatorUserId,
        lookId: args.lookId,
        lookName: look.name || 'Your New Look',
      });
    }

    return null;
  },
});

// ============================================
// LOOK IMAGE MUTATIONS
// ============================================

/**
 * Create look_image record with generated image
 * Called by Step 2 after image generation
 */
export const createLookImage = internalMutation({
  args: {
    lookId: v.id('looks'),
    userId: v.id('users'),
    userImageId: v.id('user_images'),
    storageId: v.id('_storage'),
    generationProvider: v.optional(v.string()),
  },
  returns: v.id('look_images'),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
      userId: Id<'users'>;
      userImageId: Id<'user_images'>;
      storageId: Id<'_storage'>;
      generationProvider?: string;
    }
  ): Promise<Id<'look_images'>> => {
    console.log(`[WORKFLOW:ONBOARDING] Creating look_image for look ${args.lookId}`);

    const now = Date.now();

    const lookImageId = await ctx.db.insert('look_images', {
      lookId: args.lookId,
      userId: args.userId,
      storageId: args.storageId,
      userImageId: args.userImageId,
      status: 'completed',
      generationProvider: args.generationProvider ?? 'google-gemini',
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[WORKFLOW:ONBOARDING] Created look_image ${lookImageId}`);
    return lookImageId;
  },
});

// Note: storeLookImage is defined in actions.ts because ctx.storage.store() 
// is only available in actions, not mutations

// ============================================
// WORKFLOW STATE MUTATIONS
// ============================================

/**
 * Mark workflow as started for a user
 * Prevents duplicate workflow starts
 */
export const markWorkflowStarted = internalMutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { userId: Id<'users'> }): Promise<boolean> => {
    // Check if user already has pending or completed looks
    const existingLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', args.userId))
      .first();

    if (existingLooks) {
      console.log(
        `[WORKFLOW:ONBOARDING] User ${args.userId} already has looks, skipping workflow start`
      );
      return false;
    }

    console.log(`[WORKFLOW:ONBOARDING] Workflow started for user ${args.userId}`);
    return true;
  },
});

/**
 * Get workflow progress for a user
 */
export const getWorkflowProgress = internalMutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.object({
    pendingCount: v.number(),
    completedCount: v.number(),
    failedCount: v.number(),
    totalCount: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'> }
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    totalCount: number;
  }> => {
    const allLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', args.userId))
      .collect();

    const pendingCount = allLooks.filter((l) => l.generationStatus === 'pending').length;
    const completedCount = allLooks.filter((l) => l.generationStatus === 'completed').length;
    const failedCount = allLooks.filter((l) => l.generationStatus === 'failed').length;

    return {
      pendingCount,
      completedCount,
      failedCount,
      totalCount: allLooks.length,
    };
  },
});

