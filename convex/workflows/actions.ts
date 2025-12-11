'use node';

/**
 * AI Actions for Onboarding Workflow
 * Uses GPT-5 via OpenAI for text/prompt generation
 * Uses Google GenAI SDK with gemini-3-pro-image-preview for image generation
 */

import { internalAction, ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenAI } from '@google/genai';

// Initialize OpenAI provider for text generation (GPT-5)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google GenAI for image generation (gemini-3-pro-image-preview)
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_KEY });

// ============================================
// TYPES
// ============================================

interface UserProfile {
  _id: Id<'users'>;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  stylePreferences: string[];
  budgetRange?: 'low' | 'mid' | 'premium';
  firstName?: string;
}

interface ItemForAI {
  _id: Id<'items'>;
  publicId: string;
  name: string;
  brand?: string;
  category: string;
  colors: string[];
  tags: string[];
  price: number;
  currency: string;
}

interface LookComposition {
  items: Array<{ itemId: string; category: string; name: string }>;
  occasion: string;
  styleTags: string[];
  name: string;
}

// ============================================
// STEP 1: AI ITEM SELECTION
// ============================================

/**
 * Use AI to select items and create 1 look composition with multiple items
 * Returns look composition that will be saved to the database
 */
export const selectItemsForLooks = internalAction({
  args: {
    userId: v.id('users'),
  },
  returns: v.array(
    v.object({
      itemIds: v.array(v.string()),
      occasion: v.string(),
      styleTags: v.array(v.string()),
      name: v.string(),
      nimaComment: v.string(),
    })
  ),
  handler: async (
    ctx: ActionCtx,
    args: { userId: Id<'users'> }
  ): Promise<
    Array<{
      itemIds: string[];
      occasion: string;
      styleTags: string[];
      name: string;
      nimaComment: string;
    }>
  > => {
    console.log(`[WORKFLOW:ONBOARDING] Step 1: Selecting items for user ${args.userId}`);
    const startTime = Date.now();

    // Get user profile
    const userProfile = (await ctx.runQuery(internal.workflows.queries.getUserForWorkflow, {
      userId: args.userId,
    })) as UserProfile | null;

    if (!userProfile) {
      throw new Error(`User not found: ${args.userId}`);
    }

    console.log(`[WORKFLOW:ONBOARDING] User profile:`, {
      gender: userProfile.gender,
      stylePreferences: userProfile.stylePreferences,
      budgetRange: userProfile.budgetRange,
    });

    // Get ALL items from the database (no gender filtering for now)
    // This ensures we have enough variety to create complete looks
    const allItems = (await ctx.runQuery(internal.workflows.queries.getAllItemsForAI, {
      limit: 500, // Get all items
    })) as ItemForAI[];

    console.log(`[WORKFLOW:ONBOARDING] Retrieved ${allItems.length} total items from database`);

    // Deduplicate items
    const uniqueItems = Array.from(new Map(allItems.map((item) => [item._id, item])).values());

    console.log(`[WORKFLOW:ONBOARDING] Found ${uniqueItems.length} unique items for AI selection`);

    if (uniqueItems.length === 0) {
      throw new Error('No items available for look generation');
    }

    // Build prompt for AI - Generate 3 looks with multiple items each
    const systemPrompt = `You are Nima, an expert fashion stylist with a fun, energetic personality. 
Your task is to create 3 unique, stylish outfit combinations (looks) for a new user based on their preferences.

User Profile:
- Gender preference: ${userProfile.gender || 'not specified'}
- Style preferences: ${userProfile.stylePreferences.join(', ') || 'casual'}
- Budget range: ${userProfile.budgetRange || 'mid'}
- Name: ${userProfile.firstName || 'friend'}

Available Items (use these item IDs exactly):
${uniqueItems.map((item) => `- ID: ${item._id}, Name: "${item.name}", Category: ${item.category}, Colors: ${item.colors.join(', ')}, Tags: ${item.tags.join(', ')}, Price: ${item.price} ${item.currency}`).join('\n')}

IMPORTANT RULES:
1. Create exactly 3 different outfit looks
2. Each look MUST have AT LEAST 2-4 items that work well together (top + bottom, or dress + accessories, etc.)
3. Include variety across looks - different occasions like casual, work, date night, weekend, etc.
4. Make sure items complement each other in style and color within each look
5. Use ONLY the item IDs from the available items list
6. Give each look a catchy name and describe why these items work together
7. Try not to repeat items across looks if possible

Return exactly 3 looks as a JSON array.`;

    // Use AI to generate look compositions
    const result = await generateText({
      model: openai('gpt-5'),
      system: systemPrompt,
      prompt: `Create 3 complete outfits, each with at least 2 items that work beautifully together. Return a JSON array with this exact structure:
[
  {
    "items": [{"itemId": "actual_item_id", "category": "top/bottom/etc", "name": "item name"}, {"itemId": "second_item_id", "category": "category", "name": "item name"}],
    "occasion": "casual/work/date_night/weekend/etc",
    "styleTags": ["tag1", "tag2"],
    "name": "Catchy Look Name"
  },
  {
    "items": [...],
    "occasion": "...",
    "styleTags": [...],
    "name": "..."
  },
  {
    "items": [...],
    "occasion": "...",
    "styleTags": [...],
    "name": "..."
  }
]

IMPORTANT: Each look must have at least 2 items. Be creative with the names! Examples: "Sunday Brunch Vibes", "Boss Mode Monday", "Date Night Chic"`,
    });

    console.log(`[WORKFLOW:ONBOARDING] AI response received, parsing...`);

    // Parse the AI response
    let lookCompositions: LookComposition[];
    try {
      // Extract JSON from the response
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }
      lookCompositions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error(`[WORKFLOW:ONBOARDING] Failed to parse AI response:`, result.text);
      // Fallback: create basic look from available items
      lookCompositions = createFallbackLooks(uniqueItems);
    }

    // Validate and filter looks - ensure each look has at least 2 items
    const validLooks = lookCompositions
      .slice(0, 3) // Take up to 3 looks
      .map((look) => {
        // Validate item IDs exist
        const validItemIds = look.items
          .map((item) => item.itemId)
          .filter((itemId) => uniqueItems.some((ui) => ui._id === itemId));

        // Must have at least 2 items
        if (validItemIds.length < 2) {
          console.warn(`[WORKFLOW:ONBOARDING] Look has less than 2 valid items, will add more`);
          // Add more items if needed
          const categories = ['top', 'bottom', 'shoes', 'accessory', 'dress', 'outerwear'];
          for (const cat of categories) {
            if (validItemIds.length >= 2) break;
            const itemInCat = uniqueItems.find(
              (ui) => ui.category === cat && !validItemIds.includes(ui._id)
            );
            if (itemInCat) {
              validItemIds.push(itemInCat._id);
            }
          }
        }

        if (validItemIds.length < 2) {
          return null;
        }

        return {
          itemIds: validItemIds,
          occasion: look.occasion || 'casual',
          styleTags: look.styleTags || [],
          name: look.name || 'Curated Look',
        };
      })
      .filter((look): look is NonNullable<typeof look> => look !== null);

    // Ensure we have at least 3 looks with multiple items
    if (validLooks.length < 3) {
      console.warn(`[WORKFLOW:ONBOARDING] Only ${validLooks.length} valid looks from AI, using fallback for remaining`);
      const fallback = createFallbackLooks(uniqueItems);
      const neededLooks = 3 - validLooks.length;
      validLooks.push(
        ...fallback.slice(0, neededLooks).map((look) => ({
          itemIds: look.items.map((i) => i.itemId),
          occasion: look.occasion,
          styleTags: look.styleTags,
          name: look.name,
        }))
      );
    }

    // Generate Nima comments for each look
    const looksWithComments = await Promise.all(
      validLooks.map(async (look) => {
        const nimaComment = await generateNimaComment(
          look.name,
          look.occasion,
          userProfile.firstName
        );
        return {
          ...look,
          nimaComment,
        };
      })
    );

    const elapsed = Date.now() - startTime;
    console.log(
      `[WORKFLOW:ONBOARDING] Step 1 complete: ${looksWithComments.length} looks created in ${elapsed}ms`
    );

    return looksWithComments;
  },
});

/**
 * Generate a fun "Nima Says" comment for a look
 */
async function generateNimaComment(
  lookName: string,
  occasion: string,
  userName?: string
): Promise<string> {
  try {
    const result = await generateText({
      model: openai('gpt-5'),
      prompt: `You are Nima, a fun and hyping fashion stylist. Generate a short, energetic comment (1-2 sentences max) about this outfit called "${lookName}" for ${occasion}. 
Address the user${userName ? ` (their name is ${userName})` : ''} directly. Be encouraging, fun, and use fashion-forward language. 
Keep it under 100 characters if possible. No emojis. Examples of tone: "You're gonna turn heads!", "This is giving main character energy!", "Trust me, this combo is *chef's kiss*"`,
      temperature: 0.9,
    });

    return result.text.trim().slice(0, 150);
  } catch (error) {
    console.error(`[WORKFLOW:ONBOARDING] Failed to generate Nima comment:`, error);
    return `This look is absolutely perfect for you! Trust the process.`;
  }
}

/**
 * Create fallback looks when AI fails - creates 3 looks with at least 2 items per look
 */
function createFallbackLooks(items: ItemForAI[]): LookComposition[] {
  const looks: LookComposition[] = [];
  const usedItems = new Set<string>();

  // Group items by category
  const byCategory = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ItemForAI[]>
  );

  // Define 3 different look configurations
  const lookConfigs = [
    {
      occasion: 'Everyday Casual',
      styleTags: ['casual', 'comfortable', 'versatile'],
      name: 'Effortless Style',
      categories: ['top', 'bottom', 'shoes', 'accessory'],
    },
    {
      occasion: 'Weekend Ready',
      styleTags: ['relaxed', 'weekend', 'laid-back'],
      name: 'Weekend Vibes',
      categories: ['dress', 'shoes', 'bag', 'accessory'],
    },
    {
      occasion: 'Smart Casual',
      styleTags: ['smart', 'polished', 'versatile'],
      name: 'Polished Look',
      categories: ['outerwear', 'top', 'bottom', 'shoes'],
    },
  ];

  // Create up to 3 looks
  for (const config of lookConfigs) {
    const lookItems: Array<{ itemId: string; category: string; name: string }> = [];

    // Try to pick items from specified categories
    for (const category of config.categories) {
      const categoryItems = byCategory[category] || [];
      const available = categoryItems.find((item) => !usedItems.has(item._id));
      if (available && lookItems.length < 4) {
        lookItems.push({
          itemId: available._id,
          category: available.category,
          name: available.name,
        });
        usedItems.add(available._id);
      }
    }

    // If not enough items from preferred categories, pick from any
    if (lookItems.length < 2) {
      for (const item of items) {
        if (!usedItems.has(item._id) && lookItems.length < 3) {
          lookItems.push({
            itemId: item._id,
            category: item.category,
            name: item.name,
          });
          usedItems.add(item._id);
        }
      }
    }

    // Ensure at least 2 items for a valid look
    if (lookItems.length >= 2) {
      looks.push({
        items: lookItems,
        occasion: config.occasion,
        styleTags: config.styleTags,
        name: config.name,
      });
    }

    // Stop if we have 3 looks
    if (looks.length >= 3) break;
  }

  return looks;
}

// ============================================
// STEP 2: IMAGE GENERATION WITH REFERENCES
// ============================================

/**
 * Generate a try-on image for a look using Google GenAI with reference images
 * Uses gemini-3-pro-image-preview for high-quality image generation
 */
export const generateLookImage = internalAction({
  args: {
    lookId: v.id('looks'),
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      storageId: v.id('_storage'),
      lookImageId: v.id('look_images'),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx: ActionCtx,
    args: { lookId: Id<'looks'>; userId: Id<'users'> }
  ): Promise<
    | { success: true; storageId: Id<'_storage'>; lookImageId: Id<'look_images'> }
    | { success: false; error: string }
  > => {
    console.log(`[WORKFLOW:ONBOARDING] Step 2: Generating image for look ${args.lookId}`);
    const startTime = Date.now();

    try {
      // Mark look as processing
      await ctx.runMutation(internal.workflows.mutations.updateLookGenerationStatus, {
        lookId: args.lookId,
        status: 'processing',
      });

      // Get user's primary image
      const userImage = await ctx.runQuery(internal.workflows.queries.getUserPrimaryImage, {
        userId: args.userId,
      });

      if (!userImage || !userImage.url) {
        throw new Error('User does not have a primary image for try-on');
      }

      // Get look with item details and images
      const lookData = await ctx.runQuery(internal.workflows.queries.getLookWithItemImages, {
        lookId: args.lookId,
      });

      if (!lookData) {
        throw new Error(`Look not found: ${args.lookId}`);
      }

      console.log(`[WORKFLOW:ONBOARDING] Look has ${lookData.items.length} items`);

      // Fetch user image as base64
      console.log(`[WORKFLOW:ONBOARDING] Fetching user image from: ${userImage.url}`);
      const userImageResponse = await fetch(userImage.url);
      const userImageBuffer = await userImageResponse.arrayBuffer();
      const userImageBase64 = Buffer.from(userImageBuffer).toString('base64');

      // Fetch item images as base64
      const itemImagesBase64: Array<{ base64: string; name: string; description: string }> = [];
      
      for (const item of lookData.items) {
        if (item.primaryImageUrl) {
          try {
            console.log(`[WORKFLOW:ONBOARDING] Fetching item image: ${item.name}`);
            const itemImageResponse = await fetch(item.primaryImageUrl);
            const itemImageBuffer = await itemImageResponse.arrayBuffer();
            const itemBase64 = Buffer.from(itemImageBuffer).toString('base64');
            
            const colorStr = item.colors.length > 0 ? item.colors.join('/') : '';
            const description = `${colorStr} ${item.name}${item.brand ? ` by ${item.brand}` : ''}`.trim();
            
            itemImagesBase64.push({
              base64: itemBase64,
              name: item.name,
              description,
            });
          } catch (imgError) {
            console.warn(`[WORKFLOW:ONBOARDING] Failed to fetch item image for ${item.name}:`, imgError);
          }
        }
      }

      console.log(`[WORKFLOW:ONBOARDING] Fetched ${itemImagesBase64.length} item images`);

      // Generate the prompt using Vercel AI SDK for better prompt quality
      const outfitDescription = itemImagesBase64.map((item) => item.description).join(', ');
      
      const promptResult = await generateText({
        model: openai('gpt-5'),
        prompt: `You are a fashion photography director. Write a detailed image generation prompt for a virtual try-on photo.

The person in the reference photo should be shown wearing these clothing items:
${itemImagesBase64.map((item, i) => `${i + 1}. ${item.description}`).join('\n')}

Create a prompt that:
1. Describes how the person should be wearing each clothing item naturally
2. Maintains the person's identity, face, and body from the reference
3. Shows all the clothing items together as a complete outfit
4. Results in a high-quality, professional fashion photography style image
5. Specifies natural lighting and a clean background

Keep the prompt concise but detailed (under 500 characters). Do not include any markdown formatting.`,
        temperature: 0.7,
      });

      const generatedPrompt = promptResult.text.trim();
      console.log(`[WORKFLOW:ONBOARDING] Generated prompt: ${generatedPrompt.slice(0, 200)}...`);

      // Build the content array with reference images for Google GenAI
      // Reference 1: The user's photo (character consistency)
      // Reference 2+: The clothing items to try on
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Add the main prompt with context about the reference images
      const fullPrompt = `Virtual try-on fashion photo: Create an image of this person (shown in the first reference image) wearing the clothing items shown in the other reference images.

Reference Image 1: Photo of the person who should be wearing the clothes
${itemImagesBase64.map((item, i) => `Reference Image ${i + 2}: ${item.description}`).join('\n')}

${generatedPrompt}

Important:
- Keep the person's face, body type, and identity exactly as shown in Reference Image 1
- Dress them in ALL the clothing items from the other reference images
- Make it look like a professional fashion photograph
- The person should look natural and confident wearing these items`;

      contents.push({ text: fullPrompt });

      // Add user image as first reference (character/person consistency)
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBase64,
        },
      });

      // Add all item images as references (up to 5 more, keeping under 14 total limit)
      for (const itemImage of itemImagesBase64.slice(0, 5)) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: itemImage.base64,
          },
        });
      }

      console.log(`[WORKFLOW:ONBOARDING] Calling Gemini image generation with ${contents.length - 1} reference images...`);

      // Call Google GenAI with gemini-3-pro-image-preview for high-quality image generation
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
            console.log(`[WORKFLOW:ONBOARDING] Successfully generated image!`);
            break;
          }
        }
      }

      // If no image generated, try with simpler approach
      if (!generatedImageBase64) {
        console.warn(`[WORKFLOW:ONBOARDING] No image from first attempt, trying simpler approach...`);
        
        // Try with just text prompt (the model might generate based on description)
        const simpleResponse = await genAI.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [{
            text: `Generate a professional fashion photograph of a person wearing: ${outfitDescription}. 
Make it look like a high-end fashion editorial photo with clean background and natural lighting.`,
          }],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });

        const simpleParts = simpleResponse.candidates?.[0]?.content?.parts;
        if (simpleParts) {
          for (const part of simpleParts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageBase64 = part.inlineData.data;
              console.log(`[WORKFLOW:ONBOARDING] Generated image with simpler approach`);
              break;
            }
          }
        }
      }

      // If still no image, throw error (don't use placeholder)
      if (!generatedImageBase64) {
        throw new Error('Image generation failed - model did not return an image. The model may not support image generation or the request was blocked.');
      }

      // Store the generated image
      console.log(`[WORKFLOW:ONBOARDING] Storing generated image...`);
      const imageBytes = Buffer.from(generatedImageBase64, 'base64');
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const storageId: Id<'_storage'> = await ctx.storage.store(imageBlob);
      console.log(`[WORKFLOW:ONBOARDING] Stored image with storageId ${storageId}`);

      // Create look_image record
      const lookImageId: Id<'look_images'> = await ctx.runMutation(
        internal.workflows.mutations.createLookImage,
        {
          lookId: args.lookId,
          userId: args.userId,
          userImageId: userImage._id,
          storageId,
          generationProvider: 'google-gemini',
        }
      );

      // Update look status to completed
      await ctx.runMutation(internal.workflows.mutations.updateLookGenerationStatus, {
        lookId: args.lookId,
        status: 'completed',
      });

      const elapsed = Date.now() - startTime;
      console.log(
        `[WORKFLOW:ONBOARDING] Image generation complete for look ${args.lookId} in ${elapsed}ms`
      );

      return {
        success: true as const,
        storageId,
        lookImageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WORKFLOW:ONBOARDING] Image generation failed:`, errorMessage);

      // Update look status to failed
      await ctx.runMutation(internal.workflows.mutations.updateLookGenerationStatus, {
        lookId: args.lookId,
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
