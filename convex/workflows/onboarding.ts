/**
 * Onboarding Workflow Definition
 * 
 * This workflow generates 3 personalized looks for new users after they complete onboarding.
 * 
 * Steps:
 * 1. Curate Looks: AI selects multiple items and creates 3 complete outfits with nimaComment
 * 2. Generate Images: Use Google GenAI with user photo + item images as references to generate try-on images
 * 3. Finish: Looks are ready for the user to view on discover page
 */

import { v } from 'convex/values';
import { workflow } from './index';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * Main onboarding workflow
 * Triggered when a user visits /discover and has no completed looks
 */
export const onboardingWorkflow = workflow.define({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<void> => {
    const { userId } = args;
    // Call the shared workflow logic with no exclusions
    await runLookGenerationWorkflow(ctx, userId, [], 'ONBOARDING');
  },
});

/**
 * Generate More Looks Workflow
 * Triggered when user clicks "Generate more looks" on discover page
 * Excludes items from previous looks to ensure variety
 */
export const generateMoreLooksWorkflow = workflow.define({
  args: {
    userId: v.id('users'),
    excludeItemIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { userId, excludeItemIds } = args;
    // Call the shared workflow logic with exclusions
    await runLookGenerationWorkflow(ctx, userId, excludeItemIds, 'GENERATE_MORE');
  },
});

/**
 * Shared workflow logic for generating looks
 * Used by both onboarding and "generate more" flows
 */
async function runLookGenerationWorkflow(
  ctx: Parameters<Parameters<typeof workflow.define>[0]['handler']>[0],
  userId: Id<'users'>,
  excludeItemIds: string[],
  workflowName: string
): Promise<void> {
  const workflowStartTime = Date.now();

  console.log(`[WORKFLOW:${workflowName}] ========================================`);
  console.log(`[WORKFLOW:${workflowName}] Starting workflow for user ${userId}`);
  if (excludeItemIds.length > 0) {
    console.log(`[WORKFLOW:${workflowName}] Excluding ${excludeItemIds.length} items from previous looks`);
  }
  console.log(`[WORKFLOW:${workflowName}] ========================================`);

  // ========================================
  // STEP 1: Curate Personalized Looks
  // ========================================
  console.log(`[WORKFLOW:${workflowName}] Step 1: Curating personalized looks...`);

  // Use AI to select items and create look compositions
  const lookCompositions = await ctx.runAction(
    internal.workflows.actions.selectItemsForLooks,
    { userId, excludeItemIds },
    { retry: true }
  );

  console.log(`[WORKFLOW:${workflowName}] AI created ${lookCompositions.length} look compositions`);

  // Get user profile for look creation
  const userProfile = await ctx.runQuery(internal.workflows.queries.getUserForWorkflow, {
    userId,
  });

  if (!userProfile) {
    console.error(`[WORKFLOW:${workflowName}] User not found: ${userId}`);
    return;
  }

  // Map user gender to item gender for looks
  const targetGender: 'male' | 'female' | 'unisex' =
    userProfile.gender === 'male'
      ? 'male'
      : userProfile.gender === 'female'
        ? 'female'
        : 'unisex';

  // Create looks in the database with pending status
  const createdLookIds: Id<'looks'>[] = [];

  for (const lookComp of lookCompositions) {
    // Convert string IDs to proper Id types
    const itemIds = lookComp.itemIds.map((id) => id as Id<'items'>);

    const lookId: Id<'looks'> = await ctx.runMutation(
      internal.workflows.mutations.createPendingLook,
      {
        userId,
        itemIds,
        name: lookComp.name,
        styleTags: lookComp.styleTags,
        occasion: lookComp.occasion,
        nimaComment: lookComp.nimaComment,
        targetGender,
        targetBudgetRange: userProfile.budgetRange,
      }
    );

    createdLookIds.push(lookId);
    console.log(`[WORKFLOW:${workflowName}] Created pending look: ${lookId}`);
  }

  console.log(`[WORKFLOW:${workflowName}] Step 1 complete: ${createdLookIds.length} looks created`);

  // ========================================
  // STEP 2: Generate Images for Each Look (PARALLEL)
  // ========================================
  console.log(`[WORKFLOW:${workflowName}] Step 2: Generating images for ${createdLookIds.length} looks in PARALLEL...`);
  const imageGenStartTime = Date.now();

  // Process all looks in parallel for faster generation
  const results = await Promise.all(
    createdLookIds.map((lookId) => {
      console.log(`[WORKFLOW:${workflowName}] Starting parallel generation for look ${lookId}...`);
      return ctx.runAction(
        internal.workflows.actions.generateLookImage,
        { lookId, userId },
        { retry: true }
      );
    })
  );

  // Count successes and failures
  let successCount = 0;
  let failureCount = 0;

  results.forEach((result, index) => {
    const lookId = createdLookIds[index];
    if (result.success) {
      successCount++;
      console.log(`[WORKFLOW:${workflowName}] Successfully generated image for look ${lookId}`);
    } else {
      failureCount++;
      console.error(`[WORKFLOW:${workflowName}] Failed to generate image for look ${lookId}: ${result.error}`);
    }
  });

  const imageGenTime = Date.now() - imageGenStartTime;
  console.log(
    `[WORKFLOW:${workflowName}] Step 2 complete: ${successCount} succeeded, ${failureCount} failed (parallel generation took ${imageGenTime}ms)`
  );

  // ========================================
  // STEP 3: Finish Workflow & Send Notification
  // ========================================
  const totalTime = Date.now() - workflowStartTime;
  console.log(`[WORKFLOW:${workflowName}] ========================================`);
  console.log(`[WORKFLOW:${workflowName}] Workflow complete for user ${userId}`);
  console.log(`[WORKFLOW:${workflowName}] Total time: ${totalTime}ms`);
  console.log(`[WORKFLOW:${workflowName}] Looks created: ${createdLookIds.length}`);
  console.log(`[WORKFLOW:${workflowName}] Images generated: ${successCount}/${createdLookIds.length}`);
  console.log(`[WORKFLOW:${workflowName}] ========================================`);

  // Send push notification for onboarding completion (first looks ready)
  if (workflowName === 'ONBOARDING' && successCount > 0) {
    await ctx.runAction(
      internal.notifications.actions.sendOnboardingLooksReadyNotification,
      { userId, successCount },
    );
  }
}

