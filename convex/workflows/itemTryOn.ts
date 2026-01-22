'use node';

/**
 * Single Item Try-On Workflow
 * Generates a try-on image for a single item
 */

import { internalAction, ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenAI } from '@google/genai';

// Initialize OpenAI provider for text generation
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google GenAI for image generation
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

/**
 * Generate a try-on image for a single item
 * This is the main action that handles the AI image generation
 */
export const generateItemTryOnImage = internalAction({
  args: {
    itemTryOnId: v.id('item_try_ons'),
    itemId: v.id('items'),
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      storageId: v.id('_storage'),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx: ActionCtx,
    args: {
      itemTryOnId: Id<'item_try_ons'>;
      itemId: Id<'items'>;
      userId: Id<'users'>;
    }
  ): Promise<
    | { success: true; storageId: Id<'_storage'> }
    | { success: false; error: string }
  > => {
    console.log(`[ITEM_TRYON] Starting image generation for item ${args.itemId}`);
    const startTime = Date.now();

    try {
      // Mark as processing
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.itemTryOnId,
        status: 'processing',
      });

      // Get user's primary image
      const userImage = await ctx.runQuery(internal.workflows.queries.getUserPrimaryImage, {
        userId: args.userId,
      });

      if (!userImage || !userImage.url) {
        throw new Error('User does not have a primary image for try-on');
      }

      // Get item with its image
      const itemData = await ctx.runQuery(internal.workflows.queries.getItemWithPrimaryImage, {
        itemId: args.itemId,
      });

      if (!itemData) {
        throw new Error(`Item not found: ${args.itemId}`);
      }

      console.log(`[ITEM_TRYON] Generating try-on for: ${itemData.item.name}`);

      // Fetch user image and item image in parallel
      console.log(`[ITEM_TRYON] Fetching images...`);
      const fetchStartTime = Date.now();

      const userImagePromise = fetch(userImage.url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => Buffer.from(buffer).toString('base64'));

      let itemImageBase64: string | null = null;
      if (itemData.primaryImageUrl) {
        try {
          const response = await fetch(itemData.primaryImageUrl);
          const buffer = await response.arrayBuffer();
          itemImageBase64 = Buffer.from(buffer).toString('base64');
        } catch (imgError) {
          console.warn(`[ITEM_TRYON] Failed to fetch item image:`, imgError);
        }
      }

      const userImageBase64 = await userImagePromise;

      const fetchTime = Date.now() - fetchStartTime;
      console.log(`[ITEM_TRYON] Fetched images in ${fetchTime}ms`);

      // Build item description
      const colorStr = itemData.item.colors.length > 0 ? itemData.item.colors.join('/') : '';
      const itemDescription = `${colorStr} ${itemData.item.name}${itemData.item.brand ? ` by ${itemData.item.brand}` : ''}`.trim();

      // Generate the prompt
      const promptResult = await generateText({
        model: openai('gpt-4o'),
        prompt: `You are a fashion photography director. Write a detailed image generation prompt for a virtual try-on photo.

The person in the reference photo should be shown wearing this single clothing item:
- ${itemDescription}
- Category: ${itemData.item.category}
${itemData.item.description ? `- Description: ${itemData.item.description}` : ''}

Create a prompt that:
1. Describes how the person should be wearing this item naturally
2. Maintains the person's identity, face, and body from the reference
3. Shows ONLY this single item - do not add other clothing items
4. If it's a top, show them wearing it with the lower body cropped or blurred
5. If it's pants/bottom, show them wearing it appropriately
6. For dresses/outfits, show the complete item
7. Results in a high-quality, professional fashion photography style image
8. Specifies natural lighting and a clean background

Keep the prompt concise but detailed (under 400 characters). Do not include any markdown formatting.`,
        temperature: 0.7,
      });

      const generatedPrompt = promptResult.text.trim();
      console.log(`[ITEM_TRYON] Generated prompt: ${generatedPrompt.slice(0, 150)}...`);

      // Build the content array for Google GenAI
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Add the main prompt
      const fullPrompt = `Virtual try-on fashion photo: Create an image of this person (shown in Reference Image 1) wearing the single clothing item shown in Reference Image 2.

Reference Image 1: Photo of the person who should be wearing the clothes
Reference Image 2: ${itemDescription}

${generatedPrompt}

Important:
- Keep the person's face, body type & size, and identity exactly as shown in Reference Image 1
- Dress them in ONLY the single item from Reference Image 2
- Do NOT add any other clothing items - show ONLY this one item
- Make it look like a professional fashion photograph
- The person should look natural and confident wearing this item`;

      contents.push({ text: fullPrompt });

      // Add user image as first reference
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBase64,
        },
      });

      // Add item image as reference if available
      if (itemImageBase64) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: itemImageBase64,
          },
        });
      }

      console.log(`[ITEM_TRYON] Calling Gemini image generation...`);

      // Call Google GenAI for image generation
      const response = await genAI.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Check if we got an image back
      const parts = response.candidates?.[0]?.content?.parts;
      let generatedImageBase64: string | null = null;

      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            generatedImageBase64 = part.inlineData.data;
            console.log(`[ITEM_TRYON] Successfully generated image!`);
            break;
          }
        }
      }

      // If no image generated, try simpler approach
      if (!generatedImageBase64) {
        console.warn(`[ITEM_TRYON] No image from first attempt, trying simpler approach...`);

        const simpleResponse = await genAI.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [
            {
              text: `Generate a professional fashion photograph of a person wearing: ${itemDescription}. 
Make it look like a high-end fashion photo with clean background and natural lighting.
Show ONLY this single item of clothing - no other items.`,
            },
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });

        const simpleParts = simpleResponse.candidates?.[0]?.content?.parts;
        if (simpleParts) {
          for (const part of simpleParts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageBase64 = part.inlineData.data;
              console.log(`[ITEM_TRYON] Generated image with simpler approach`);
              break;
            }
          }
        }
      }

      if (!generatedImageBase64) {
        throw new Error('Image generation failed - model did not return an image');
      }

      // Store the generated image
      console.log(`[ITEM_TRYON] Storing generated image...`);
      const imageBytes = Buffer.from(generatedImageBase64, 'base64');
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const storageId: Id<'_storage'> = await ctx.storage.store(imageBlob);
      console.log(`[ITEM_TRYON] Stored image with storageId ${storageId}`);

      // Update the try-on record with success
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.itemTryOnId,
        status: 'completed',
        storageId,
        generationProvider: 'google-gemini',
      });

      const elapsed = Date.now() - startTime;
      console.log(`[ITEM_TRYON] Image generation complete in ${elapsed}ms`);

      return {
        success: true as const,
        storageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ITEM_TRYON] Image generation failed:`, errorMessage);

      // Update status to failed
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.itemTryOnId,
        status: 'failed',
        errorMessage,
      });

      return {
        success: false as const,
        error: errorMessage,
      };
    }
  },
});


