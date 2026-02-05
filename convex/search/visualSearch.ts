'use node';

/**
 * Visual Search Action
 * Allows users to upload an image and find similar items from the catalog
 */

import { action, ActionCtx } from '../_generated/server';
import { api } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Schema for fashion item attributes extracted from image
const FashionAttributesSchema = z.object({
  category: z.enum(['top', 'bottom', 'dress', 'outfit', 'outerwear', 'shoes', 'accessory', 'bag', 'jewelry']).optional(),
  colors: z.array(z.string()).describe('Primary colors in the item'),
  style: z.array(z.string()).describe('Style descriptors like casual, formal, elegant, sporty'),
  gender: z.enum(['male', 'female', 'unisex']).optional(),
  description: z.string().describe('Brief description of the fashion item'),
});

/**
 * Analyze an uploaded image and find similar items in the catalog
 */
export const findSimilarItems = action({
  args: {
    imageStorageId: v.id('_storage'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    extractedAttributes: v.optional(v.object({
      category: v.optional(v.string()),
      colors: v.array(v.string()),
      style: v.array(v.string()),
      gender: v.optional(v.string()),
      description: v.string(),
    })),
    items: v.array(v.object({
      _id: v.id('items'),
      publicId: v.string(),
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.string(),
      price: v.number(),
      currency: v.string(),
      colors: v.array(v.string()),
      primaryImageUrl: v.union(v.string(), v.null()),
      matchScore: v.number(),
    })),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { imageStorageId: Id<'_storage'> }
  ): Promise<{
    success: boolean;
    error?: string;
    extractedAttributes?: {
      category?: string;
      colors: string[];
      style: string[];
      gender?: string;
      description: string;
    };
    items: Array<{
      _id: Id<'items'>;
      publicId: string;
      name: string;
      brand?: string;
      category: string;
      price: number;
      currency: string;
      colors: string[];
      primaryImageUrl: string | null;
      matchScore: number;
    }>;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
        items: [],
      };
    }

    // Get the image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.imageStorageId);
    if (!imageUrl) {
      return {
        success: false,
        error: 'Image not found',
        items: [],
      };
    }

    console.log('[VISUAL_SEARCH] Analyzing image...');

    try {
      // Initialize OpenAI
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured',
          items: [],
        };
      }

      const openai = createOpenAI({ apiKey: openaiApiKey });

      // Use AI to analyze the image and extract fashion attributes
      const { object: attributes } = await generateObject({
        model: openai('gpt-4o'),
        schema: FashionAttributesSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this fashion image and extract the following attributes:
                - Category (top, bottom, dress, outfit, outerwear, shoes, accessory, bag, jewelry)
                - Colors (list the main colors visible)
                - Style (casual, formal, elegant, sporty, streetwear, vintage, etc.)
                - Gender (male, female, or unisex)
                - A brief description of the item
                
                Be specific and accurate in identifying the fashion item.`,
              },
              {
                type: 'image',
                image: imageUrl,
              },
            ],
          },
        ],
      });

      console.log('[VISUAL_SEARCH] Extracted attributes:', attributes);

      // Search for similar items in the catalog
      const searchResults = await ctx.runQuery(api.items.queries.searchItemsByAttributes, {
        category: attributes.category,
        colors: attributes.colors,
        gender: attributes.gender,
        limit: 20,
      });

      // Calculate match scores for items based on attribute similarity
      const scoredItems = searchResults.map((item) => {
        let score = 0;
        
        // Category match
        if (attributes.category && item.category === attributes.category) {
          score += 50;
        }
        
        // Color matching (partial matches count)
        const itemColors = item.colors.map(c => c.toLowerCase());
        const searchColors = attributes.colors.map(c => c.toLowerCase());
        const colorMatches = searchColors.filter(c => 
          itemColors.some(ic => ic.includes(c) || c.includes(ic))
        ).length;
        score += (colorMatches / Math.max(searchColors.length, 1)) * 30;
        
        // Gender match
        if (attributes.gender && item.gender === attributes.gender) {
          score += 20;
        }
        
        return {
          ...item,
          matchScore: Math.round(score),
        };
      });

      // Sort by match score descending
      scoredItems.sort((a, b) => b.matchScore - a.matchScore);

      // Return top 10 results
      const topResults = scoredItems.slice(0, 10);

      console.log(`[VISUAL_SEARCH] Found ${topResults.length} similar items`);

      return {
        success: true,
        extractedAttributes: {
          category: attributes.category,
          colors: attributes.colors,
          style: attributes.style,
          gender: attributes.gender,
          description: attributes.description,
        },
        items: topResults,
      };
    } catch (error) {
      console.error('[VISUAL_SEARCH] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
        items: [],
      };
    }
  },
});


