'use node';

/**
 * Chat Actions
 * Actions for AI-driven chat workflows including look generation and image creation
 */

import { action, internalAction, ActionCtx } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

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

/**
 * AI Fallback for outfit composition
 * Uses GPT to intelligently compose outfits when rule-based matching fails or needs creativity
 */
export const composeOutfitWithAI = internalAction({
  args: {
    userId: v.id('users'),
    occasion: v.optional(v.string()),
    context: v.optional(v.string()),
    availableItemIds: v.array(v.string()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      outfits: v.array(
        v.object({
          itemIds: v.array(v.string()),
          name: v.string(),
          occasion: v.string(),
          nimaComment: v.string(),
        })
      ),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx: ActionCtx,
    args: {
      userId: Id<'users'>;
      occasion?: string;
      context?: string;
      availableItemIds: string[];
    }
  ): Promise<
    | {
        success: true;
        outfits: Array<{
          itemIds: string[];
          name: string;
          occasion: string;
          nimaComment: string;
        }>;
      }
    | { success: false; error: string }
  > => {
    console.log('[CHAT:AI_COMPOSE] Starting AI outfit composition');

    try {
      // Get user profile
      const user = await ctx.runQuery(api.users.queries.getUser, {
        userId: args.userId,
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get available items
      const items: Array<{
        _id: string;
        name: string;
        category: string;
        subcategory?: string;
        colors: string[];
        tags: string[];
        occasion?: string[];
        price: number;
        currency: string;
      }> = [];

      for (const itemId of args.availableItemIds) {
        const item = await ctx.runQuery(api.items.queries.getItem, {
          itemId: itemId as Id<'items'>,
        });
        if (item) {
          items.push({
            _id: item._id,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            colors: item.colors,
            tags: item.tags,
            occasion: item.occasion,
            price: item.price,
            currency: item.currency,
          });
        }
      }

      if (items.length < 2) {
        return { success: false, error: 'Not enough items available' };
      }

      // Initialize OpenAI using AI SDK
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Build AI prompt
      const systemPrompt = `You are Nima, an expert fashion stylist with a fun, energetic personality.
Your task is to create 1-3 unique, stylish outfit combinations for a user based on their preferences.

User Profile:
- Gender preference: ${user.gender || 'not specified'}
- Style preferences: ${user.stylePreferences?.join(', ') || 'casual'}
- Budget range: ${user.budgetRange || 'mid'}
- Name: ${user.firstName || 'friend'}
${args.occasion ? `- Requested occasion: ${args.occasion}` : ''}
${args.context ? `- Additional context: ${args.context}` : ''}

Available Items (use these item IDs exactly):
${items.map((item) => `- ID: ${item._id}, Name: "${item.name}", Category: ${item.category}${item.subcategory ? `, Subcategory: ${item.subcategory}` : ''}, Colors: ${item.colors.join(', ')}, Tags: ${item.tags.join(', ')}, Price: ${item.price} ${item.currency}`).join('\n')}

CRITICAL RULES:
1. SETS/OUTFITS: If an item name contains "set", "suit", "matching", "and pants", "and trouser" - it's a COMPLETE OUTFIT. Only add shoes/accessories to it, NEVER add another top or bottom.
2. DRESSES: A dress is a complete outfit. Only add shoes, bags, jewelry, or accessories.
3. FORMALITY COHERENCE:
   - Casual items (sweatpants, hoodies, sneakers) go together
   - Formal items (dress shirts, dress pants, heels, boots) go together
   - DON'T mix formal shoes with casual sweatpants
   - DON'T add a kimono or cardigan over a complete set
4. GENDER RULES:
   ${user.gender === 'male' ? '- User is MALE: NEVER include dresses, skirts, blouses, heels.' : ''}
   ${user.gender === 'female' ? '- User is FEMALE: All items are allowed.' : ''}
5. NO DUPLICATE CATEGORIES: Only ONE top, ONE bottom, ONE pair of shoes per look.
6. LIMIT ITEMS: Each outfit should have 2-4 items max. Keep it clean and stylish.
7. OCCASION MATCHING: All items in a look should fit the requested occasion/venue.`;

      // Use AI SDK's generateObject for structured output
      const outfitSchema = z.object({
        outfits: z.array(
          z.object({
            itemIds: z.array(z.string()).describe('Array of item IDs from the available items'),
            name: z.string().describe('Creative name for the look'),
            occasion: z.string().describe('The occasion this outfit is best for'),
            nimaComment: z.string().describe('A short, fun comment about why this outfit works'),
          })
        ).min(1).max(3),
      });

      const { object: result } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: outfitSchema,
        system: systemPrompt,
        prompt: `Create stylish outfit combinations${args.occasion ? ` for ${args.occasion}` : ''}. Use ONLY the item IDs from the available items list.`,
        temperature: 0.7,
      });

      console.log('[CHAT:AI_COMPOSE] AI response:', JSON.stringify(result));

      const outfits = result.outfits;

      if (!outfits || outfits.length === 0) {
        return { success: false, error: 'No outfits generated' };
      }

      // Validate item IDs exist
      const validItemIds = new Set(items.map((i) => i._id));
      const validatedOutfits = outfits
        .filter((outfit) => {
          if (!outfit.itemIds || outfit.itemIds.length === 0) return false;
          return outfit.itemIds.every((id) => validItemIds.has(id));
        })
        .map((outfit) => ({
          itemIds: outfit.itemIds,
          name: outfit.name || 'Stylish Look',
          occasion: outfit.occasion || args.occasion || 'casual',
          nimaComment: outfit.nimaComment || 'A great look curated just for you!',
        }));

      if (validatedOutfits.length === 0) {
        return { success: false, error: 'No valid outfits generated' };
      }

      console.log(`[CHAT:AI_COMPOSE] Generated ${validatedOutfits.length} valid outfits`);

      return {
        success: true,
        outfits: validatedOutfits,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CHAT:AI_COMPOSE] Error:', error);
      return { success: false, error: errorMessage };
    }
  },
});

