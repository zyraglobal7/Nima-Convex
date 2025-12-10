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

