import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';

// ============================================
// ADMIN MUTATIONS
// ============================================

/**
 * Create or update wrapped settings for a specific year
 */
export const upsertWrappedSettings = mutation({
  args: {
    year: v.number(),
    runDate: v.number(),
    theme: v.union(v.literal('aurora'), v.literal('geometric'), v.literal('fluid')),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id('wrapped_settings'),
  handler: async (
    ctx: MutationCtx,
    args: {
      year: number;
      runDate: number;
      theme: 'aurora' | 'geometric' | 'fluid';
      isActive?: boolean;
    }
  ): Promise<Id<'wrapped_settings'>> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    const now = Date.now();

    // Check if settings already exist for this year
    const existing = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        runDate: args.runDate,
        theme: args.theme,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new
    const settingsId = await ctx.db.insert('wrapped_settings', {
      year: args.year,
      runDate: args.runDate,
      theme: args.theme,
      isActive: args.isActive ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return settingsId;
  },
});

/**
 * Activate or deactivate wrapped for a year (make it visible to users)
 */
export const toggleWrappedActive = mutation({
  args: {
    year: v.number(),
    isActive: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: {
      year: number;
      isActive: boolean;
    }
  ): Promise<boolean> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    if (!settings) {
      // Auto-create settings with defaults instead of throwing
      const now = Date.now();
      const defaultRunDate = new Date(args.year, 11, 15).getTime(); // Dec 15th
      await ctx.db.insert('wrapped_settings', {
        year: args.year,
        runDate: defaultRunDate,
        theme: 'aurora',
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });
      return args.isActive;
    }

    await ctx.db.patch(settings._id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return args.isActive;
  },
});

/**
 * Trigger manual wrapped generation for testing
 * This schedules the generation action to run immediately
 */
export const triggerManualGeneration = mutation({
  args: {
    year: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { year: number }
  ): Promise<null> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Schedule the generation action
    await ctx.scheduler.runAfter(0, internal.wrapped.actions.generateAllWrapped, {
      year: args.year,
    });

    return null;
  },
});

/**
 * Generate wrapped for a specific user (for testing or re-generation)
 */
export const triggerUserWrappedGeneration = mutation({
  args: {
    userId: v.id('users'),
    year: v.number(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>;
      year: number;
    }
  ): Promise<null> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // Schedule the user-specific generation action
    await ctx.scheduler.runAfter(0, internal.wrapped.actions.generateUserWrapped, {
      userId: args.userId,
      year: args.year,
    });

    return null;
  },
});

/**
 * Delete wrapped data for a user (for re-generation or cleanup)
 */
export const deleteUserWrapped = mutation({
  args: {
    userId: v.id('users'),
    year: v.number(),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>;
      year: number;
    }
  ): Promise<boolean> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    const wrapped = await ctx.db
      .query('user_wrapped')
      .withIndex('by_user_and_year', (q) => q.eq('userId', args.userId).eq('year', args.year))
      .unique();

    if (!wrapped) {
      return false;
    }

    await ctx.db.delete(wrapped._id);
    return true;
  },
});

/**
 * Delete all wrapped data for a year (for full re-generation)
 */
export const deleteAllWrappedForYear = mutation({
  args: {
    year: v.number(),
  },
  returns: v.number(),
  handler: async (
    ctx: MutationCtx,
    args: { year: number }
  ): Promise<number> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    const allWrapped = await ctx.db.query('user_wrapped').collect();
    const toDelete = allWrapped.filter((w) => w.year === args.year);

    for (const wrapped of toDelete) {
      await ctx.db.delete(wrapped._id);
    }

    return toDelete.length;
  },
});

// ============================================
// USER MUTATIONS
// ============================================

/**
 * Mark wrapped as viewed for the current user
 * Called when user completes viewing their wrapped experience
 */
export const markWrappedAsViewed = mutation({
  args: {
    year: v.number(),
  },
  returns: v.boolean(),
  handler: async (
    ctx: MutationCtx,
    args: { year: number }
  ): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    const wrapped = await ctx.db
      .query('user_wrapped')
      .withIndex('by_user_and_year', (q) => q.eq('userId', user._id).eq('year', args.year))
      .unique();

    if (!wrapped) {
      return false;
    }

    // Only update if not already viewed
    if (!wrapped.viewedAt) {
      await ctx.db.patch(wrapped._id, {
        viewedAt: Date.now(),
      });
    }

    return true;
  },
});

// ============================================
// INTERNAL MUTATIONS (called by actions)
// ============================================

/**
 * Internal mutation to save computed wrapped data for a user
 */
export const saveUserWrapped = internalMutation({
  args: {
    userId: v.id('users'),
    year: v.number(),
    styleEra: v.string(),
    styleEraDescription: v.string(),
    dominantTags: v.array(v.string()),
    topItems: v.array(
      v.object({
        itemId: v.id('items'),
        name: v.string(),
        count: v.number(),
      })
    ),
    colorPalette: v.array(
      v.object({
        color: v.string(),
        percentage: v.number(),
      })
    ),
    moodSwings: v.array(
      v.object({
        quarter: v.string(),
        months: v.string(),
        mood: v.string(),
        topTag: v.string(),
      })
    ),
    topBrands: v.array(
      v.object({
        brand: v.string(),
        saveCount: v.number(),
      })
    ),
    personalityType: v.string(),
    personalityDescription: v.string(),
    trendsAhead: v.array(v.string()),
    trendsSkipped: v.array(v.string()),
    mostSavedLookId: v.optional(v.id('looks')),
    totalLooksSaved: v.number(),
    totalTryOns: v.number(),
    totalLookbooks: v.number(),
    shareToken: v.string(),
  },
  returns: v.id('user_wrapped'),
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>;
      year: number;
      styleEra: string;
      styleEraDescription: string;
      dominantTags: string[];
      topItems: Array<{ itemId: Id<'items'>; name: string; count: number }>;
      colorPalette: Array<{ color: string; percentage: number }>;
      moodSwings: Array<{ quarter: string; months: string; mood: string; topTag: string }>;
      topBrands: Array<{ brand: string; saveCount: number }>;
      personalityType: string;
      personalityDescription: string;
      trendsAhead: string[];
      trendsSkipped: string[];
      mostSavedLookId?: Id<'looks'>;
      totalLooksSaved: number;
      totalTryOns: number;
      totalLookbooks: number;
      shareToken: string;
    }
  ): Promise<Id<'user_wrapped'>> => {
    // Delete existing wrapped for this user/year if it exists
    const existing = await ctx.db
      .query('user_wrapped')
      .withIndex('by_user_and_year', (q) => q.eq('userId', args.userId).eq('year', args.year))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Insert new wrapped data
    const wrappedId = await ctx.db.insert('user_wrapped', {
      userId: args.userId,
      year: args.year,
      styleEra: args.styleEra,
      styleEraDescription: args.styleEraDescription,
      dominantTags: args.dominantTags,
      topItems: args.topItems,
      colorPalette: args.colorPalette,
      moodSwings: args.moodSwings,
      topBrands: args.topBrands,
      personalityType: args.personalityType,
      personalityDescription: args.personalityDescription,
      trendsAhead: args.trendsAhead,
      trendsSkipped: args.trendsSkipped,
      mostSavedLookId: args.mostSavedLookId,
      totalLooksSaved: args.totalLooksSaved,
      totalTryOns: args.totalTryOns,
      totalLookbooks: args.totalLookbooks,
      shareToken: args.shareToken,
      createdAt: Date.now(),
    });

    return wrappedId;
  },
});

