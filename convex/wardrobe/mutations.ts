import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

// Helper: get user by WorkOS subject
async function getUserByWorkosId(
  db: MutationCtx['db'],
  workosUserId: string
): Promise<Doc<'users'> | null> {
  return await db
    .query('users')
    .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
    .unique();
}

/**
 * Add a processed wardrobe item (called from processWardrobeUpload action).
 */
export const addWardrobeItem = mutation({
  args: {
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
  },
  returns: v.id('wardrobeItems'),
  handler: async (
    ctx: MutationCtx,
    args: {
      imageStorageId: Id<'_storage'>;
      originalImageStorageId: Id<'_storage'>;
      description: string;
      category: string;
      subcategory?: string;
      tags: string[];
      color: string;
      season?: string[];
      formality: string;
      source: 'single_upload' | 'closet_scan';
    }
  ): Promise<Id<'wardrobeItems'>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await getUserByWorkosId(ctx.db, identity.subject);
    if (!user) throw new Error('User not found');

    return await ctx.db.insert('wardrobeItems', {
      userId: user._id,
      imageStorageId: args.imageStorageId,
      originalImageStorageId: args.originalImageStorageId,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      tags: args.tags,
      color: args.color,
      season: args.season,
      formality: args.formality,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove a wardrobe item and its stored images.
 */
export const removeWardrobeItem = mutation({
  args: { itemId: v.id('wardrobeItems') },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { itemId: Id<'wardrobeItems'> }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error('Wardrobe item not found');

    const user = await getUserByWorkosId(ctx.db, identity.subject);
    if (!user || item.userId !== user._id) throw new Error('Not authorized');

    // Delete stored images
    await ctx.storage.delete(item.imageStorageId);
    await ctx.storage.delete(item.originalImageStorageId);
    await ctx.db.delete(args.itemId);

    return null;
  },
});

/**
 * Generate an upload URL for a wardrobe image (original upload).
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx: MutationCtx, _args: Record<string, never>): Promise<string> => {
    return await ctx.storage.generateUploadUrl();
  },
});
