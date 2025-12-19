/**
 * Workflow Manager Setup
 * Configures the Convex workflow component with retry policies
 */

import { WorkflowManager, vWorkflowId } from '@convex-dev/workflow';
import { components, internal } from '../_generated/api';
import { mutation, query, MutationCtx, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

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

    // Get existing item IDs to exclude from new looks
    const existingItemIds = new Set<string>();
    for (const look of existingLooks) {
      for (const itemId of look.itemIds) {
        existingItemIds.add(itemId);
      }
    }

    console.log(`[WORKFLOW:GENERATE_MORE] Starting workflow for user ${user._id}`);
    console.log(`[WORKFLOW:GENERATE_MORE] Excluding ${existingItemIds.size} items from previous looks`);

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
      availableItemsCount = allItems.filter((item) => !existingItemIds.has(item._id)).length;
    } else {
      const allItems = await ctx.db
        .query('items')
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
      availableItemsCount = allItems.filter((item) => !existingItemIds.has(item._id)).length;
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

