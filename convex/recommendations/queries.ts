import { query, internalQuery, QueryCtx } from '../_generated/server';
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
 * Get active recommendations for the current user.
 * includeWardrobe=false → "New" tab (catalog items only)
 * includeWardrobe=true  → "My Wardrobe" tab (recs that mix in wardrobe items)
 */
export const getWeeklyRecommendations = query({
  args: {
    includeWardrobe: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (
    ctx: QueryCtx,
    args: { includeWardrobe?: boolean }
  ): Promise<unknown[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await getUserByWorkosId(ctx.db, identity.subject);
    if (!user) return [];

    const recs = await ctx.db
      .query('recommendations')
      .withIndex('by_user_and_status', (q) =>
        q.eq('userId', user._id).eq('status', 'active')
      )
      .order('desc')
      .take(20);

    const filtered = args.includeWardrobe
      ? recs.filter((r) => r.isWardrobeMix === true)
      : recs.filter((r) => !r.isWardrobeMix);

    return Promise.all(
      filtered.map(async (rec) => {
        // Hydrate catalog items
        const items = await Promise.all(
          rec.itemIds.map(async (id: Id<'items'>) => {
            const item = await ctx.db.get(id);
            if (!item) return null;
            // Prefer primary image from item_images table
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', id).eq('isPrimary', true))
              .first();
            const imageUrl =
              primaryImage?.externalUrl ??
              (primaryImage?.storageId ? await ctx.storage.getUrl(primaryImage.storageId) : null);
            return { ...item, imageUrl };
          })
        );

        // Hydrate wardrobe items if present
        let wardrobeItems: unknown[] = [];
        if (rec.wardrobeItemIds?.length) {
          wardrobeItems = await Promise.all(
            rec.wardrobeItemIds.map(async (id: Id<'wardrobeItems'>) => {
              const item = await ctx.db.get(id);
              if (!item) return null;
              return {
                ...item,
                imageUrl: await ctx.storage.getUrl(item.imageStorageId),
              };
            })
          );
        }

        return {
          ...rec,
          items: items.filter(Boolean),
          wardrobeItems: wardrobeItems.filter(Boolean),
        };
      })
    );
  },
});

/**
 * Internal: get pending_comment recommendations for a user (called by generateComments action).
 */
export const getPendingComments = internalQuery({
  args: { userId: v.id('users') },
  returns: v.array(v.any()),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<unknown[]> => {
    const recs = await ctx.db
      .query('recommendations')
      .withIndex('by_user_and_status', (q) =>
        q.eq('userId', args.userId).eq('status', 'pending_comment')
      )
      .collect();

    // Hydrate with item names for the AI prompt
    return Promise.all(
      recs.map(async (rec) => {
        const items = await Promise.all(
          rec.itemIds.map(async (id: Id<'items'>) => {
            const item = await ctx.db.get(id);
            return item ? { _id: item._id, name: item.name, category: item.category } : null;
          })
        );
        return { ...rec, items: items.filter(Boolean) };
      })
    );
  },
});
