'use node';

/**
 * Chat Actions
 * Actions for AI-driven chat workflows including look generation and image creation
 */

import { action, ActionCtx } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Generate images for looks created from chat
 * This is a public action that can be called from the client
 * Generates images for multiple looks in sequence
 */
export const generateChatLookImages = action({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.object({
    success: v.boolean(),
    results: v.array(
      v.object({
        lookId: v.id('looks'),
        success: v.boolean(),
        error: v.optional(v.string()),
      })
    ),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { lookIds: Id<'looks'>[] }
  ): Promise<{
    success: boolean;
    results: Array<{
      lookId: Id<'looks'>;
      success: boolean;
      error?: string;
    }>;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        results: [],
      };
    }

    // Get user ID from identity
    const user = await ctx.runQuery(api.users.queries.getUserByWorkosId, {
      workosUserId: identity.subject,
    });

    if (!user) {
      return {
        success: false,
        results: [],
      };
    }

    console.log(`[CHAT:GENERATE_IMAGES] Generating images for ${args.lookIds.length} looks`);

    const results: Array<{
      lookId: Id<'looks'>;
      success: boolean;
      error?: string;
    }> = [];

    // Generate images for each look
    for (const lookId of args.lookIds) {
      console.log(`[CHAT:GENERATE_IMAGES] Processing look ${lookId}...`);

      try {
        const result = await ctx.runAction(
          internal.workflows.actions.generateLookImage,
          { lookId, userId: user._id }
        );

        if (result.success) {
          console.log(`[CHAT:GENERATE_IMAGES] Successfully generated image for look ${lookId}`);
          results.push({ lookId, success: true });
        } else {
          console.error(`[CHAT:GENERATE_IMAGES] Failed to generate image for look ${lookId}: ${result.error}`);
          results.push({ lookId, success: false, error: result.error });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CHAT:GENERATE_IMAGES] Error generating image for look ${lookId}:`, error);
        results.push({ lookId, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[CHAT:GENERATE_IMAGES] Complete: ${successCount}/${args.lookIds.length} succeeded`);

    return {
      success: successCount > 0,
      results,
    };
  },
});

