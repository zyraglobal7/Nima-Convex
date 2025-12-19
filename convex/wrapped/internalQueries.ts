import { internalQuery, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

/**
 * Get wrapped settings for a specific year (internal use)
 */
export const getSettingsForYear = internalQuery({
  args: {
    year: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id('wrapped_settings'),
      year: v.number(),
      runDate: v.number(),
      theme: v.union(v.literal('aurora'), v.literal('geometric'), v.literal('fluid')),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { year: number }
  ): Promise<{
    _id: Id<'wrapped_settings'>;
    year: number;
    runDate: number;
    theme: 'aurora' | 'geometric' | 'fluid';
    isActive: boolean;
  } | null> => {
    const settings = await ctx.db
      .query('wrapped_settings')
      .withIndex('by_year', (q) => q.eq('year', args.year))
      .unique();

    if (!settings) return null;

    return {
      _id: settings._id,
      year: settings.year,
      runDate: settings.runDate,
      theme: settings.theme,
      isActive: settings.isActive,
    };
  },
});

/**
 * Get all eligible users for wrapped generation
 */
export const getEligibleUsers = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('users'),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<
    Array<{
      _id: Id<'users'>;
      gender?: 'male' | 'female' | 'prefer-not-to-say';
    }>
  > => {
    const users = await ctx.db.query('users').collect();

    return users
      .filter((u) => u.isActive && u.onboardingCompleted)
      .map((u) => ({
        _id: u._id,
        gender: u.gender,
      }));
  },
});

/**
 * Get user by ID (internal use)
 */
export const getUserById = internalQuery({
  args: {
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      firstName: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
      stylePreferences: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<{
    _id: Id<'users'>;
    firstName?: string;
    gender?: 'male' | 'female' | 'prefer-not-to-say';
    stylePreferences: string[];
  } | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      _id: user._id,
      firstName: user.firstName,
      gender: user.gender,
      stylePreferences: user.stylePreferences,
    };
  },
});

/**
 * Get user's lookbook items for a specific year
 */
export const getUserLookbookItemsForYear = internalQuery({
  args: {
    userId: v.id('users'),
    yearStart: v.number(),
    yearEnd: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('lookbook_items'),
      itemType: v.union(v.literal('look'), v.literal('item')),
      lookId: v.optional(v.id('looks')),
      itemId: v.optional(v.id('items')),
      createdAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>;
      yearStart: number;
      yearEnd: number;
    }
  ): Promise<
    Array<{
      _id: Id<'lookbook_items'>;
      itemType: 'look' | 'item';
      lookId?: Id<'looks'>;
      itemId?: Id<'items'>;
      createdAt: number;
    }>
  > => {
    const items = await ctx.db
      .query('lookbook_items')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return items
      .filter((item) => item.createdAt >= args.yearStart && item.createdAt < args.yearEnd)
      .map((item) => ({
        _id: item._id,
        itemType: item.itemType,
        lookId: item.lookId,
        itemId: item.itemId,
        createdAt: item.createdAt,
      }));
  },
});

/**
 * Get user's look images (try-ons) for a specific year
 */
export const getUserLookImagesForYear = internalQuery({
  args: {
    userId: v.id('users'),
    yearStart: v.number(),
    yearEnd: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('look_images'),
      lookId: v.id('looks'),
      createdAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>;
      yearStart: number;
      yearEnd: number;
    }
  ): Promise<
    Array<{
      _id: Id<'look_images'>;
      lookId: Id<'looks'>;
      createdAt: number;
    }>
  > => {
    const images = await ctx.db
      .query('look_images')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return images
      .filter((img) => img.createdAt >= args.yearStart && img.createdAt < args.yearEnd)
      .map((img) => ({
        _id: img._id,
        lookId: img.lookId,
        createdAt: img.createdAt,
      }));
  },
});

/**
 * Get user's lookbooks for a specific year
 */
export const getUserLookbooksForYear = internalQuery({
  args: {
    userId: v.id('users'),
    yearStart: v.number(),
    yearEnd: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('lookbooks'),
      name: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>;
      yearStart: number;
      yearEnd: number;
    }
  ): Promise<
    Array<{
      _id: Id<'lookbooks'>;
      name: string;
      createdAt: number;
    }>
  > => {
    const lookbooks = await ctx.db
      .query('lookbooks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return lookbooks
      .filter((lb) => lb.createdAt >= args.yearStart && lb.createdAt < args.yearEnd)
      .map((lb) => ({
        _id: lb._id,
        name: lb.name,
        createdAt: lb.createdAt,
      }));
  },
});

/**
 * Get items by IDs
 */
export const getItemsByIds = internalQuery({
  args: {
    itemIds: v.array(v.id('items')),
  },
  returns: v.array(
    v.object({
      _id: v.id('items'),
      name: v.string(),
      brand: v.optional(v.string()),
      colors: v.array(v.string()),
      tags: v.array(v.string()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { itemIds: Id<'items'>[] }
  ): Promise<
    Array<{
      _id: Id<'items'>;
      name: string;
      brand?: string;
      colors: string[];
      tags: string[];
    }>
  > => {
    const uniqueIds = [...new Set(args.itemIds)];
    const items = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

    return items
      .filter((item): item is Doc<'items'> => item !== null)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        brand: item.brand,
        colors: item.colors,
        tags: item.tags,
      }));
  },
});

/**
 * Get looks by IDs
 */
export const getLooksByIds = internalQuery({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.array(
    v.object({
      _id: v.id('looks'),
      itemIds: v.array(v.id('items')),
      styleTags: v.array(v.string()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookIds: Id<'looks'>[] }
  ): Promise<
    Array<{
      _id: Id<'looks'>;
      itemIds: Id<'items'>[];
      styleTags: string[];
    }>
  > => {
    const uniqueIds = [...new Set(args.lookIds)];
    const looks = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

    return looks
      .filter((look): look is Doc<'looks'> => look !== null)
      .map((look) => ({
        _id: look._id,
        itemIds: look.itemIds,
        styleTags: look.styleTags,
      }));
  },
});

