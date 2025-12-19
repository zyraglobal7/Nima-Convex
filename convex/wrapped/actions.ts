'use node';

import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id, Doc } from '../_generated/dataModel';
import {
  getStyleEra,
  getPersonalityType,
  getQuarterMood,
  getColorInfo,
  generateWrappedShareToken,
  QUARTERLY_MOODS,
  TRENDING_TAGS_2025,
  SKIPPED_TRENDS_2025,
} from './constants';

// ============================================
// TYPES
// ============================================

interface ItemStats {
  itemId: Id<'items'>;
  name: string;
  count: number;
  brand?: string;
  colors: string[];
  tags: string[];
}

interface QuarterlyData {
  quarter: number;
  items: ItemStats[];
  tags: string[];
}

// ============================================
// CRON TRIGGER ACTION
// ============================================

/**
 * Daily check to see if we should run wrapped generation
 * This is called by the cron job every day at midnight UTC
 */
export const checkAndGenerateWrapped = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx: ActionCtx): Promise<null> => {
    const currentYear = new Date().getFullYear();

    // Get settings for current year
    const settings = await ctx.runQuery(internal.wrapped.internalQueries.getSettingsForYear, {
      year: currentYear,
    });

    if (!settings) {
      console.log(`No wrapped settings found for year ${currentYear}`);
      return null;
    }

    // Check if today is the run date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const runDate = new Date(settings.runDate);
    runDate.setHours(0, 0, 0, 0);
    const runDateTimestamp = runDate.getTime();

    if (todayTimestamp === runDateTimestamp) {
      console.log(`Running wrapped generation for year ${currentYear}`);
      await ctx.runAction(internal.wrapped.actions.generateAllWrapped, {
        year: currentYear,
      });
    } else {
      console.log(
        `Not wrapped day. Today: ${today.toISOString()}, Run date: ${runDate.toISOString()}`
      );
    }

    return null;
  },
});

// ============================================
// GENERATION ACTIONS
// ============================================

/**
 * Generate wrapped for all eligible users
 */
export const generateAllWrapped = internalAction({
  args: {
    year: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
  }),
  handler: async (
    ctx: ActionCtx,
    args: { year: number }
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> => {
    console.log(`Starting wrapped generation for year ${args.year}`);

    // Get all active users who have completed onboarding
    const users = await ctx.runQuery(internal.wrapped.internalQueries.getEligibleUsers, {});

    console.log(`Found ${users.length} eligible users`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process users in batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          processed++;
          try {
            await ctx.runAction(internal.wrapped.actions.generateUserWrapped, {
              userId: user._id,
              year: args.year,
            });
            succeeded++;
          } catch (error) {
            console.error(`Failed to generate wrapped for user ${user._id}:`, error);
            failed++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`Wrapped generation complete. Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}`);

    return { processed, succeeded, failed };
  },
});

/**
 * Generate wrapped for a single user
 */
export const generateUserWrapped = internalAction({
  args: {
    userId: v.id('users'),
    year: v.number(),
  },
  returns: v.union(v.id('user_wrapped'), v.null()),
  handler: async (
    ctx: ActionCtx,
    args: {
      userId: Id<'users'>;
      year: number;
    }
  ): Promise<Id<'user_wrapped'> | null> => {
    console.log(`Generating wrapped for user ${args.userId}, year ${args.year}`);

    // Get user data
    const user = await ctx.runQuery(internal.wrapped.internalQueries.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      console.log(`User ${args.userId} not found`);
      return null;
    }

    // Get year boundaries
    const yearStart = new Date(args.year, 0, 1).getTime();
    const yearEnd = new Date(args.year + 1, 0, 1).getTime();

    // Fetch all user activity for the year
    const lookbookItems = await ctx.runQuery(
      internal.wrapped.internalQueries.getUserLookbookItemsForYear,
      {
        userId: args.userId,
        yearStart,
        yearEnd,
      }
    );

    const lookImages = await ctx.runQuery(internal.wrapped.internalQueries.getUserLookImagesForYear, {
      userId: args.userId,
      yearStart,
      yearEnd,
    });

    const lookbooks = await ctx.runQuery(internal.wrapped.internalQueries.getUserLookbooksForYear, {
      userId: args.userId,
      yearStart,
      yearEnd,
    });

    // If user has no activity, skip
    if (lookbookItems.length === 0 && lookImages.length === 0) {
      console.log(`User ${args.userId} has no activity for year ${args.year}`);
      return null;
    }

    // Get item details for saved items
    const savedItemIds = lookbookItems
      .filter((li) => li.itemType === 'item' && li.itemId)
      .map((li) => li.itemId!);

    // Get look details and their items
    const savedLookIds = lookbookItems
      .filter((li) => li.itemType === 'look' && li.lookId)
      .map((li) => li.lookId!);

    const triedOnLookIds = lookImages.map((li) => li.lookId);

    // Fetch all items data
    const allItems = await ctx.runQuery(internal.wrapped.internalQueries.getItemsByIds, {
      itemIds: savedItemIds,
    });

    // Fetch look data to get their items
    const allLooks = await ctx.runQuery(internal.wrapped.internalQueries.getLooksByIds, {
      lookIds: [...new Set([...savedLookIds, ...triedOnLookIds])],
    });

    // Get all items from looks
    const lookItemIds = allLooks.flatMap((look) => look.itemIds);
    const lookItems = await ctx.runQuery(internal.wrapped.internalQueries.getItemsByIds, {
      itemIds: lookItemIds,
    });

    // Combine all items (using partial item type from internal queries)
    type PartialItem = {
      _id: Id<'items'>;
      name: string;
      brand?: string;
      colors: string[];
      tags: string[];
    };
    const allItemsMap = new Map<string, PartialItem>();
    [...allItems, ...lookItems].forEach((item) => {
      if (item) {
        allItemsMap.set(item._id, item);
      }
    });

    // ============================================
    // COMPUTE STATS
    // ============================================

    // 1. Top Items (both saved AND tried-on)
    const itemCounts = new Map<string, ItemStats>();

    // Count items from lookbook saves
    lookbookItems.forEach((li) => {
      if (li.itemType === 'item' && li.itemId) {
        const item = allItemsMap.get(li.itemId);
        if (item) {
          const existing = itemCounts.get(li.itemId) || {
            itemId: li.itemId as Id<'items'>,
            name: item.name,
            count: 0,
            brand: item.brand,
            colors: item.colors,
            tags: item.tags,
          };
          existing.count++;
          itemCounts.set(li.itemId, existing);
        }
      }
    });

    // Count items from look saves
    lookbookItems.forEach((li) => {
      if (li.itemType === 'look' && li.lookId) {
        const look = allLooks.find((l) => l._id === li.lookId);
        if (look) {
          look.itemIds.forEach((itemId) => {
            const item = allItemsMap.get(itemId);
            if (item) {
              const existing = itemCounts.get(itemId) || {
                itemId: itemId as Id<'items'>,
                name: item.name,
                count: 0,
                brand: item.brand,
                colors: item.colors,
                tags: item.tags,
              };
              existing.count++;
              itemCounts.set(itemId, existing);
            }
          });
        }
      }
    });

    // Count items from try-ons
    lookImages.forEach((li) => {
      const look = allLooks.find((l) => l._id === li.lookId);
      if (look) {
        look.itemIds.forEach((itemId) => {
          const item = allItemsMap.get(itemId);
          if (item) {
            const existing = itemCounts.get(itemId) || {
              itemId: itemId as Id<'items'>,
              name: item.name,
              count: 0,
              brand: item.brand,
              colors: item.colors,
              tags: item.tags,
            };
            existing.count++;
            itemCounts.set(itemId, existing);
          }
        });
      }
    });

    // Get top 5 items
    const topItems = Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        itemId: item.itemId,
        name: item.name,
        count: item.count,
      }));

    // 2. Color Palette
    const colorCounts = new Map<string, number>();
    let totalColorCount = 0;

    Array.from(itemCounts.values()).forEach((item) => {
      item.colors.forEach((color) => {
        const normalized = color.toLowerCase().trim();
        colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + item.count);
        totalColorCount += item.count;
      });
    });

    const colorPalette = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color, count]) => ({
        color: getColorInfo(color).displayName,
        percentage: Math.round((count / totalColorCount) * 100),
      }));

    // 3. Dominant Tags & Style Era
    const tagCounts = new Map<string, number>();
    Array.from(itemCounts.values()).forEach((item) => {
      item.tags.forEach((tag) => {
        const normalized = tag.toLowerCase().trim();
        tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + item.count);
      });
    });

    // Add style tags from looks
    allLooks.forEach((look) => {
      look.styleTags.forEach((tag) => {
        const normalized = tag.toLowerCase().trim();
        tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
      });
    });

    const dominantTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const styleEra = getStyleEra(dominantTags, user.gender);
    const styleEraName =
      user.gender === 'male' ? styleEra.nameVariantMale : styleEra.nameVariantFemale;
    const styleEraDescription =
      user.gender === 'male' ? styleEra.descriptionMale : styleEra.descriptionFemale;

    // 4. Mood Swings (quarterly)
    const quarterlyData: QuarterlyData[] = [
      { quarter: 1, items: [], tags: [] },
      { quarter: 2, items: [], tags: [] },
      { quarter: 3, items: [], tags: [] },
      { quarter: 4, items: [], tags: [] },
    ];

    lookbookItems.forEach((li) => {
      const date = new Date(li.createdAt);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const qData = quarterlyData[quarter - 1];

      if (li.itemType === 'item' && li.itemId) {
        const item = allItemsMap.get(li.itemId);
        if (item) {
          qData.items.push({
            itemId: li.itemId as Id<'items'>,
            name: item.name,
            count: 1,
            tags: item.tags,
            colors: item.colors,
          });
          qData.tags.push(...item.tags);
        }
      } else if (li.itemType === 'look' && li.lookId) {
        const look = allLooks.find((l) => l._id === li.lookId);
        if (look) {
          qData.tags.push(...look.styleTags);
        }
      }
    });

    const moodSwings = quarterlyData.map((qData) => {
      const quarterInfo = QUARTERLY_MOODS[qData.quarter - 1];
      const tagCounts = new Map<string, number>();
      qData.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      const topTag =
        Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'versatile';

      return {
        quarter: `Q${qData.quarter}`,
        months: quarterInfo.months,
        mood: getQuarterMood(qData.quarter, topTag),
        topTag,
      };
    });

    // 5. Top Brands
    const brandCounts = new Map<string, number>();
    Array.from(itemCounts.values()).forEach((item) => {
      if (item.brand) {
        brandCounts.set(item.brand, (brandCounts.get(item.brand) || 0) + item.count);
      }
    });

    const topBrands = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, saveCount]) => ({ brand, saveCount }));

    // 6. Personality Type & Trends
    const uniqueStyles = new Set(dominantTags);
    const trendingTagCount = dominantTags.filter((tag) =>
      TRENDING_TAGS_2025.some((t) => tag.includes(t) || t.includes(tag))
    ).length;

    const personality = getPersonalityType(uniqueStyles.size, trendingTagCount, dominantTags.length);

    const trendsAhead = dominantTags
      .filter((tag) => TRENDING_TAGS_2025.some((t) => tag.includes(t) || t.includes(tag)))
      .slice(0, 3);

    const trendsSkipped = SKIPPED_TRENDS_2025.filter(
      (trend) => !dominantTags.some((tag) => tag.includes(trend) || trend.includes(tag))
    ).slice(0, 2);

    // 7. Most Saved Look
    const lookSaveCounts = new Map<string, number>();
    lookbookItems.forEach((li) => {
      if (li.itemType === 'look' && li.lookId) {
        lookSaveCounts.set(li.lookId, (lookSaveCounts.get(li.lookId) || 0) + 1);
      }
    });

    const mostSavedLookEntry = Array.from(lookSaveCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const mostSavedLookId = mostSavedLookEntry ? (mostSavedLookEntry[0] as Id<'looks'>) : undefined;

    // 8. Overall Stats
    const totalLooksSaved = savedLookIds.length;
    const totalTryOns = lookImages.length;
    const totalLookbooksCount = lookbooks.length;

    // Generate share token
    const shareToken = generateWrappedShareToken();

    // Save the wrapped data
    const wrappedId = await ctx.runMutation(internal.wrapped.mutations.saveUserWrapped, {
      userId: args.userId,
      year: args.year,
      styleEra: styleEraName,
      styleEraDescription,
      dominantTags,
      topItems,
      colorPalette,
      moodSwings,
      topBrands,
      personalityType: personality.name,
      personalityDescription: personality.description,
      trendsAhead,
      trendsSkipped,
      mostSavedLookId,
      totalLooksSaved,
      totalTryOns,
      totalLookbooks: totalLookbooksCount,
      shareToken,
    });

    console.log(`Successfully generated wrapped for user ${args.userId}: ${wrappedId}`);

    return wrappedId;
  },
});

