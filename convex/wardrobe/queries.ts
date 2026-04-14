import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

async function getUserByWorkosId(
  db: QueryCtx['db'],
  workosUserId: string
): Promise<Doc<'users'> | null> {
  return await db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
    .unique();
}

/**
 * Get all wardrobe items for the current user, optionally filtered by category.
 * Returns items hydrated with image URLs.
 */
export const getWardrobeItems = query({
  args: {
    category: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id('wardrobeItems'),
      _creationTime: v.number(),
      userId: v.id('users'),
      imageStorageId: v.id('_storage'),
      originalImageStorageId: v.id('_storage'),
      description: v.string(),
      category: v.string(),
      subcategory: v.optional(v.string()),
      tags: v.array(v.string()),
      color: v.string(),
      season: v.optional(v.array(v.string())),
      formality: v.string(),
      source: v.union(v.literal('single_upload'), v.literal('closet_scan')),
      createdAt: v.number(),
      imageUrl: v.union(v.string(), v.null()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { category?: string }
  ): Promise<Array<Doc<'wardrobeItems'> & { imageUrl: string | null }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await getUserByWorkosId(ctx.db, identity.subject);
    if (!user) return [];

    let items: Doc<'wardrobeItems'>[];
    if (args.category) {
      items = await ctx.db
        .query('wardrobeItems')
        .withIndex('by_user_and_category', (q) =>
          q.eq('userId', user._id).eq('category', args.category!)
        )
        .order('desc')
        .collect();
    } else {
      items = await ctx.db
        .query('wardrobeItems')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .collect();
    }

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        imageUrl: await ctx.storage.getUrl(item.imageStorageId),
      }))
    );
  },
});

/**
 * Get total count of wardrobe items for the current user.
 */
export const getWardrobeItemCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await getUserByWorkosId(ctx.db, identity.subject);
    if (!user) return 0;

    const items = await ctx.db
      .query('wardrobeItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    return items.length;
  },
});
