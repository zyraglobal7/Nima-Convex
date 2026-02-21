/**
 * Chat Mutations
 * Mutations for creating looks and handling chat-based workflows
 */

import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { generatePublicId } from '../types';

// Validators
// const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));
// const budgetValidator = v.union(v.literal('low'), v.literal('mid'), v.literal('premium'));

// ============================================
// SMART OUTFIT MATCHING SYSTEM
// ============================================

/**
 * Formality levels for style coherence
 * Items within 1 level can be combined, items 2+ levels apart should not be mixed
 */
type FormalityLevel = 'casual' | 'smart_casual' | 'formal' | 'evening';

const FORMALITY_ORDER: FormalityLevel[] = ['casual', 'smart_casual', 'formal', 'evening'];

// Keywords that indicate formality level (checked against name, subcategory, tags)
const FORMALITY_KEYWORDS: Record<FormalityLevel, string[]> = {
  casual: [
    'sweatpants', 'hoodie', 'sneakers', 'track pants', 't-shirt', 'tee',
    'joggers', 'slides', 'flip-flops', 'cargo', 'denim', 'jeans', 'casual',
    'streetwear', 'athleisure', 'sporty', 'relaxed', 'everyday', 'weekend'
  ],
  smart_casual: [
    'chinos', 'polo', 'loafers', 'blazer', 'cardigan', 'khaki', 'button-up',
    'smart', 'brunch', 'date', 'work', 'office', 'business casual', 'preppy',
    'classic', 'timeless', 'versatile', 'refined'
  ],
  formal: [
    'dress pants', 'dress shirt', 'oxford', 'heels', 'boots', 'formal',
    'suit', 'tailored', 'professional', 'meeting', 'interview', 'elegant',
    'sophisticated', 'polished', 'structured'
  ],
  evening: [
    'gown', 'cocktail dress', 'tuxedo', 'evening', 'black tie', 'red carpet',
    'glamorous', 'luxe', 'party', 'gala', 'wedding', 'prom', 'ball'
  ]
};

/**
 * Detect if an item is a complete outfit (set, dress, jumpsuit, etc.)
 * These items should NOT be mixed with other tops/bottoms
 */
function isCompleteOutfit(item: Doc<'items'>): boolean {
  // Category-based detection
  if (item.category === 'outfit' || item.category === 'dress') {
    return true;
  }
  
  // Name-based detection for sets (items that are top+bottom combos)
  const setKeywords = [
    'set', 'suit', 'combo', 'matching', 'co-ord', 'coord',
    'jumpsuit', 'romper', 'overall', 'and pants', 'and trouser',
    'and shorts', 'and skirt', 'two-piece', 'two piece'
  ];
  const nameLower = item.name.toLowerCase();
  
  return setKeywords.some(keyword => nameLower.includes(keyword));
}

/**
 * Get the formality level of an item based on its name, subcategory, and tags
 * Returns the most formal level found, or 'smart_casual' as default
 */
function getFormalityLevel(item: Doc<'items'>): FormalityLevel {
  const searchText = [
    item.name.toLowerCase(),
    item.subcategory?.toLowerCase() || '',
    ...item.tags.map(t => t.toLowerCase()),
    ...(item.occasion || []).map(o => o.toLowerCase())
  ].join(' ');
  
  // Check from most formal to least formal (evening -> casual)
  // Return the highest formality level found
  for (const level of [...FORMALITY_ORDER].reverse()) {
    const keywords = FORMALITY_KEYWORDS[level];
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return level;
    }
  }
  
  // Default to smart_casual if no clear match
  return 'smart_casual';
}

/**
 * Check if two items are compatible based on formality level
 * Items within 1 formality level can be combined
 */
function areItemsCompatible(item1: Doc<'items'>, item2: Doc<'items'>): boolean {
  const level1 = FORMALITY_ORDER.indexOf(getFormalityLevel(item1));
  const level2 = FORMALITY_ORDER.indexOf(getFormalityLevel(item2));
  
  // Allow items within 1 formality level difference
  return Math.abs(level1 - level2) <= 1;
}

/**
 * Calculate coherence score between two items
 * Higher score = better match
 */
function calculateCoherenceScore(item1: Doc<'items'>, item2: Doc<'items'>): number {
  let score = 0;
  
  // Formality match (most important)
  const level1 = FORMALITY_ORDER.indexOf(getFormalityLevel(item1));
  const level2 = FORMALITY_ORDER.indexOf(getFormalityLevel(item2));
  const formalityDiff = Math.abs(level1 - level2);
  
  if (formalityDiff === 0) {
    score += 25; // Same formality level
  } else if (formalityDiff === 1) {
    score += 15; // Adjacent formality level
  } else {
    score -= 20; // Penalty for incompatible formality
  }
  
  // Occasion match
  const occasions1 = new Set(item1.occasion?.map(o => o.toLowerCase()) || []);
  const occasions2 = new Set(item2.occasion?.map(o => o.toLowerCase()) || []);
  const sharedOccasions = [...occasions1].filter(o => occasions2.has(o));
  score += sharedOccasions.length * 15;
  
  // Tag overlap
  const tags1 = new Set(item1.tags.map(t => t.toLowerCase()));
  const tags2 = new Set(item2.tags.map(t => t.toLowerCase()));
  const sharedTags = [...tags1].filter(t => tags2.has(t));
  score += sharedTags.length * 5;
  
  // Color harmony (basic check - neutral colors go with everything)
  const neutralColors = ['black', 'white', 'grey', 'gray', 'beige', 'navy', 'brown', 'cream'];
  const colors1 = item1.colors.map(c => c.toLowerCase());
  const colors2 = item2.colors.map(c => c.toLowerCase());
  
  const hasNeutral1 = colors1.some(c => neutralColors.includes(c));
  const hasNeutral2 = colors2.some(c => neutralColors.includes(c));
  
  if (hasNeutral1 || hasNeutral2) {
    score += 5; // Neutral colors are versatile
  }
  
  // Same color family bonus
  const sharedColors = colors1.filter(c => colors2.includes(c));
  if (sharedColors.length > 0) {
    score += 10; // Matching colors
  }
  
  return score;
}

/**
 * Check if an item is compatible with all items in a collection
 * Returns true only if the item is coherent with ALL existing items
 */
function isItemCoherentWithLook(
  newItem: Doc<'items'>,
  existingItems: Doc<'items'>[],
  minCoherenceScore: number = 10
): boolean {
  if (existingItems.length === 0) return true;
  
  // Check formality compatibility with all items
  for (const existing of existingItems) {
    if (!areItemsCompatible(newItem, existing)) {
      return false;
    }
  }
  
  // Calculate average coherence score
  const totalScore = existingItems.reduce(
    (sum, existing) => sum + calculateCoherenceScore(newItem, existing),
    0
  );
  const avgScore = totalScore / existingItems.length;
  
  return avgScore >= minCoherenceScore;
}

/**
 * Get categories that are allowed to be added to a complete outfit
 * Sets/dresses should only have accessories added, not more clothing
 */
function getAllowedCategoriesForCompleteOutfit(): ItemCategory[] {
  return ['shoes', 'accessory', 'bag', 'jewelry'];
}

// Type for item category
type ItemCategory = 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear' | 'shoes' | 'accessory' | 'bag' | 'jewelry';

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

    // Check if user has a primary image for try-on (use .first() to handle duplicate primaries gracefully)
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .first();

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
      creationSource: 'chat',
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
 * Create multiple looks from chat based on user preferences (3 looks)
 * Matches items from the items table and creates pending looks for image generation
 * 
 * Detects if matched items overlap with user's previous looks and returns:
 * - scenario: 'fresh' - All new items the user hasn't tried before
 * - scenario: 'remix' - More than half the items overlap with previous looks
 * 
 * @returns lookIds if items were found and looks were created, error if no matching items
 */
export const createLooksFromChat = mutation({
  args: {
    occasion: v.optional(v.string()),
    context: v.optional(v.string()), // Additional context from chat (e.g., "date night", "work meeting")
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      lookIds: v.array(v.id('looks')),
      scenario: v.union(v.literal('fresh'), v.literal('remix')),
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
    | { success: true; lookIds: Id<'looks'>[]; scenario: 'fresh' | 'remix'; message: string }
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

    // Check if user has a primary image for try-on (use .first() to handle duplicate primaries gracefully)
    const userImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .first();

    if (!userImage) {
      // Try to find any user image
      const anyImage = await ctx.db
        .query('user_images')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();

      if (!anyImage) {
        return {
          success: false,
          message: 'no_photo',
        };
      }
    }

    // --- CREDIT CHECK (3 credits for 3 looks) ---
    const creditResult = await ctx.runMutation(internal.credits.mutations.deductCredit, {
      userId: user._id,
      count: 3,
    });

    if (!creditResult.success) {
      return {
        success: false,
        message: 'insufficient_credits',
      };
    }

    // Get user preferences for matching
    const userGender = user.gender === 'prefer-not-to-say' ? undefined : user.gender;
    const userStyles = user.stylePreferences || [];
    const userBudget = user.budgetRange;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:createLooksFromChat:userPrefs',message:'User preferences extracted',data:{userGender,userStyles,userBudget,userId:user._id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H3'})}).catch(()=>{});
    // #endregion

    // Get user's previous looks to detect item overlap
    const previousLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .take(20);
    
    // Build set of all previously used item IDs
    const previousItemIds = new Set<string>();
    for (const look of previousLooks) {
      for (const itemId of look.itemIds) {
        previousItemIds.add(itemId);
      }
    }
    console.log(`[Chat:Mutation] User has ${previousLooks.length} previous looks with ${previousItemIds.size} unique items`);

    // Create 3 looks with different strategies
    const lookIds: Id<'looks'>[] = [];
    const usedItemIds = new Set<string>();
    const allMatchedItemIds: string[] = []; // Track all matched items for overlap calculation
    const now = Date.now();

    // Strategy Execution with Fallback
    // Attempt 1: Strict matching (uses style preferences, budget)
    // Attempt 2: Relaxed matching (ignores style prefs/budget penalty if strict failed to find ANY looks)
    
    let attempts = 0;
    const maxAttempts = 2;
    let fallbackTriggered = false;

    while (lookIds.length === 0 && attempts < maxAttempts) {
      const isFallback = attempts === 1;
      fallbackTriggered = isFallback;
      
      if (isFallback) {
        console.log('[Chat:Mutation] Strict matching yielded 0 looks. Retrying with relaxed constraints...');
      }

      // Try to create 3 looks using different outfit strategies
      for (let i = 0; i < 3; i++) {
        const matchedItems = await matchItemsForLookWithExclusions(ctx, {
          gender: userGender,
          stylePreferences: userStyles,
          budgetRange: userBudget,
          occasion: args.occasion,
          excludeItemIds: usedItemIds,
          strategyIndex: i, // Use different strategies for variety
          ignorePreferences: isFallback, // Pass fallback flag
        });

        if (matchedItems.length < 2) {
          // Not enough items for this look, skip
          continue;
        }

        // Mark items as used and track for overlap
        matchedItems.forEach((item) => {
          usedItemIds.add(item._id);
          allMatchedItemIds.push(item._id);
        });

        // Calculate total price
        let totalPrice = 0;
        let currency = 'KES';
        for (const item of matchedItems) {
          totalPrice += item.price;
          currency = item.currency;
        }

        const publicId = generatePublicId('look');
        const styleTags = [...new Set(matchedItems.flatMap((item) => item.tags))].slice(0, 5);
        const nimaComment = generateNimaComment(args.occasion, args.context, user.firstName);

        // Vary the look names
        const lookNames = [
          args.occasion ? `${args.occasion} Look #1` : 'Option 1',
          args.occasion ? `${args.occasion} Look #2` : 'Option 2',
          args.occasion ? `${args.occasion} Look #3` : 'Option 3',
        ];

        const lookId = await ctx.db.insert('looks', {
          publicId,
          itemIds: matchedItems.map((item) => item._id),
          totalPrice,
          currency,
          name: lookNames[i],
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
          creationSource: 'chat',
          createdAt: now,
          updatedAt: now,
        });

        lookIds.push(lookId);
      }
      
      attempts++;
    }

    if (lookIds.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:createLooksFromChat:noLooks',message:'No looks created even after fallback - returning no_matches',data:{userGender,userBudget,occasion:args.occasion},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
      // #endregion
      return {
        success: false,
        message: 'no_matches',
      };
    }

    // Calculate overlap ratio to determine scenario
    const overlappingItems = allMatchedItemIds.filter((id) => previousItemIds.has(id));
    const overlapRatio = allMatchedItemIds.length > 0 
      ? overlappingItems.length / allMatchedItemIds.length 
      : 0;
    
    // Scenario: 'remix' if more than 50% of items overlap with previous looks
    const scenario: 'fresh' | 'remix' = overlapRatio > 0.5 ? 'remix' : 'fresh';

    console.log(`[Chat:Mutation] Created ${lookIds.length} looks. Overlap: ${overlappingItems.length}/${allMatchedItemIds.length} (${(overlapRatio * 100).toFixed(1)}%) - Scenario: ${scenario}`);

    const message = fallbackTriggered
      ? `I couldn't find exact matches for everything, but I found ${lookIds.length} looks that capture the vibe! ✨`
      : scenario === 'remix'
        ? `I found ${lookIds.length} looks - some featuring items you've loved before with fresh combinations!`
        : `I found ${lookIds.length} amazing looks for you! Step into the fitting room to see yourself in these outfits.`;

    return {
      success: true,
      lookIds,
      scenario,
      message,
    };
  },
});

/**
 * Match items for a look with exclusions (for creating multiple looks)
 * Uses smart coherence scoring to ensure items make sense together
 */
async function matchItemsForLookWithExclusions(
  ctx: MutationCtx,
  preferences: {
    gender?: 'male' | 'female';
    stylePreferences: string[];
    budgetRange?: 'low' | 'mid' | 'premium';
    occasion?: string;
    excludeItemIds: Set<string>;
    strategyIndex: number;
    ignorePreferences?: boolean; // New flag for fallback
  }
): Promise<Doc<'items'>[]> {
  // Rotate through strategies based on index
  const strategyOrder = [
    outfitStrategies[preferences.strategyIndex % outfitStrategies.length],
    ...outfitStrategies.filter((_, i) => i !== preferences.strategyIndex % outfitStrategies.length),
  ];

  // Budget ranges in KES (matching actual database prices after migration)
  const budgetRanges = {
    low: { min: 0, max: 3000 },       // 0 - 3,000 KES
    mid: { min: 3000, max: 15000 },   // 3,000 - 15,000 KES
    premium: { min: 15000, max: Infinity }, // 15,000+ KES
  };

  async function getItemsByCategory(
    category: ItemCategory,
    limit: number = 100 // Increased from 50 to 100
  ): Promise<Array<{ item: Doc<'items'>; score: number }>> {
    let items: Doc<'items'>[] = [];
    
    if (preferences.gender) {
      const genderQuery = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', preferences.gender!).eq('category', category)
        );
      const genderItems = await genderQuery.take(limit);
      
      const unisexQuery = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', 'unisex').eq('category', category)
        );
      const unisexItems = await unisexQuery.take(limit);
      
      items = [...genderItems, ...unisexItems];
    } else {
      const query = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', category)
        );
      items = await query.take(limit);
    }

    // #region agent log
    const rawCount = items.length;
    fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:getItemsByCategory',message:'Items fetched',data:{category,rawCount,ignorePreferences:preferences.ignorePreferences},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H4'})}).catch(()=>{});
    // #endregion

    return items
      .filter((item) => item.isActive)
      .filter((item) => !preferences.excludeItemIds.has(item._id)) // Exclude already used items
      // REMOVED STRICT BUDGET FILTER - now handled in scoring
      .map((item) => {
        let score = Math.random() * 5; // Base score

        // 1. Style Preferences Scoring (skipped if ignorePreferences is true)
        if (!preferences.ignorePreferences && preferences.stylePreferences.length > 0) {
          const styleSet = new Set(preferences.stylePreferences.map((s) => s.toLowerCase()));
          const matchingTags = item.tags.filter((tag) => styleSet.has(tag.toLowerCase()));
          score += matchingTags.length * 10;
        }

        const occasionLower = preferences.occasion?.toLowerCase() || '';
        
        // 2. Occasion/Context Scoring (Name/Description match) - HIGH PRIORITY
        if (occasionLower) {
          const nameLower = item.name.toLowerCase();
          const descLower = item.description?.toLowerCase() || '';
          
          // Direct name match is huge
          if (nameLower.includes(occasionLower)) {
            score += 50; 
          }
          // Description match
          else if (descLower.includes(occasionLower)) {
            score += 30;
          }
          // Tag match
          if (item.tags.some((t) => t.toLowerCase().includes(occasionLower))) {
            score += 15;
          }
          // Occasion field match
          if (item.occasion && item.occasion.some((o) => o.toLowerCase().includes(occasionLower))) {
            score += 20;
          }
        }

        // 3. Budget Scoring (Penalty instead of Filter)
        if (!preferences.ignorePreferences && preferences.budgetRange) {
          const range = budgetRanges[preferences.budgetRange];
          if (item.price >= range.min && item.price <= range.max) {
             score += 10; // Bonus for matching budget
          } else {
             score -= 20; // Penalty for mismatch, but doesn't hard exclude
          }
        }

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  // Try each strategy
  for (const strategy of strategyOrder) {
    const matchedItems: Doc<'items'>[] = [];
    const usedItemIds = new Set<string>();
    let baseIsCompleteOutfit = false;

    // Step 1: Get base items
    let baseComplete = true;
    for (const category of strategy.base) {
      const items = await getItemsByCategory(category);
      
      // Find a compatible item
      let selectedItem: Doc<'items'> | null = null;
      
      for (const { item } of items) {
        if (usedItemIds.has(item._id)) continue;
        
        // Check coherence with existing items
        if (matchedItems.length > 0 && !isItemCoherentWithLook(item, matchedItems)) {
          continue;
        }
        
        selectedItem = item;
        break;
      }
      
      if (selectedItem) {
        matchedItems.push(selectedItem);
        usedItemIds.add(selectedItem._id);
        
        // Check if this is a complete outfit (set/dress)
        if (isCompleteOutfit(selectedItem)) {
          baseIsCompleteOutfit = true;
        }
      } else {
        baseComplete = false;
        break;
      }
    }

    if (!baseComplete) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:matchItemsForLookWithExclusions:strategyFailed',message:'Strategy failed - base incomplete',data:{strategyName:strategy.name,requiredBase:strategy.base,matchedCount:matchedItems.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H3'})}).catch(()=>{});
      // #endregion
      continue;
    }

    // Step 2: Determine allowed optional categories
    // If base is a complete outfit, only add accessories (no tops/bottoms/outerwear)
    let allowedOptional = strategy.optional;
    if (baseIsCompleteOutfit || strategy.isCompleteBase) {
      allowedOptional = getAllowedCategoriesForCompleteOutfit().filter(
        cat => strategy.optional.includes(cat)
      );
      console.log(`[Chat:Matching] Base is complete outfit, limiting optional to: ${allowedOptional.join(', ')}`);
    }

    // Step 3: Add optional items with coherence check
    const optionalSlots = Math.min(
      strategy.maxItems - matchedItems.length,
      Math.max(1, Math.floor(Math.random() * 2)) // Add 1-2 optional items
    );

    // Shuffle optional categories for variety
    const shuffledOptional = [...allowedOptional].sort(() => Math.random() - 0.5);

    for (const category of shuffledOptional) {
      if (matchedItems.length >= strategy.maxItems) break;
      if (matchedItems.length >= strategy.base.length + optionalSlots) break;

      const items = await getItemsByCategory(category);
      
      // Find a coherent item
      let selectedItem: Doc<'items'> | null = null;
      
      for (const { item } of items) {
        if (usedItemIds.has(item._id)) continue;
        
        // CRITICAL: Check coherence with all existing items
        if (!isItemCoherentWithLook(item, matchedItems)) {
          console.log(`[Chat:Matching] Skipping ${item.name} - not coherent with existing items`);
          continue;
        }
        
        selectedItem = item;
        break;
      }
      
      if (selectedItem) {
        matchedItems.push(selectedItem);
        usedItemIds.add(selectedItem._id);
        console.log(`[Chat:Matching] Added ${selectedItem.name} (${selectedItem.category}) - formality: ${getFormalityLevel(selectedItem)}`);
      }
    }

    if (matchedItems.length >= strategy.minItems) {
      // Log the final look composition
      console.log(`[Chat:Matching] Created look with ${matchedItems.length} items using ${strategy.name} strategy:`);
      matchedItems.forEach(item => {
        console.log(`  - ${item.name} (${item.category}, ${getFormalityLevel(item)})`);
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:matchItemsForLookWithExclusions:success',message:'Strategy succeeded',data:{strategyName:strategy.name,matchedCount:matchedItems.length,items:matchedItems.map(i=>({name:i.name,category:i.category}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H5'})}).catch(()=>{});
      // #endregion
      return matchedItems;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5d407c11-6781-42e2-9459-00c476ac031a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mutations.ts:matchItemsForLookWithExclusions:allFailed',message:'ALL strategies failed - returning empty',data:{strategiesTried:outfitStrategies.map(s=>s.name)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H5'})}).catch(()=>{});
  // #endregion
  return [];
}

/**
 * Outfit building strategies - defines different ways to compose an outfit
 * Each strategy has required base categories and optional additions
 * NOTE: ItemCategory type is defined at the top of this file
 */
interface OutfitStrategy {
  name: string;
  base: ItemCategory[]; // Required items for a complete outfit
  optional: ItemCategory[]; // Optional items to enhance the look
  minItems: number; // Minimum items needed
  maxItems: number; // Maximum items to include
  isCompleteBase: boolean; // If true, base is already a complete outfit (set/dress)
}

const outfitStrategies: OutfitStrategy[] = [
  // Dress-based outfit - dress is already a complete outfit
  {
    name: 'dress_outfit',
    base: ['dress'],
    optional: ['shoes', 'accessory', 'bag', 'jewelry'],
    minItems: 1,
    maxItems: 3,
    isCompleteBase: true, // Dress is complete - don't add tops/bottoms
  },
  // Pre-styled outfit/set - already a complete outfit (like matching sets, co-ords)
  {
    name: 'set_outfit',
    base: ['outfit'],
    optional: ['shoes', 'accessory', 'bag', 'jewelry'],
    minItems: 1,
    maxItems: 3,
    isCompleteBase: true, // Set is complete - don't add tops/bottoms
  },
  // Classic top + bottom
  {
    name: 'separates',
    base: ['top', 'bottom'],
    optional: ['shoes', 'accessory'],
    minItems: 2,
    maxItems: 3,
    isCompleteBase: false,
  },
  // Layered look with outerwear (only when weather/occasion calls for it)
  {
    name: 'layered',
    base: ['top', 'bottom'],
    optional: ['shoes', 'outerwear'],
    minItems: 2,
    maxItems: 3,
    isCompleteBase: false,
  },
];

/**
 * Match items for creating a complete look based on user preferences
 * Uses smart outfit composition with coherence scoring to ensure items make sense together
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
  // Budget ranges in KES (matching actual database prices after migration)
  const budgetRanges = {
    low: { min: 0, max: 3000 },       // 0 - 3,000 KES
    mid: { min: 3000, max: 15000 },   // 3,000 - 15,000 KES
    premium: { min: 15000, max: Infinity }, // 15,000+ KES
  };

  // Helper to get items by category with scoring
  // Fetches both gender-specific items AND unisex items to ensure variety
  async function getItemsByCategory(
    category: ItemCategory,
    limit: number = 50
  ): Promise<Array<{ item: Doc<'items'>; score: number }>> {
    let items: Doc<'items'>[] = [];
    
    if (preferences.gender) {
      // Get gender-specific items
      const genderQuery = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', preferences.gender!).eq('category', category)
        );
      const genderItems = await genderQuery.take(limit);
      
      // Also get unisex items for this category
      const unisexQuery = ctx.db
        .query('items')
        .withIndex('by_gender_and_category', (q) =>
          q.eq('gender', 'unisex').eq('category', category)
        );
      const unisexItems = await unisexQuery.take(limit);
      
      items = [...genderItems, ...unisexItems];
    } else {
      // No gender preference - get all items in this category
      const query = ctx.db
        .query('items')
        .withIndex('by_active_and_category', (q) =>
          q.eq('isActive', true).eq('category', category)
        );
      items = await query.take(limit);
    }

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
    let baseIsCompleteOutfit = false;

    // Try to get base items with coherence checking
    let baseComplete = true;
    for (const category of strategy.base) {
      const items = await getItemsByCategory(category);
      
      // Find a compatible item
      let selectedItem: Doc<'items'> | null = null;
      
      for (const { item } of items) {
        if (usedItemIds.has(item._id)) continue;
        
        // Check coherence with existing items
        if (matchedItems.length > 0 && !isItemCoherentWithLook(item, matchedItems)) {
          continue;
        }
        
        selectedItem = item;
        break;
      }
      
      if (selectedItem) {
        matchedItems.push(selectedItem);
        usedItemIds.add(selectedItem._id);
        
        // Check if this is a complete outfit (set/dress)
        if (isCompleteOutfit(selectedItem)) {
          baseIsCompleteOutfit = true;
        }
      } else {
        baseComplete = false;
        break;
      }
    }

    // If base is not complete, try next strategy
    if (!baseComplete) {
      continue;
    }

    // Determine allowed optional categories based on whether base is a complete outfit
    let allowedOptional = strategy.optional;
    if (baseIsCompleteOutfit || strategy.isCompleteBase) {
      allowedOptional = getAllowedCategoriesForCompleteOutfit().filter(
        cat => strategy.optional.includes(cat)
      );
    }

    // Randomly decide how many optional items to add (1-2 items)
    const optionalSlots = Math.min(
      strategy.maxItems - matchedItems.length,
      Math.max(1, Math.floor(Math.random() * 2))
    );

    // Shuffle optional categories for variety
    const shuffledOptional = [...allowedOptional].sort(() => Math.random() - 0.5);

    // Add optional items with coherence checking
    for (const category of shuffledOptional) {
      if (matchedItems.length >= strategy.maxItems) break;
      if (matchedItems.length >= strategy.base.length + optionalSlots) break;

      const items = await getItemsByCategory(category);
      
      // Find a coherent item
      let selectedItem: Doc<'items'> | null = null;
      
      for (const { item } of items) {
        if (usedItemIds.has(item._id)) continue;
        
        // Check coherence with all existing items
        if (!isItemCoherentWithLook(item, matchedItems)) {
          continue;
        }
        
        selectedItem = item;
        break;
      }
      
      if (selectedItem) {
        matchedItems.push(selectedItem);
        usedItemIds.add(selectedItem._id);
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

/**
 * Create a mixed look by combining items from different existing looks
 * Supports both explicit item selection and remix-based creation
 */
export const createMixedLook = mutation({
  args: {
    itemIds: v.array(v.id('items')),
    occasion: v.optional(v.string()),
    mixType: v.union(v.literal('explicit'), v.literal('remix')),
    sourceLookIds: v.optional(v.array(v.id('looks'))), // For tracking
    context: v.optional(v.string()),
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
      itemIds: Id<'items'>[];
      occasion?: string;
      mixType: 'explicit' | 'remix';
      sourceLookIds?: Id<'looks'>[];
      context?: string;
    }
  ): Promise<
    | { success: true; lookId: Id<'looks'>; message: string }
    | { success: false; message: string }
  > => {
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
        message: 'User profile not found.',
      };
    }

    if (args.itemIds.length < 2) {
      return {
        success: false,
        message: 'Need at least 2 items to create a look.',
      };
    }

    // Validate all items exist and are active
    const validItems: Doc<'items'>[] = [];
    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || !item.isActive) {
        return {
          success: false,
          message: 'One or more items are no longer available.',
        };
      }
      validItems.push(item);
    }

    // Calculate total price
    let totalPrice = 0;
    let currency = 'KES';
    for (const item of validItems) {
      totalPrice += item.price;
      currency = item.currency;
    }

    // Generate look metadata
    const now = Date.now();
    const publicId = generatePublicId('look');
    const styleTags = [...new Set(validItems.flatMap((item) => item.tags))].slice(0, 5);
    const userGender = user.gender === 'prefer-not-to-say' ? 'unisex' : (user.gender || 'unisex');

    // Generate name based on mix type
    const lookName = args.mixType === 'remix' 
      ? `${args.occasion || 'Remixed'} Look`
      : `Custom Mix${args.occasion ? ` - ${args.occasion}` : ''}`;

    // Generate Nima comment for mixed look
    const nimaComment = args.mixType === 'remix'
      ? `I've remixed this look with a ${args.context || 'fresh'} twist just for you! These pieces work beautifully together.`
      : `I love this custom combination! You've got a great eye for mixing pieces. This look is uniquely you!`;

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: args.itemIds,
      totalPrice,
      currency,
      name: lookName,
      styleTags,
      occasion: args.occasion,
      nimaComment,
      targetGender: userGender,
      targetBudgetRange: user.budgetRange,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending',
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'chat',
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      lookId,
      message: args.mixType === 'remix'
        ? `I've created a fresh remix for you! Step into the fitting room to see yourself in this new combination.`
        : `Your custom mix is ready! I combined the pieces you selected into a new look.`,
    };
  },
});

/**
 * Create a remixed look based on an existing look with modifications
 * Finds similar items to swap while keeping the overall vibe
 */
export const createRemixedLook = mutation({
  args: {
    sourceLookId: v.id('looks'),
    twist: v.string(), // e.g., "more casual", "evening version", "work appropriate"
    occasion: v.optional(v.string()),
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
      sourceLookId: Id<'looks'>;
      twist: string;
      occasion?: string;
    }
  ): Promise<
    | { success: true; lookId: Id<'looks'>; message: string }
    | { success: false; message: string }
  > => {
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
        message: 'User profile not found.',
      };
    }

    // Get the source look
    const sourceLook = await ctx.db.get(args.sourceLookId);
    if (!sourceLook || !sourceLook.isActive) {
      return {
        success: false,
        message: 'Source look not found.',
      };
    }

    // Get source items
    const sourceItems: Doc<'items'>[] = [];
    for (const itemId of sourceLook.itemIds) {
      const item = await ctx.db.get(itemId);
      if (item && item.isActive) {
        sourceItems.push(item);
      }
    }

    if (sourceItems.length < 2) {
      return {
        success: false,
        message: 'Not enough valid items in source look.',
      };
    }

    // Determine which items to keep vs swap based on twist
    const twistLower = args.twist.toLowerCase();
    const swapCategories: string[] = [];
    
    // Simple heuristics for what to swap based on twist
    if (twistLower.includes('casual') || twistLower.includes('relaxed')) {
      swapCategories.push('shoes', 'bottom'); // Swap for more casual versions
    } else if (twistLower.includes('formal') || twistLower.includes('dress')) {
      swapCategories.push('shoes', 'top'); // Swap for more formal versions
    } else if (twistLower.includes('evening') || twistLower.includes('night')) {
      swapCategories.push('top', 'accessory');
    } else {
      // Default: swap one item randomly
      const randomIndex = Math.floor(Math.random() * sourceItems.length);
      swapCategories.push(sourceItems[randomIndex].category);
    }

    // Build new item list, finding alternatives for swap categories
    const newItemIds: Id<'items'>[] = [];
    const usedIds = new Set<string>();

    for (const item of sourceItems) {
      if (swapCategories.includes(item.category)) {
        // Find an alternative item
        const userGender = user.gender === 'prefer-not-to-say' ? undefined : user.gender;
        
        let alternatives: Doc<'items'>[] = [];
        if (userGender) {
          const genderItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) =>
              q.eq('gender', userGender).eq('category', item.category)
            )
            .take(20);
          const unisexItems = await ctx.db
            .query('items')
            .withIndex('by_gender_and_category', (q) =>
              q.eq('gender', 'unisex').eq('category', item.category)
            )
            .take(20);
          alternatives = [...genderItems, ...unisexItems];
        } else {
          alternatives = await ctx.db
            .query('items')
            .withIndex('by_active_and_category', (q) =>
              q.eq('isActive', true).eq('category', item.category)
            )
            .take(40);
        }

        // Filter out the original and already used items
        const validAlternatives = alternatives.filter(
          (alt) => alt.isActive && alt._id !== item._id && !usedIds.has(alt._id)
        );

        if (validAlternatives.length > 0) {
          // Pick a random alternative (weighted towards similar price range)
          const similar = validAlternatives
            .filter((alt) => Math.abs(alt.price - item.price) < item.price * 0.5);
          const selected = similar.length > 0
            ? similar[Math.floor(Math.random() * similar.length)]
            : validAlternatives[Math.floor(Math.random() * validAlternatives.length)];
          
          newItemIds.push(selected._id);
          usedIds.add(selected._id);
        } else {
          // Keep original if no alternatives
          newItemIds.push(item._id);
          usedIds.add(item._id);
        }
      } else {
        // Keep this item
        newItemIds.push(item._id);
        usedIds.add(item._id);
      }
    }

    // Get new items for price calculation
    const newItems: Doc<'items'>[] = [];
    for (const itemId of newItemIds) {
      const item = await ctx.db.get(itemId);
      if (item) {
        newItems.push(item);
      }
    }

    // Calculate total price
    let totalPrice = 0;
    let currency = 'KES';
    for (const item of newItems) {
      totalPrice += item.price;
      currency = item.currency;
    }

    // Generate look metadata
    const now = Date.now();
    const publicId = generatePublicId('look');
    const styleTags = [...new Set(newItems.flatMap((item) => item.tags))].slice(0, 5);
    const userGender = user.gender === 'prefer-not-to-say' ? 'unisex' : (user.gender || 'unisex');

    const lookName = args.occasion 
      ? `${args.occasion} Remix`
      : `${sourceLook.name || 'Look'} - ${args.twist} version`;

    const nimaComment = `I took your ${sourceLook.occasion || 'previous'} look and gave it a ${args.twist} spin! Some pieces are the same but I swapped a few to give you that new vibe.`;

    const lookId = await ctx.db.insert('looks', {
      publicId,
      itemIds: newItemIds,
      totalPrice,
      currency,
      name: lookName,
      styleTags,
      occasion: args.occasion || sourceLook.occasion,
      nimaComment,
      targetGender: userGender,
      targetBudgetRange: user.budgetRange,
      isActive: true,
      isFeatured: false,
      viewCount: 0,
      saveCount: 0,
      generationStatus: 'pending',
      createdBy: 'user',
      creatorUserId: user._id,
      creationSource: 'chat',
      originalLookId: args.sourceLookId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      lookId,
      message: `I've remixed your look with a ${args.twist} twist! Step into the fitting room to see this fresh take.`,
    };
  },
});

/**
 * Schedule image generation for chat looks
 * This is a mutation (not an action) so authentication completes instantly
 * before any long-running work. Each image generation is scheduled as an
 * independent internal action via ctx.scheduler.runAfter, avoiding token
 * expiry issues that occur when sequentially running actions.
 */
export const scheduleChatLookImageGeneration = mutation({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.object({
    success: v.boolean(),
    scheduled: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { lookIds: Id<'looks'>[] }
  ): Promise<{
    success: boolean;
    scheduled: number;
  }> => {
    // Get current user (fast — happens before any long-running work)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, scheduled: 0 };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, scheduled: 0 };
    }

    // Schedule each image generation independently (runs in parallel, no token dependency)
    for (const lookId of args.lookIds) {
      await ctx.scheduler.runAfter(0, internal.workflows.actions.generateLookImage, {
        lookId,
        userId: user._id,
      });
    }

    return {
      success: true,
      scheduled: args.lookIds.length,
    };
  },
});
