import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// ============================================
// VALIDATORS
// ============================================

const wrappedSettingsValidator = v.object({
  _id: v.id('wrapped_settings'),
  _creationTime: v.number(),
  year: v.number(),
  runDate: v.number(),
  theme: v.union(v.literal('aurora'), v.literal('geometric'), v.literal('fluid')),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const userWrappedValidator = v.object({
  _id: v.id('user_wrapped'),
  _creationTime: v.number(),
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
  createdAt: v.number(),
  viewedAt: v.optional(v.number()),
});

// ============================================
// PUBLIC QUERIES
// ============================================

/**
 * Get wrapped data for the authenticated user for a specific year
 */
export const getUserWrapped = query({
  args: {
    year: v.number(),
  },
  returns: v.union(
    v.object({
      wrapped: userWrappedValidator,
      settings: v.union(wrappedSettingsValidator, v.null()),
      user: v.object({
        firstName: v.optional(v.string()),
        gender: v.optional(
          v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
        ),
      }),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { year: number }
  ): Promise<{
    wrapped: Doc<'user_wrapped'>;
    settings: Doc<'wrapped_settings'> | null;
    user: {
      firstName?: string;
      gender?: 'male' | 'female' | 'prefer-not-to-say';
    };
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get wrapped settings to check if active
    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    // Only return wrapped if it's active (or for testing purposes, always return for now)
    // In production, uncomment: if (!settings?.isActive) return null;

    const wrapped = await ctx.db
      .query('user_wrapped')
      .withIndex('by_user_and_year', (q) => q.eq('userId', user._id).eq('year', args.year))
      .unique();

    if (!wrapped) {
      return null;
    }

    return {
      wrapped,
      settings,
      user: {
        firstName: user.firstName,
        gender: user.gender,
      },
    };
  },
});

/**
 * Get wrapped data by share token (public, no auth required)
 */
export const getWrappedByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(
    v.object({
      wrapped: userWrappedValidator,
      settings: v.union(wrappedSettingsValidator, v.null()),
      user: v.object({
        firstName: v.optional(v.string()),
        gender: v.optional(
          v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
        ),
      }),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { shareToken: string }
  ): Promise<{
    wrapped: Doc<'user_wrapped'>;
    settings: Doc<'wrapped_settings'> | null;
    user: {
      firstName?: string;
      gender?: 'male' | 'female' | 'prefer-not-to-say';
    };
  } | null> => {
    const wrapped = await ctx.db
      .query('user_wrapped')
      .withIndex('by_share_token', (q) => q.eq('shareToken', args.shareToken))
      .unique();

    if (!wrapped) {
      return null;
    }

    // Get the user info
    const user = await ctx.db.get(wrapped.userId);
    if (!user) {
      return null;
    }

    // Get settings for theme
    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', wrapped.year))
      .unique();

    return {
      wrapped,
      settings,
      user: {
        firstName: user.firstName,
        gender: user.gender,
      },
    };
  },
});

/**
 * Check if wrapped is available for the current user for a given year
 */
export const isWrappedAvailable = query({
  args: {
    year: v.number(),
  },
  returns: v.object({
    available: v.boolean(),
    isActive: v.boolean(),
    hasData: v.boolean(),
    hasViewed: v.boolean(),
    shouldShow: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { year: number }
  ): Promise<{
    available: boolean;
    isActive: boolean;
    hasData: boolean;
    hasViewed: boolean;
    shouldShow: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { available: false, isActive: false, hasData: false, hasViewed: false, shouldShow: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { available: false, isActive: false, hasData: false, hasViewed: false, shouldShow: false };
    }

    // Check if settings exist and are active
    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    const isActive = settings?.isActive ?? false;

    // Check if user has wrapped data
    const wrapped = await ctx.db
      .query('user_wrapped')
      .withIndex('by_user_and_year', (q) => q.eq('userId', user._id).eq('year', args.year))
      .unique();

    const hasData = wrapped !== null;
    const hasViewed = wrapped?.viewedAt !== undefined && wrapped?.viewedAt !== null;
    const available = isActive && hasData;
    const shouldShow = available && !hasViewed;

    return {
      available,
      isActive,
      hasData,
      hasViewed,
      shouldShow,
    };
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * Get wrapped settings for admin (requires auth)
 */
export const getWrappedSettings = query({
  args: {
    year: v.number(),
  },
  returns: v.union(wrappedSettingsValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { year: number }
  ): Promise<Doc<'wrapped_settings'> | null> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    return settings;
  },
});

/**
 * Get all wrapped settings (for admin dashboard)
 */
export const getAllWrappedSettings = query({
  args: {},
  returns: v.array(wrappedSettingsValidator),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<Doc<'wrapped_settings'>[]> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const settings = await ctx.db.query('wrapped_settings').collect();

    // Sort by year descending
    return settings.sort((a, b) => b.year - a.year);
  },
});

/**
 * Get wrapped generation stats for admin
 */
export const getWrappedStats = query({
  args: {
    year: v.number(),
  },
  returns: v.object({
    totalUsers: v.number(),
    usersWithWrapped: v.number(),
    generationPercentage: v.number(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { year: number }
  ): Promise<{
    totalUsers: number;
    usersWithWrapped: number;
    generationPercentage: number;
  }> => {
    // Note: In production, add admin role check here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { totalUsers: 0, usersWithWrapped: 0, generationPercentage: 0 };
    }

    // Count total active users
    const allUsers = await ctx.db.query('users').collect();
    const totalUsers = allUsers.filter((u) => u.isActive && u.onboardingCompleted).length;

    // Count users with wrapped for this year
    const allWrapped = await ctx.db.query('user_wrapped').collect();
    const usersWithWrapped = allWrapped.filter((w) => w.year === args.year).length;

    const generationPercentage = totalUsers > 0 ? (usersWithWrapped / totalUsers) * 100 : 0;

    return {
      totalUsers,
      usersWithWrapped,
      generationPercentage: Math.round(generationPercentage * 10) / 10,
    };
  },
});

/**
 * Get most saved look details for wrapped
 */
export const getMostSavedLookDetails = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(
    v.object({
      look: v.object({
        _id: v.id('looks'),
        name: v.optional(v.string()),
        styleTags: v.array(v.string()),
        totalPrice: v.number(),
        currency: v.string(),
      }),
      imageUrl: v.union(v.string(), v.null()),
      itemCount: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    look: {
      _id: Id<'looks'>;
      name?: string;
      styleTags: string[];
      totalPrice: number;
      currency: string;
    };
    imageUrl: string | null;
    itemCount: number;
  } | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      return null;
    }

    // Get look image
    const lookImage = await ctx.db
      .query('look_images')
      .withIndex('by_look', (q) => q.eq('lookId', look._id))
      .first();

    let imageUrl: string | null = null;
    if (lookImage?.storageId) {
      imageUrl = await ctx.storage.getUrl(lookImage.storageId);
    }

    return {
      look: {
        _id: look._id,
        name: look.name,
        styleTags: look.styleTags,
        totalPrice: look.totalPrice,
        currency: look.currency,
      },
      imageUrl,
      itemCount: look.itemIds.length,
    };
  },
});

