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
    const workflowStartTime = Date.now();

    console.log(`[WORKFLOW:ONBOARDING] ========================================`);
    console.log(`[WORKFLOW:ONBOARDING] Starting workflow for user ${userId}`);
    console.log(`[WORKFLOW:ONBOARDING] ========================================`);

    // ========================================
    // STEP 1: Curate Personalized Looks
    // ========================================
    console.log(`[WORKFLOW:ONBOARDING] Step 1: Curating personalized looks...`);

    // Use AI to select items and create look compositions
    const lookCompositions = await ctx.runAction(
      internal.workflows.actions.selectItemsForLooks,
      { userId },
      { retry: true }
    );

    console.log(`[WORKFLOW:ONBOARDING] AI created ${lookCompositions.length} look compositions`);

    // Get user profile for look creation
    const userProfile = await ctx.runQuery(internal.workflows.queries.getUserForWorkflow, {
      userId,
    });

    if (!userProfile) {
      console.error(`[WORKFLOW:ONBOARDING] User not found: ${userId}`);
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
      console.log(`[WORKFLOW:ONBOARDING] Created pending look: ${lookId}`);
    }

    console.log(`[WORKFLOW:ONBOARDING] Step 1 complete: ${createdLookIds.length} looks created`);

    // ========================================
    // STEP 2: Generate Images for Each Look
    // ========================================
    console.log(`[WORKFLOW:ONBOARDING] Step 2: Generating images for looks...`);

    let successCount = 0;
    let failureCount = 0;

    // Process each look one at a time to avoid overwhelming the image generation API
    for (const lookId of createdLookIds) {
      console.log(`[WORKFLOW:ONBOARDING] Processing look ${lookId}...`);

      const result = await ctx.runAction(
        internal.workflows.actions.generateLookImage,
        { lookId, userId },
        { retry: true }
      );

      if (result.success) {
        successCount++;
        console.log(`[WORKFLOW:ONBOARDING] Successfully generated image for look ${lookId}`);
      } else {
        failureCount++;
        console.error(`[WORKFLOW:ONBOARDING] Failed to generate image for look ${lookId}: ${result.error}`);
      }
    }

    console.log(
      `[WORKFLOW:ONBOARDING] Step 2 complete: ${successCount} succeeded, ${failureCount} failed`
    );

    // ========================================
    // STEP 3: Finish Workflow
    // ========================================
    const totalTime = Date.now() - workflowStartTime;
    console.log(`[WORKFLOW:ONBOARDING] ========================================`);
    console.log(`[WORKFLOW:ONBOARDING] Workflow complete for user ${userId}`);
    console.log(`[WORKFLOW:ONBOARDING] Total time: ${totalTime}ms`);
    console.log(`[WORKFLOW:ONBOARDING] Looks created: ${createdLookIds.length}`);
    console.log(`[WORKFLOW:ONBOARDING] Images generated: ${successCount}/${createdLookIds.length}`);
    console.log(`[WORKFLOW:ONBOARDING] ========================================`);
  },
});

