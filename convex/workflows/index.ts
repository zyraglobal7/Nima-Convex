/**
 * Workflow Manager Setup
 * Configures the Convex workflow component with retry policies
 */

import { WorkflowManager } from '@convex-dev/workflow';
import { components, internal } from '../_generated/api';
import { mutation, query, MutationCtx, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { calculateAvailableCredits } from '../types';

/**
 * Global workflow manager instance
 * Used for all workflow definitions and operations
 */
export const workflow = new WorkflowManager(components.workflow, {
  // Workpool options
  workpoolOptions: {
    // Limit parallel steps to avoid overwhelming the system
    maxParallelism: 10,
  },
});

// Re-export workflow types for convenience
export type { WorkflowId } from '@convex-dev/workflow';

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if the current user needs the onboarding workflow started
 * Returns true if user has no completed looks
 */
export const shouldStartOnboardingWorkflow = query({
  args: {},
  returns: v.object({
    shouldStart: v.boolean(),
    reason: v.optional(v.string()),
    pendingCount: v.number(),
    completedCount: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    shouldStart: boolean;
    reason?: string;
    pendingCount: number;
    completedCount: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        shouldStart: false,
        reason: 'Not authenticated',
        pendingCount: 0,
        completedCount: 0,
      };
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        shouldStart: false,
        reason: 'User not found',
        pendingCount: 0,
        completedCount: 0,
      };
    }

    // Check if user has any looks (pending or completed)
    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .collect();

    const pendingCount = userLooks.filter((l) => l.generationStatus === 'pending').length;
    const completedCount = userLooks.filter((l) => l.generationStatus === 'completed').length;
    const processingCount = userLooks.filter((l) => l.generationStatus === 'processing').length;

    // Don't start if there are already looks being generated or completed
    if (userLooks.length > 0) {
      return {
        shouldStart: false,
        reason:
          processingCount > 0
            ? 'Workflow in progress'
            : completedCount > 0
              ? 'Looks already generated'
              : 'Looks pending',
        pendingCount,
        completedCount,
      };
    }

    // Check if user has uploaded photos (required for image generation)
    const userImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (!userImages) {
      return {
        shouldStart: false,
        reason: 'No photos uploaded',
        pendingCount: 0,
        completedCount: 0,
      };
    }

    return {
      shouldStart: true,
      pendingCount: 0,
      completedCount: 0,
    };
  },
});

/**
 * Start the onboarding workflow for the current user
 * Creates personalized looks and generates try-on images
 */
export const startOnboardingWorkflow = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    workflowId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    success: boolean;
    workflowId?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if user already has looks
    const existingLook = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .first();

    if (existingLook) {
      return {
        success: false,
        error: 'Looks already exist or are being generated',
      };
    }

    // Check if user has uploaded photos
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (!userImage) {
      return {
        success: false,
        error: 'Please upload at least one photo first',
      };
    }

    console.log(`[WORKFLOW:ONBOARDING] Starting workflow for user ${user._id}`);

    // Start the workflow
    const workflowId = await workflow.start(
      ctx,
      internal.workflows.onboarding.onboardingWorkflow,
      { userId: user._id }
    );

    console.log(`[WORKFLOW:ONBOARDING] Workflow started with ID: ${workflowId}`);

    return {
      success: true,
      workflowId: workflowId as string,
    };
  },
});

/**
 * Start generating more looks for the current user
 * Generates 3 additional looks using items not in existing looks
 */
export const startGenerateMoreLooks = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    workflowId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    success: boolean;
    workflowId?: string;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if user has uploaded photos
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (!userImage) {
      return {
        success: false,
        error: 'Please upload at least one photo first',
      };
    }

    // Check if there's already a workflow in progress (pending or processing looks)
    const existingLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .collect();

    const pendingOrProcessing = existingLooks.filter(
      (l) => l.generationStatus === 'pending' || l.generationStatus === 'processing'
    );

    if (pendingOrProcessing.length > 0) {
      return {
        success: false,
        error: 'Looks are already being generated. Please wait for them to complete.',
      };
    }

    // Only exclude items from COMPLETED looks (not failed/pending ones)
    // Failed looks should allow their items to be reused
    const completedLooks = existingLooks.filter(
      (l) => l.generationStatus === 'completed'
    );
    
    const existingItemIds = new Set<string>();
    for (const look of completedLooks) {
      for (const itemId of look.itemIds) {
        existingItemIds.add(itemId);
      }
    }

    console.log(`[WORKFLOW:GENERATE_MORE] Starting workflow for user ${user._id}`);
    
    // Diagnostic: show look count breakdown by status
    const statusCounts = existingLooks.reduce((acc, l) => {
      const status = l.generationStatus || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[WORKFLOW:GENERATE_MORE] Total looks: ${existingLooks.length}, by status:`, statusCounts);
    console.log(`[WORKFLOW:GENERATE_MORE] Completed looks: ${completedLooks.length}`);
    console.log(`[WORKFLOW:GENERATE_MORE] Excluding ${existingItemIds.size} items from completed looks`);

    // Check if there are any items available after exclusions
    const userGender = user.gender === 'male' ? 'male' 
      : user.gender === 'female' ? 'female' 
      : undefined;
    
    // Count available items (simple check - not full AI selection logic)
    let availableItemsCount = 0;
    if (userGender) {
      const genderItems = await ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) =>
          q.eq('isActive', true).eq('gender', userGender)
        )
        .collect();
      const unisexItems = await ctx.db
        .query('items')
        .withIndex('by_active_and_gender', (q) =>
          q.eq('isActive', true).eq('gender', 'unisex')
        )
        .collect();
      const allItems = [...genderItems, ...unisexItems];
      
      // Diagnostic logging: show item counts before exclusion
      console.log(`[WORKFLOW:GENERATE_MORE] Found ${genderItems.length} ${userGender} items`);
      console.log(`[WORKFLOW:GENERATE_MORE] Found ${unisexItems.length} unisex items`);
      console.log(`[WORKFLOW:GENERATE_MORE] Total items before exclusion: ${allItems.length}`);
      
      availableItemsCount = allItems.filter((item) => !existingItemIds.has(item._id)).length;
      console.log(`[WORKFLOW:GENERATE_MORE] Items after exclusion: ${availableItemsCount}`);
    } else {
      const allItems = await ctx.db
        .query('items')
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      
      // Diagnostic logging for non-gendered query
      console.log(`[WORKFLOW:GENERATE_MORE] Found ${allItems.length} total active items (no gender filter)`);
      
      availableItemsCount = allItems.filter((item) => !existingItemIds.has(item._id)).length;
      console.log(`[WORKFLOW:GENERATE_MORE] Items after exclusion: ${availableItemsCount}`);
    }

    if (availableItemsCount === 0) {
      console.log(`[WORKFLOW:GENERATE_MORE] No items available after exclusions`);
      return {
        success: false,
        error: "You've seen all our current styles! Check back soon for new arrivals.",
      };
    }

    // Need at least 4 items to create a proper look (e.g., top, bottom, shoes, accessory/outerwear)
    const MIN_ITEMS_FOR_WORKFLOW = 4;
    if (availableItemsCount < MIN_ITEMS_FOR_WORKFLOW) {
      console.log(`[WORKFLOW:GENERATE_MORE] Only ${availableItemsCount} items available, need at least ${MIN_ITEMS_FOR_WORKFLOW}`);
      return {
        success: false,
        error: `We need more items in your size/style to create new looks. Only ${availableItemsCount} items available. Check back soon for new arrivals!`,
      };
    }

    console.log(`[WORKFLOW:GENERATE_MORE] ${availableItemsCount} items available after exclusions`);

    // --- CREDIT CHECK (3 credits for 3 looks) ---
    const creditResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
      userId: user._id,
      count: 3,
    });

    if (!creditResult.success) {
      return {
        success: false,
        error: 'insufficient_credits',
      };
    }

    // Start the workflow with exclusion list
    const workflowId = await workflow.start(
      ctx,
      internal.workflows.onboarding.generateMoreLooksWorkflow,
      { 
        userId: user._id,
        excludeItemIds: Array.from(existingItemIds),
      }
    );

    console.log(`[WORKFLOW:GENERATE_MORE] Workflow started with ID: ${workflowId}`);

    return {
      success: true,
      workflowId: workflowId as string,
    };
  },
});

/**
 * Start a single-item try-on generation
 * Generates a try-on image for a single item
 */
export const startItemTryOn = mutation({
  args: {
    itemId: v.id('items'),
    selectedSize: v.optional(v.string()),
    selectedColor: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    tryOnId: v.optional(v.id('item_try_ons')),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { 
      itemId: Id<'items'>; 
      selectedSize?: string; 
      selectedColor?: string; 
    }
  ): Promise<{
    success: boolean;
    tryOnId?: Id<'item_try_ons'>;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if item exists
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      return {
        success: false,
        error: 'Item not found or inactive',
      };
    }

    // Get user's primary image (use .first() to handle duplicate primaries gracefully)
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .first();

    if (!userImage) {
      return {
        success: false,
        error: 'Please upload a photo first to try on items',
      };
    }

    // Check if a try-on already exists
    const existingTryOn = await ctx.db
      .query('item_try_ons')
      .withIndex('by_item_and_user', (q) => q.eq('itemId', args.itemId).eq('userId', user._id))
      .first();

    if (existingTryOn) {
      // If completed, return existing (no credit charge for cached)
      if (existingTryOn.status === 'completed') {
        return {
          success: true,
          tryOnId: existingTryOn._id,
        };
      }

      // If processing, tell user to wait (no credit charge)
      if (existingTryOn.status === 'processing') {
        return {
          success: true,
          tryOnId: existingTryOn._id,
        };
      }

      // If pending, also just return (already charged when first created)
      if (existingTryOn.status === 'pending') {
        return {
          success: true,
          tryOnId: existingTryOn._id,
        };
      }

      // If failed, deduct a credit before retrying
      const retryResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
        userId: user._id,
        count: 1,
      });

      if (!retryResult.success) {
        return {
          success: false,
          error: 'insufficient_credits',
        };
      }

      const now = Date.now();
      await ctx.db.patch(existingTryOn._id, {
        status: 'pending',
        errorMessage: undefined,
        userImageId: userImage._id,
        selectedSize: args.selectedSize,
        selectedColor: args.selectedColor,
        updatedAt: now,
      });

      // Schedule the generation action
      await ctx.scheduler.runAfter(0, internal.workflows.actions.generateItemTryOnImage, {
        tryOnId: existingTryOn._id,
        itemId: args.itemId,
        userId: user._id,
      });

      return {
        success: true,
        tryOnId: existingTryOn._id,
      };
    }

    // --- CREDIT CHECK (new try-on, not cached) ---
    const creditResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
      userId: user._id,
      count: 1,
    });

    if (!creditResult.success) {
      return {
        success: false,
        error: 'insufficient_credits',
      };
    }

    // Create new try-on record
    const now = Date.now();
    const tryOnId = await ctx.db.insert('item_try_ons', {
      itemId: args.itemId,
      userId: user._id,
      userImageId: userImage._id,
      status: 'pending',
      selectedSize: args.selectedSize,
      selectedColor: args.selectedColor,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`[WORKFLOW:ITEM_TRYON] Starting try-on for item ${args.itemId}, tryOnId: ${tryOnId}`);

    // Schedule the generation action
    await ctx.scheduler.runAfter(0, internal.workflows.actions.generateItemTryOnImage, {
      tryOnId,
      itemId: args.itemId,
      userId: user._id,
    });

    return {
      success: true,
      tryOnId,
    };
  },
});

/**
 * Get workflow status for the current user
 */
export const getOnboardingWorkflowStatus = query({
  args: {},
  returns: v.object({
    hasLooks: v.boolean(),
    pendingCount: v.number(),
    processingCount: v.number(),
    completedCount: v.number(),
    failedCount: v.number(),
    totalCount: v.number(),
    isComplete: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    hasLooks: boolean;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    totalCount: number;
    isComplete: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        hasLooks: false,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        totalCount: 0,
        isComplete: false,
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        hasLooks: false,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        totalCount: 0,
        isComplete: false,
      };
    }

    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .collect();

    const pendingCount = userLooks.filter((l) => l.generationStatus === 'pending').length;
    const processingCount = userLooks.filter((l) => l.generationStatus === 'processing').length;
    const completedCount = userLooks.filter((l) => l.generationStatus === 'completed').length;
    const failedCount = userLooks.filter((l) => l.generationStatus === 'failed').length;

    return {
      hasLooks: userLooks.length > 0,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      totalCount: userLooks.length,
      isComplete: userLooks.length > 0 && pendingCount === 0 && processingCount === 0,
    };
  },
});

