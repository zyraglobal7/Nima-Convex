/**
 * Chat Mutations
 * Mutations for creating looks and handling chat-based workflows
 */

import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { generatePublicId } from '../types';

// Validators
const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));
const budgetValidator = v.union(v.literal('low'), v.literal('mid'), v.literal('premium'));

/**
 * Create a look from chat based on user preferences
 * Matches items from the items table and creates a pending look for image generation
 * 
 * @returns lookId if items were found and look was created, null if no matching items
 */
export const createLookFromChat = mutation({
  args: {
    occasion: v.optional(v.string()),
    context: v.optional(v.string()), // Additional context from chat (e.g., "date night", "work meeting")
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      lookId: v.id('looks'),
      message: v.string(),
    }),
    v.object({
      success: v.literal(false),
      message: v.string(),
    })
  ),
  handler: async (
    ctx: MutationCtx,
    args: {
      occasion?: string;
      context?: string;
    }
  ): Promise<
    | { success: true; lookId: Id<'looks'>; message: string }
    | { success: false; message: string }
  > => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        message: 'Please sign in to create looks.',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        message: 'User profile not found. Please complete onboarding.',
      };
    }

    // Check if user has a primary image for try-on
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .unique();

    if (!userImage) {
      // Try to find any user image
      const anyImage = await ctx.db
        .query('user_images')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();

      if (!anyImage) {
        return {
          success: false,
          message: 'Please upload a photo first so I can show you wearing these outfits!',
        };
      }
    }

    // Get user preferences for matching
    const userGender = user.gender === 'prefer-not-to-say' ? undefined : user.gender;
    const userStyles = user.stylePreferences || [];
    const userBudget = user.budgetRange;

    // Match items based on user preferences
    // We need items from different categories to create a complete look
    const matchedItems = await matchItemsForLook(ctx, {
      gender: userGender,
      stylePreferences: userStyles,
      budgetRange: userBudget,
      occasion: args.occasion,
    });

    if (matchedItems.length < 2) {
      return {
        success: false,
        message: 'no_matches',
      };
    }

    // Calculate total price
    let totalPrice = 0;
    let currency = 'KES';
    for (const item of matchedItems) {
      totalPrice += item.price;
      currency = item.currency;
    }

    // Create the look
    const now = Date.now();
    const publicId = generatePublicId('look');

    // Determine style tags from matched items
    const styleTags = [...new Set(matchedItems.flatMap((item) => item.tags))].slice(0, 5);

    // Generate a Nima comment based on the occasion/context
    const nimaComment = generateNimaComment(args.occasion, args.context, user.firstName);

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: matchedItems.map((item) => item._id),
      totalPrice,
      currency,
      name: args.occasion ? `${args.occasion} Look` : 'Curated Look',
      styleTags,
      occasion: args.occasion,
      nimaComment,
      targetGender: userGender || 'unisex',
      targetBudgetRange: userBudget,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending',
      createdBy: 'user',
      creatorUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      lookId,
      message: `I found ${matchedItems.length} items that match your style! Step into the fitting room to see yourself in this look.`,
    };
  },
});

/**
 * Outfit building strategies - defines different ways to compose an outfit
 * Each strategy has required base categories and optional additions
 */
type ItemCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';

interface OutfitStrategy {
  name: string;
  base: ItemCategory[]; // Required items for a complete outfit
  optional: ItemCategory[]; // Optional items to enhance the look
  minItems: number; // Minimum items needed
  maxItems: number; // Maximum items to include
}

const outfitStrategies: OutfitStrategy[] = [
  // Dress-based outfit - dress is already a complete outfit
  {
    name: 'dress_outfit',
    base: ['dress'],
    optional: ['shoes', 'accessory', 'bag', 'jewelry'],
    minItems: 1,
    maxItems: 3,
  },
  // Classic top + bottom
  {
    name: 'separates',
    base: ['top', 'bottom'],
    optional: ['shoes', 'accessory', 'outerwear'],
    minItems: 2,
    maxItems: 4,
  },
  // Layered look with outerwear
  {
    name: 'layered',
    base: ['top', 'bottom', 'outerwear'],
    optional: ['shoes', 'accessory'],
    minItems: 3,
    maxItems: 4,
  },
];

/**
 * Match items for creating a complete look based on user preferences
 * Uses smart outfit composition to create 2-4 item looks depending on what makes sense
 */
async function matchItemsForLook(
  ctx: MutationCtx,
  preferences: {
    gender?: 'male' | 'female';
    stylePreferences: string[];
    budgetRange?: 'low' | 'mid' | 'premium';
    occasion?: string;
  }
): Promise<Doc<'items'>[]> {
  // Budget ranges in cents
  const budgetRanges = {
    low: { min: 0, max: 5000 }, // $0 - $50
    mid: { min: 5000, max: 20000 }, // $50 - $200
    premium: { min: 20000, max: Infinity }, // $200+
  };

  // Helper to get items by category with scoring
  async function getItemsByCategory(
    category: ItemCategory,
    limit: number = 50
  ): Promise<Array<{ item: Doc<'items'>; score: number }>> {
    let query;
    if (preferences.gender) {
      query = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', preferences.gender!).eq('category', category)
        );
    } else {
      query = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', category)
        );
    }

    const items = await query.take(limit);

    // Filter and score items
    return items
      .filter((item) => item.isActive)
      .filter((item) => {
        // Budget filter
        if (preferences.budgetRange) {
          const range = budgetRanges[preferences.budgetRange];
          return item.price >= range.min && item.price <= range.max;
        }
        return true;
      })
      .map((item) => {
        let score = Math.random() * 5; // Add slight randomness to avoid same items

        // Style preference matching
        if (preferences.stylePreferences.length > 0) {
          const styleSet = new Set(preferences.stylePreferences.map((s) => s.toLowerCase()));
          const matchingTags = item.tags.filter((tag) => styleSet.has(tag.toLowerCase()));
          score += matchingTags.length * 10;
        }

        // Occasion matching
        if (preferences.occasion && item.occasion) {
          const occasionLower = preferences.occasion.toLowerCase();
          if (item.occasion.some((o) => o.toLowerCase().includes(occasionLower))) {
            score += 20;
          }
        }

        // Tag matching for occasion
        if (preferences.occasion) {
          const occasionLower = preferences.occasion.toLowerCase();
          if (item.tags.some((t) => t.toLowerCase().includes(occasionLower))) {
            score += 15;
          }
        }

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  // Try each outfit strategy until we get a valid outfit
  for (const strategy of outfitStrategies) {
    const matchedItems: Doc<'items'>[] = [];
    const usedItemIds = new Set<string>();

    // Try to get base items
    let baseComplete = true;
    for (const category of strategy.base) {
      const items = await getItemsByCategory(category);
      const available = items.find((i) => !usedItemIds.has(i.item._id));
      
      if (available) {
        matchedItems.push(available.item);
        usedItemIds.add(available.item._id);
      } else {
        baseComplete = false;
        break;
      }
    }

    // If base is not complete, try next strategy
    if (!baseComplete) {
      continue;
    }

    // Randomly decide how many optional items to add (variety in outfit sizes)
    const optionalSlots = Math.min(
      strategy.maxItems - matchedItems.length,
      Math.floor(Math.random() * (strategy.optional.length + 1)) // 0 to optional.length items
    );

    // Shuffle optional categories for variety
    const shuffledOptional = [...strategy.optional].sort(() => Math.random() - 0.5);

    // Add optional items
    for (const category of shuffledOptional) {
      if (matchedItems.length >= strategy.maxItems) break;
      if (matchedItems.length >= strategy.base.length + optionalSlots) break;

      const items = await getItemsByCategory(category);
      const available = items.find((i) => !usedItemIds.has(i.item._id));
      
      if (available) {
        matchedItems.push(available.item);
        usedItemIds.add(available.item._id);
      }
    }

    // If we have at least minItems, return the outfit
    if (matchedItems.length >= strategy.minItems) {
      return matchedItems;
    }
  }

  // Fallback: try to get any 2 items that go together
  const fallbackItems: Doc<'items'>[] = [];
  const usedCategories = new Set<string>();

  // Try to get at least a top and bottom, or a dress
  const fallbackCategories: ItemCategory[] = ['dress', 'top', 'bottom', 'shoes'];
  
  for (const category of fallbackCategories) {
    if (fallbackItems.length >= 2) break;
    if (usedCategories.has(category)) continue;

    // Skip bottom if we already have a dress
    if (category === 'bottom' && usedCategories.has('dress')) continue;
    // Skip top if we already have a dress
    if (category === 'top' && usedCategories.has('dress')) continue;

    const items = await getItemsByCategory(category);
    if (items.length > 0) {
      fallbackItems.push(items[0].item);
      usedCategories.add(category);
    }
  }

  return fallbackItems;
}

/**
 * Generate a Nima comment for the look
 */
function generateNimaComment(
  occasion?: string,
  context?: string,
  userName?: string
): string {
  const greetings = userName ? [`${userName}, `, `Hey ${userName}! `, ''] : [''];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const occasionComments: Record<string, string[]> = {
    date: [
      "You're going to look absolutely stunning! This look has just the right mix of charm and confidence.",
      "Date night ready! This outfit says 'I put in effort but I'm effortlessly cool.'",
      "Trust me, they won't be able to take their eyes off you in this!",
    ],
    work: [
      "Professional but with personality - that's the vibe here. You'll command the room!",
      "This look means business while still showing off your style. Power move!",
      "Office-appropriate but make it fashion. You've got this!",
    ],
    casual: [
      "Easy, breezy, and totally you. Perfect for whatever the day brings!",
      "Relaxed vibes with elevated style - the best kind of casual.",
      "Comfort meets cool. This is giving effortless chic!",
    ],
    party: [
      "Time to shine! This look is made for making an entrance.",
      "Party-ready and absolutely gorgeous. Get ready to turn heads!",
      "This outfit says 'I'm here and I came to have fun!'",
    ],
  };

  const defaultComments = [
    "I curated this look just for you based on your style preferences!",
    "These pieces work beautifully together. You're going to love how this feels!",
    "Your style, elevated. I picked each piece to complement your vibe.",
    "This combination is *chef's kiss*. Trust the process!",
  ];

  let comments = defaultComments;
  if (occasion) {
    const occasionLower = occasion.toLowerCase();
    for (const [key, occasionCommentList] of Object.entries(occasionComments)) {
      if (occasionLower.includes(key)) {
        comments = occasionCommentList;
        break;
      }
    }
  }

  const comment = comments[Math.floor(Math.random() * comments.length)];
  return greeting + comment;
}
