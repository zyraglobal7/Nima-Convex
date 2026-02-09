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
// HELPER FUNCTIONS
// ============================================

/**
 * Validate that a look has no duplicate categories (e.g., no 2 jackets, 2 shoes)
 * Returns filtered items with only one item per category
 */
function validateNoDuplicateCategories(
  items: Array<{ itemId: string; category: string; name: string }>
): Array<{ itemId: string; category: string; name: string }> {
  const seenCategories = new Set<string>();
  return items.filter((item) => {
    if (seenCategories.has(item.category)) {
      console.warn(`[WORKFLOW:ONBOARDING] Removing duplicate category item: ${item.name} (${item.category})`);
      return false;
    }
    seenCategories.add(item.category);
    return true;
  });
}

// ============================================
// STEP 1: AI ITEM SELECTION
// ============================================

/**
 * Use AI to select items and create 3 look compositions with multiple items
 * Returns look compositions that will be saved to the database
 * 
 * @param excludeItemIds - Optional array of item IDs to exclude (for "generate more" flow)
 */
export const selectItemsForLooks = internalAction({
  args: {
    userId: v.id('users'),
    excludeItemIds: v.optional(v.array(v.string())),
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
    args: { userId: Id<'users'>; excludeItemIds?: string[] }
  ): Promise<
    Array<{
      itemIds: string[];
      occasion: string;
      styleTags: string[];
      name: string;
      nimaComment: string;
    }>
  > => {
    const excludeSet = new Set(args.excludeItemIds || []);
    console.log(`[WORKFLOW:ONBOARDING] Step 1: Selecting items for user ${args.userId}`);
    if (excludeSet.size > 0) {
      console.log(`[WORKFLOW:ONBOARDING] Excluding ${excludeSet.size} items from previous looks`);
    }
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

    // Determine user's gender for filtering (male/female get gender-specific + unisex, others get all)
    const userGender = userProfile.gender === 'male' ? 'male' 
      : userProfile.gender === 'female' ? 'female' 
      : undefined;

    // Get gender-appropriate items + unisex items to ensure proper clothing matches
    let allItems: ItemForAI[] = [];
    
    if (userGender) {
      // Get gender-specific items
      const genderItems = (await ctx.runQuery(internal.workflows.queries.getAllItemsForAI, {
        gender: userGender,
        limit: 300,
      })) as ItemForAI[];
      
      // Get unisex items (can be worn by anyone)
      const unisexItems = (await ctx.runQuery(internal.workflows.queries.getAllItemsForAI, {
        gender: 'unisex',
        limit: 200,
      })) as ItemForAI[];
      
      allItems = [...genderItems, ...unisexItems];
      console.log(`[WORKFLOW:ONBOARDING] Retrieved ${genderItems.length} ${userGender} items + ${unisexItems.length} unisex items`);
    } else {
      // No gender specified - get all items
      allItems = (await ctx.runQuery(internal.workflows.queries.getAllItemsForAI, {
        limit: 500,
      })) as ItemForAI[];
      console.log(`[WORKFLOW:ONBOARDING] No gender specified, retrieved ${allItems.length} total items`);
    }

    console.log(`[WORKFLOW:ONBOARDING] Total items for AI selection: ${allItems.length}`);

    // Deduplicate items
    const deduplicatedItems = Array.from(new Map(allItems.map((item) => [item._id, item])).values());

    // Filter out excluded items (from previous looks)
    const uniqueItems = deduplicatedItems.filter((item) => !excludeSet.has(item._id));
    
    if (excludeSet.size > 0) {
      console.log(`[WORKFLOW:ONBOARDING] After exclusions: ${uniqueItems.length} items available (excluded ${deduplicatedItems.length - uniqueItems.length})`);
    } else {
      console.log(`[WORKFLOW:ONBOARDING] Found ${uniqueItems.length} unique items for AI selection`);
    }

    if (uniqueItems.length === 0) {
      throw new Error('No items available for look generation');
    }

    // Build prompt for AI - Generate 3 looks with smart outfit composition
    const systemPrompt = `You are Nima, an expert fashion stylist with a fun, energetic personality. 
Your task is to create 3 unique, stylish outfit combinations (looks) for a new user based on their preferences.

User Profile:
- Gender preference: ${userProfile.gender || 'not specified'}
- Style preferences: ${userProfile.stylePreferences.join(', ') || 'casual'}
- Budget range: ${userProfile.budgetRange || 'mid'}
- Name: ${userProfile.firstName || 'friend'}

Available Items (use these item IDs exactly):
${uniqueItems.map((item) => `- ID: ${item._id}, Name: "${item.name}", Category: ${item.category}, Colors: ${item.colors.join(', ')}, Tags: ${item.tags.join(', ')}, Price: ${item.price} ${item.currency}`).join('\n')}

CRITICAL GENDER RULES (MUST FOLLOW):
${userProfile.gender === 'male' ? `- User is MALE: NEVER include dresses, skirts, blouses, heels, or feminine clothing.
- ONLY use items categorized as: top, bottom, outerwear, shoes, accessory, bag, jewelry (no dress category for males!)` : ''}
${userProfile.gender === 'female' ? `- User is FEMALE: You may include dresses, skirts, blouses, heels, and any clothing items.` : ''}
${!userProfile.gender || userProfile.gender === 'prefer-not-to-say' ? `- Gender not specified: Use gender-neutral items only. Prefer tops, bottoms, outerwear, and unisex accessories.` : ''}

SMART OUTFIT COMPOSITION RULES:
1. Create exactly 3 different outfit looks with VARIED item counts (not all the same size!)
2. UNDERSTAND COMPLETE OUTFITS:
   - A DRESS or OUTFIT/SET is a complete outfit on its own - only add shoes/accessories, NOT a top or bottom${userProfile.gender === 'male' ? ' (BUT NEVER USE DRESSES FOR MALE USERS!)' : ''}
   - A JUMPSUIT is a complete outfit on its own - only add shoes/accessories
   - Top + Bottom together form a complete base outfit
3. VARY THE OUTFIT SIZES:
   - Look 1: Could be 2 items (e.g., ${userProfile.gender === 'male' ? 'shirt + pants' : 'dress + shoes'})
   - Look 2: Could be 3 items (e.g., top + bottom + shoes)
   - Look 3: Could be 4 items (e.g., top + bottom + shoes + accessory)
   - Mix it up! Don't make all looks the same size.
4. Items in each look must complement each other in style and color
5. Use ONLY the item IDs from the available items list
6. Give each look a catchy, creative name
7. Include variety in occasions: casual, work, date night, weekend, brunch, etc.
8. NEVER repeat items across the 3 looks
9. CRITICAL - NO DUPLICATE CATEGORIES IN A SINGLE LOOK:
   - Each look should have AT MOST ONE item per category type
   - NO 2 jackets, NO 2 shirts, NO 2 pants, NO 2 shoes, NO 2 bags
   - ONE top, ONE bottom, ONE pair of shoes, ONE outerwear piece maximum
   - Layering exception: You CAN pair an outerwear piece (jacket/coat) OVER a top - that's 1 top + 1 outerwear, NOT 2 tops
10. SHOES RULE: Only ONE pair of shoes per look - never mix different shoes
11. OUTFIT/SET items (category: "outfit") are pre-styled COMPLETE outfits - like dresses, only add shoes/accessories, NOT tops or bottoms

Return exactly 3 looks as a JSON array.`;

    // Use AI to generate look compositions
    const result = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      prompt: `Create 3 complete outfits with DIFFERENT item counts. Return a JSON array with this exact structure:

EXAMPLES OF VALID LOOKS:
- 2 items: Dress + Heels (dress IS the outfit)
- 2 items: Blouse + Skirt (minimal but complete)
- 3 items: T-shirt + Jeans + Sneakers
- 4 items: Top + Pants + Blazer + Watch

[
  {
    "items": [{"itemId": "actual_item_id", "category": "dress", "name": "item name"}, {"itemId": "shoe_id", "category": "shoes", "name": "shoe name"}],
    "occasion": "date_night",
    "styleTags": ["elegant", "romantic"],
    "name": "Candlelit Dinner Ready"
  },
  {
    "items": [{"itemId": "top_id", "category": "top", "name": "top name"}, {"itemId": "bottom_id", "category": "bottom", "name": "bottom name"}, {"itemId": "shoe_id", "category": "shoes", "name": "shoe name"}],
    "occasion": "casual",
    "styleTags": ["casual", "comfortable"],
    "name": "Weekend Wanderer"
  },
  {
    "items": [...4 items...],
    "occasion": "work",
    "styleTags": [...],
    "name": "..."
  }
]

IMPORTANT: 
- If you pick a dress/jumpsuit/outfit, do NOT add a top or bottom - the dress/outfit IS the complete outfit!
- Each look should have a DIFFERENT number of items (2, 3, or 4)
- Be creative with the names! Examples: "Sunday Brunch Vibes", "Boss Mode Monday", "Golden Hour Glow"
- NO duplicate categories: never put 2 jackets, 2 shirts, 2 shoes, 2 bags in the same look

CRITICAL: You MUST ALWAYS return a valid JSON array, even if you can only create 1 or 2 looks.
- If items are limited, create fewer looks but still return valid JSON
- NEVER respond with conversational text or explanations
- If you cannot create any valid looks, return an empty array: []`,
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
    } catch (error) {
      console.error(`[WORKFLOW:ONBOARDING] Failed to parse AI response:`, result.text, error);
      // Fallback: create basic look from available items
      lookCompositions = createFallbackLooks(uniqueItems);
    }

    // Validate and filter looks - ensure each look has at least 2 items and no duplicate categories
    const validLooks = lookCompositions
      .slice(0, 3) // Take up to 3 looks
      .map((look) => {
        // First filter for valid item IDs that exist
        const validItems = look.items.filter((item) =>
          uniqueItems.some((ui) => ui._id === item.itemId)
        );

        // Remove duplicate categories (e.g., no 2 jackets, 2 shoes)
        const deduplicatedItems = validateNoDuplicateCategories(validItems);
        const validItemIds = deduplicatedItems.map((item) => item.itemId);

        // Must have at least 2 items
        if (validItemIds.length < 2) {
          console.warn(`[WORKFLOW:ONBOARDING] Look has less than 2 valid items, will add more`);
          // Add more items if needed (respecting no duplicate categories)
          const usedCategories = new Set(deduplicatedItems.map((item) => item.category));
          const categories = ['top', 'bottom', 'shoes', 'accessory', 'dress', 'outfit', 'outerwear'];
          for (const cat of categories) {
            if (validItemIds.length >= 2) break;
            if (usedCategories.has(cat)) continue; // Skip if category already used
            const itemInCat = uniqueItems.find(
              (ui) => ui.category === cat && !validItemIds.includes(ui._id)
            );
            if (itemInCat) {
              validItemIds.push(itemInCat._id);
              usedCategories.add(cat);
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
      model: openai('gpt-4o-mini'),
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
 * Create fallback looks when AI fails - creates 3 looks with VARIED item counts (2, 3, 4 items)
 * Respects that dresses and outfit/sets are complete outfits
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

  // Define 3 different look configurations with VARIED sizes
  // Each config specifies exactly how many items to include
  const lookConfigs = [
    {
      // 2-item look: Outfit/Dress + Shoes (outfit/dress is the complete outfit)
      occasion: 'Date Night',
      styleTags: ['elegant', 'romantic', 'chic'],
      name: 'Evening Elegance',
      strategy: 'complete_piece', // Handles both 'outfit' and 'dress' categories
      targetItems: 2,
      categories: ['outfit', 'dress', 'shoes'], // Try outfit first, then dress
    },
    {
      // 3-item look: Top + Bottom + Shoes
      occasion: 'Everyday Casual',
      styleTags: ['casual', 'comfortable', 'versatile'],
      name: 'Effortless Style',
      strategy: 'separates',
      targetItems: 3,
      categories: ['top', 'bottom', 'shoes'],
    },
    {
      // 4-item look: Full outfit with accessory
      occasion: 'Smart Casual',
      styleTags: ['smart', 'polished', 'versatile'],
      name: 'Polished Look',
      strategy: 'complete',
      targetItems: 4,
      categories: ['top', 'bottom', 'shoes', 'accessory'],
    },
  ];

  // Create up to 3 looks
  for (const config of lookConfigs) {
    const lookItems: Array<{ itemId: string; category: string; name: string }> = [];

    // For complete piece looks (outfit/dress), only add the piece + accessories (no top/bottom)
    if (config.strategy === 'complete_piece') {
      // First try to get an outfit (pre-styled set), then fall back to dress
      const outfits = byCategory['outfit'] || [];
      const dresses = byCategory['dress'] || [];
      const completePiece = outfits.find((item) => !usedItems.has(item._id)) 
        || dresses.find((item) => !usedItems.has(item._id));
      
      if (completePiece) {
        lookItems.push({
          itemId: completePiece._id,
          category: completePiece.category,
          name: completePiece.name,
        });
        usedItems.add(completePiece._id);

        // Add shoes only
        const shoes = byCategory['shoes'] || [];
        const shoe = shoes.find((item) => !usedItems.has(item._id));
        if (shoe) {
          lookItems.push({
            itemId: shoe._id,
            category: shoe.category,
            name: shoe.name,
          });
          usedItems.add(shoe._id);
        }
      }
    } else {
      // For separates: pick items from each category up to targetItems
      for (const category of config.categories) {
        if (lookItems.length >= config.targetItems) break;
        
        const categoryItems = byCategory[category] || [];
        const available = categoryItems.find((item) => !usedItems.has(item._id));
        if (available) {
          lookItems.push({
            itemId: available._id,
            category: available.category,
            name: available.name,
          });
          usedItems.add(available._id);
        }
      }
    }

    // If not enough items from preferred categories, pick from any
    if (lookItems.length < 2) {
      for (const item of items) {
        if (!usedItems.has(item._id) && lookItems.length < config.targetItems) {
          // Don't add top/bottom if we already have a dress or outfit (complete pieces)
          const hasCompletePiece = lookItems.some((li) => li.category === 'dress' || li.category === 'outfit');
          if (hasCompletePiece && (item.category === 'top' || item.category === 'bottom')) {
            continue;
          }
          
          // Prevent duplicate categories
          const hasCategory = lookItems.some((li) => li.category === item.category);
          if (hasCategory) {
            continue;
          }
          
          lookItems.push({
            itemId: item._id,
            category: item.category,
            name: item.name,
          });
          usedItems.add(item._id);
        }
      }
    }

    // Ensure at least 2 items for a valid look (or 1 for dress-based if that's all we have)
    const minItems = config.strategy === 'dress_based' ? 1 : 2;
    if (lookItems.length >= minItems) {
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

      // Fetch user image and all item images in PARALLEL for faster processing
      console.log(`[WORKFLOW:ONBOARDING] Fetching user image and ${lookData.items.length} item images in parallel...`);
      const fetchStartTime = Date.now();

      // Prepare all fetch promises
      const userImagePromise = fetch(userImage.url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => Buffer.from(buffer).toString('base64'));

      const itemImagePromises = lookData.items
        .filter((item) => item.primaryImageUrl)
        .map(async (item) => {
          try {
            const response = await fetch(item.primaryImageUrl!);
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            
            const colorStr = item.colors.length > 0 ? item.colors.join('/') : '';
            const description = `${colorStr} ${item.name}${item.brand ? ` by ${item.brand}` : ''}`.trim();
            
            return {
              base64,
              name: item.name,
              description,
            };
          } catch (imgError) {
            console.warn(`[WORKFLOW:ONBOARDING] Failed to fetch item image for ${item.name}:`, imgError);
            return null;
          }
        });

      // Execute all fetches in parallel
      const [userImageBase64, ...itemImageResults] = await Promise.all([
        userImagePromise,
        ...itemImagePromises,
      ]);

      // Filter out failed fetches
      const itemImagesBase64 = itemImageResults.filter(
        (item): item is { base64: string; name: string; description: string } => item !== null
      );

      const fetchTime = Date.now() - fetchStartTime;
      console.log(`[WORKFLOW:ONBOARDING] Fetched user + ${itemImagesBase64.length} item images in ${fetchTime}ms (parallel)`);

      // Generate the prompt using Vercel AI SDK for better prompt quality
      const outfitDescription = itemImagesBase64.map((item) => item.description).join(', ');
      
      const promptResult = await generateText({
        model: openai('gpt-4o'),
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
- Keep the person's face, body type & size, and identity exactly as shown in Reference Image 1
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
          model: "gemini-3-pro-image-preview", 
          contents: [
            {
              text: `Generate a professional fashion photograph of THIS PERSON (shown in the first reference image) wearing: ${outfitDescription}. 
Make it look like a high-end fashion editorial photo with clean background and natural lighting.
Keep the person's identity, face, and body type EXACTLY as shown in the reference image.`,
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: userImageBase64,
              },
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

// ============================================
// SINGLE ITEM TRY-ON IMAGE GENERATION
// ============================================

/**
 * Generate a try-on image for a single item
 * Shows the user wearing ONLY that specific item
 */
export const generateItemTryOnImage = internalAction({
  args: {
    tryOnId: v.id('item_try_ons'),
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
    args: { tryOnId: Id<'item_try_ons'>; itemId: Id<'items'>; userId: Id<'users'> }
  ): Promise<
    | { success: true; storageId: Id<'_storage'> }
    | { success: false; error: string }
  > => {
    console.log(`[WORKFLOW:ITEM_TRYON] Generating image for item ${args.itemId}`);
    const startTime = Date.now();

    try {
      // Mark try-on as processing
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.tryOnId,
        status: 'processing',
      });

      // Get user's primary image
      const userImage = await ctx.runQuery(internal.workflows.queries.getUserPrimaryImage, {
        userId: args.userId,
      });

      if (!userImage || !userImage.url) {
        throw new Error('User does not have a primary image for try-on');
      }

      // Get item with its primary image
      const itemData = await ctx.runQuery(internal.workflows.queries.getItemWithPrimaryImage, {
        itemId: args.itemId,
      });

      if (!itemData) {
        throw new Error(`Item not found: ${args.itemId}`);
      }

      console.log(`[WORKFLOW:ITEM_TRYON] Item: ${itemData.item.name}`);

      // Fetch user image and item image in parallel
      console.log(`[WORKFLOW:ITEM_TRYON] Fetching images...`);
      const fetchStartTime = Date.now();

      const [userImageBase64, itemImageBase64] = await Promise.all([
        fetch(userImage.url)
          .then((res) => res.arrayBuffer())
          .then((buffer) => Buffer.from(buffer).toString('base64')),
        itemData.primaryImageUrl
          ? fetch(itemData.primaryImageUrl)
              .then((res) => res.arrayBuffer())
              .then((buffer) => Buffer.from(buffer).toString('base64'))
          : null,
      ]);

      const fetchTime = Date.now() - fetchStartTime;
      console.log(`[WORKFLOW:ITEM_TRYON] Fetched images in ${fetchTime}ms`);

      // Build item description
      // Use selected color if available, otherwise fall back to first color
      const tryOn = await ctx.runQuery(internal.itemTryOns.queries.getItemTryOn, { itemTryOnId: args.tryOnId });
      const selectedColor = tryOn?.selectedColor;
      
      const colorStr = selectedColor ? selectedColor : (itemData.item.colors.length > 0 ? itemData.item.colors.join('/') : '');
      const itemDescription = `${colorStr} ${itemData.item.name}${itemData.item.brand ? ` by ${itemData.item.brand}` : ''}`.trim();

      // Generate the prompt
      const promptResult = await generateText({
        model: openai('gpt-4o'),
        prompt: `You are a fashion photography director. Write a detailed image generation prompt for a virtual try-on photo.

The person in the reference photo should be shown wearing this single item:
${itemDescription}

Category: ${itemData.item.category}
${itemData.item.description ? `Description: ${itemData.item.description}` : ''}

Create a prompt that:
1. Shows the person wearing ONLY this single item naturally
2. Maintains the person's identity, face, and body from the reference
3. Results in a high-quality, professional fashion photography style image
4. Specifies natural lighting and a clean background
5. Shows the item clearly and prominently
6. For tops: show from waist up; for bottoms: show full body; for shoes: focus on lower body; for accessories: show appropriately

Keep the prompt concise but detailed (under 400 characters). Do not include any markdown formatting.`,
        temperature: 0.7,
      });

      const generatedPrompt = promptResult.text.trim();
      console.log(`[WORKFLOW:ITEM_TRYON] Generated prompt: ${generatedPrompt.slice(0, 150)}...`);

      // Build content array for Google GenAI
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      const fullPrompt = `Virtual try-on fashion photo: Create an image of this person (shown in the first reference image) wearing the clothing item shown in the second reference image.

Reference Image 1: Photo of the person who should be wearing the item
Reference Image 2: ${itemDescription}

${generatedPrompt}

Important:
- Keep the person's face, body type & size, and identity exactly as shown in Reference Image 1
- Dress them in the item from Reference Image 2
- Show ONLY this single item - no other clothing items or outfits
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

      // Add item image as second reference (if available)
      if (itemImageBase64) {
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: itemImageBase64,
          },
        });
      }

      console.log(`[WORKFLOW:ITEM_TRYON] Calling Gemini image generation...`);

      // Call Google GenAI
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
            console.log(`[WORKFLOW:ITEM_TRYON] Successfully generated image!`);
            break;
          }
        }
      }

      // If no image generated, try with simpler approach
      if (!generatedImageBase64) {
        console.warn(`[WORKFLOW:ITEM_TRYON] No image from first attempt, trying simpler approach...`);

        const simpleResponse = await genAI.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [
            {
              text: `Generate a professional fashion photograph of a person wearing: ${itemDescription}. 
Make it look like a high-end fashion editorial photo with clean background and natural lighting.
Show ONLY this single item prominently.`,
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
              console.log(`[WORKFLOW:ITEM_TRYON] Generated image with simpler approach`);
              break;
            }
          }
        }
      }

      if (!generatedImageBase64) {
        throw new Error('Image generation failed - model did not return an image.');
      }

      // Store the generated image
      console.log(`[WORKFLOW:ITEM_TRYON] Storing generated image...`);
      const imageBytes = Buffer.from(generatedImageBase64, 'base64');
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const storageId: Id<'_storage'> = await ctx.storage.store(imageBlob);
      console.log(`[WORKFLOW:ITEM_TRYON] Stored image with storageId ${storageId}`);

      // Update try-on status to completed
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.tryOnId,
        status: 'completed',
        storageId,
        generationProvider: 'google-gemini',
      });

      const elapsed = Date.now() - startTime;
      console.log(`[WORKFLOW:ITEM_TRYON] Image generation complete in ${elapsed}ms`);

      return {
        success: true as const,
        storageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WORKFLOW:ITEM_TRYON] Image generation failed:`, errorMessage);

      // Update try-on status to failed
      await ctx.runMutation(internal.itemTryOns.mutations.updateItemTryOnStatus, {
        itemTryOnId: args.tryOnId,
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
