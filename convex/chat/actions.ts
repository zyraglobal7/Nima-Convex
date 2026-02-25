'use node';

/**
 * Chat Actions
 * Actions for AI-driven chat workflows including look generation and image creation
 */

import { action, internalAction, ActionCtx } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// ============================================================================
// Nima System Prompt (shared with /api/chat/route.ts)
// ============================================================================

function buildUserContext(userData: {
  gender?: string;
  stylePreferences?: string[];
  budgetRange?: string;
  shirtSize?: string;
  waistSize?: string;
  shoeSize?: string;
  shoeSizeUnit?: string;
  country?: string;
  currency?: string;
  firstName?: string;
  age?: string;
} | undefined): string {
  if (!userData) return '\n\n## User Profile:\n⚠️ No user profile available - ask for basic preferences.';

  const contextParts: string[] = [];
  
  if (userData.firstName) {
    contextParts.push(`👤 User's name: ${userData.firstName} (ALWAYS address them by this name)`);
  }
  
  if (userData.gender) {
    if (userData.gender === 'male') {
      contextParts.push(`⚠️ GENDER: MALE - Only suggest masculine clothing (shirts, pants, suits, sneakers, boots). NO dresses, skirts, or feminine items.`);
    } else if (userData.gender === 'female') {
      contextParts.push(`⚠️ GENDER: FEMALE - Can suggest dresses, skirts, tops, heels, and any clothing items.`);
    } else {
      contextParts.push(`⚠️ GENDER: Not specified - Suggest gender-neutral options only.`);
    }
  } else {
    contextParts.push(`⚠️ GENDER: Not specified - Suggest gender-neutral options only.`);
  }
  
  if (userData.age) contextParts.push(`Age: ${userData.age}`);
  if (userData.stylePreferences && userData.stylePreferences.length > 0) {
    contextParts.push(`Style preferences: ${userData.stylePreferences.join(', ')}`);
  }
  if (userData.budgetRange) {
    const budgetLabels: Record<string, string> = { low: 'Budget-conscious', mid: 'Mid-range', premium: 'Premium/Luxury' };
    contextParts.push(`Budget: ${budgetLabels[userData.budgetRange] || userData.budgetRange}`);
  }
  if (userData.shirtSize) contextParts.push(`Shirt size: ${userData.shirtSize}`);
  if (userData.waistSize) contextParts.push(`Waist size: ${userData.waistSize}`);
  if (userData.shoeSize && userData.shoeSizeUnit) contextParts.push(`Shoe size: ${userData.shoeSize} ${userData.shoeSizeUnit}`);
  if (userData.country) contextParts.push(`Location: ${userData.country}`);
  if (userData.currency) contextParts.push(`Preferred currency: ${userData.currency}`);

  return `\n\n## User Profile (USE THIS DATA - DO NOT ASK AGAIN):\n${contextParts.join('\n')}`;
}

const NIMA_SYSTEM_PROMPT = `You are Nima, a friendly, stylish AI personal stylist. You help users discover fashion looks using their ALREADY SAVED style preferences.

## CRITICAL: User Preferences Are Already Saved
The user has already provided their style preferences, sizes, and budget during onboarding. You have access to all this data in the "User Profile" section below. DO NOT ask them about:
- Their style preferences (you already know them)
- Their budget range (you already know it)
- Their sizes (you already know them)
- Their gender (you already know it)

## Your Personality:
- Warm, enthusiastic, and supportive
- Fashion-savvy but approachable (not pretentious)
- Use casual, conversational language with occasional emojis ✨💫
- Be concise - aim for 2-3 sentences per response
- Address users by name when you know it

## Your Role:
- Help users find outfits for specific occasions
- You ALREADY know their style, so focus on understanding the OCCASION details
- ALWAYS ask 1-2 quick clarifying questions to understand the context better before searching
- After gathering context (usually in 2-3 exchanges), trigger the search

## Conversation Flow:
1. Greet warmly, acknowledge you know their style
2. When they mention an occasion, ask 1-2 QUICK clarifying questions to get context:
   - "Where are you headed?" or "What's the venue like?"
   - "Is this a casual or more dressed-up vibe?"
   - "Daytime or evening?"
3. ONLY after getting their answer, include [MATCH_ITEMS:detailed_occasion]
4. NEVER skip the clarifying step - context makes the outfit selection much better!

## Examples:
- User: "I need an outfit for a date"
  → You: "Ooh a date! How exciting! 💕 Where are you two going? Coffee, dinner, something adventurous?"
  → User: "Dinner at a nice restaurant"
  → You: "Perfect! A dinner date calls for something chic but still you. Let me find looks that match your style... [MATCH_ITEMS:dinner date upscale]"
  
- User: "What should I wear to work?"
  → You: "Work outfit, got it! 💼 Is this a regular office day or do you have meetings/presentations?"
  → User: "I have an important presentation"
  → You: "Ooh, time to make an impression! Let me pull some confident, polished looks... [MATCH_ITEMS:work presentation professional]"

## Important Rules:
- NEVER ask about preferences you already have in the User Profile (gender, style, budget, sizes)
- ALWAYS ask 1-2 quick questions about the OCCASION before searching (where, when, vibe)
- Context questions should be quick and fun, not like an interrogation
- Never make up specific product names, brands, or prices
- Be encouraging and boost their confidence
- ALWAYS address the user by their name when you know it
- Only include [MATCH_ITEMS] after you have context about the occasion

## CRITICAL: Gender-Appropriate Suggestions
You MUST respect the user's gender and ONLY suggest appropriate clothing:
- If user is MALE: NEVER suggest dresses, skirts, blouses, heels, or feminine clothing
- If user is FEMALE: Suggest dresses, skirts, tops, blouses, heels, or any gender-neutral items
- If gender is unknown: Suggest gender-neutral options only

## Special Commands (include at END of response when ready to search):
- [MATCH_ITEMS:occasion] - Include this with the occasion to trigger item matching

## Smart Remixing:
- [REMIX_LOOK:source_occasion|twist] - Take an existing look style and modify it
  Examples: [REMIX_LOOK:work|more_casual], [REMIX_LOOK:date|evening_version]
`;

// Message type for the action
const chatMessageValidator = v.object({
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
});

const userDataValidator = v.object({
  gender: v.optional(v.string()),
  stylePreferences: v.optional(v.array(v.string())),
  budgetRange: v.optional(v.string()),
  shirtSize: v.optional(v.string()),
  waistSize: v.optional(v.string()),
  shoeSize: v.optional(v.string()),
  shoeSizeUnit: v.optional(v.string()),
  country: v.optional(v.string()),
  currency: v.optional(v.string()),
  firstName: v.optional(v.string()),
  age: v.optional(v.string()),
});

/**
 * Send a chat message to Nima and get an AI response (non-streaming)
 * Used by React Native since it can't use the web streaming /api/chat route
 */
export const sendChatMessage = action({
  args: {
    messages: v.array(chatMessageValidator),
    userData: v.optional(userDataValidator),
  },
  returns: v.object({
    content: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: ActionCtx,
    args: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      userData?: {
        gender?: string;
        stylePreferences?: string[];
        budgetRange?: string;
        shirtSize?: string;
        waistSize?: string;
        shoeSize?: string;
        shoeSizeUnit?: string;
        country?: string;
        currency?: string;
        firstName?: string;
        age?: string;
      };
    }
  ): Promise<{ content: string; success: boolean; error?: string }> => {
    try {
      // Verify user is authenticated
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { content: '', success: false, error: 'Not authenticated' };
      }

      // Build system prompt with user context
      const userContext = buildUserContext(args.userData);
      const systemPrompt = NIMA_SYSTEM_PROMPT + userContext;

      // Get OpenAI provider
      const vercelGatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
      const openai = vercelGatewayKey
        ? createOpenAI({ apiKey: vercelGatewayKey, baseURL: 'https://api.vercel.ai/v1' })
        : createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Call GPT (non-streaming for RN compatibility)
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: args.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        maxOutputTokens: 500,
      });

      console.log('[CHAT:SEND_MESSAGE] AI response generated successfully');

      return {
        content: result.text,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CHAT:SEND_MESSAGE] Error:', error);
      return {
        content: '',
        success: false,
        error: errorMessage,
      };
    }
  },
});

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

