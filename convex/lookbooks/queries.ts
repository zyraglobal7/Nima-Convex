import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Lookbook validator
const lookbookValidator = v.object({
  _id: v.id('lookbooks'),
  _creationTime: v.number(),
  userId: v.id('users'),
  name: v.string(),
  description: v.optional(v.string()),
  coverImageId: v.optional(v.id('_storage')),
  autoCoverItemId: v.optional(v.id('items')),
  isPublic: v.boolean(),
  shareToken: v.optional(v.string()),
  isCollaborative: v.optional(v.boolean()),
  collaboratorIds: v.optional(v.array(v.id('users'))),
  itemCount: v.number(),
  isArchived: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Lookbook item validator
const lookbookItemValidator = v.object({
  _id: v.id('lookbook_items'),
  _creationTime: v.number(),
  lookbookId: v.id('lookbooks'),
  userId: v.id('users'),
  itemType: v.union(v.literal('look'), v.literal('item')),
  lookId: v.optional(v.id('looks')),
  itemId: v.optional(v.id('items')),
  note: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
});

/**
 * Get a lookbook by ID
 */
export const getLookbook = query({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.union(lookbookValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { lookbookId: Id<'lookbooks'> }
  ): Promise<Doc<'lookbooks'> | null> => {
    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      return null;
    }

    // Check access - public lookbooks are accessible to all
    if (!lookbook.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();

      if (!user || user._id !== lookbook.userId) {
        // Check if collaborator
        if (!lookbook.collaboratorIds?.includes(user?._id as Id<'users'>)) {
          return null;
        }
      }
    }

    return lookbook;
  },
});

/**
 * Get a lookbook by share token (for sharing private lookbooks)
 */
export const getLookbookByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(lookbookValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { shareToken: string }
  ): Promise<Doc<'lookbooks'> | null> => {
    const lookbook = await ctx.db
      .query('lookbooks')
      .withIndex('by_share_token', (q) => q.eq('shareToken', args.shareToken))
      .unique();

    return lookbook;
  },
});

/**
 * List lookbooks for the current user
 */
export const listUserLookbooks = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.array(lookbookValidator),
  handler: async (
    ctx: QueryCtx,
    args: { includeArchived?: boolean }
  ): Promise<Doc<'lookbooks'>[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    let lookbooks;
    if (args.includeArchived) {
      lookbooks = await ctx.db
        .query('lookbooks')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();
    } else {
      lookbooks = await ctx.db
        .query('lookbooks')
        .withIndex('by_user_and_archived', (q) => q.eq('userId', user._id).eq('isArchived', false))
        .collect();
    }

    return lookbooks;
  },
});

/**
 * Get items in a lookbook
 */
export const getLookbookItems = query({
  args: {
    lookbookId: v.id('lookbooks'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    items: v.array(lookbookItemValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      lookbookId: Id<'lookbooks'>;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    items: Doc<'lookbook_items'>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    // First verify access to the lookbook
    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    // Check access
    if (!lookbook.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();

      if (!user || (user._id !== lookbook.userId && !lookbook.collaboratorIds?.includes(user._id))) {
        return { items: [], nextCursor: null, hasMore: false };
      }
    }

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const items = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', args.lookbookId))
      .collect();

    // Sort by sortOrder
    items.sort((a, b) => a.sortOrder - b.sortOrder);

    const hasMore = items.length > limit;
    const paginatedItems = items.slice(0, limit);

    return {
      items: paginatedItems,
      nextCursor: hasMore && paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Check if a look or item is saved in any of the user's lookbooks
 */
export const isItemSaved = query({
  args: {
    itemType: v.union(v.literal('look'), v.literal('item')),
    lookId: v.optional(v.id('looks')),
    itemId: v.optional(v.id('items')),
  },
  returns: v.object({
    isSaved: v.boolean(),
    lookbookIds: v.array(v.id('lookbooks')),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      itemType: 'look' | 'item';
      lookId?: Id<'looks'>;
      itemId?: Id<'items'>;
    }
  ): Promise<{
    isSaved: boolean;
    lookbookIds: Id<'lookbooks'>[];
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isSaved: false, lookbookIds: [] };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { isSaved: false, lookbookIds: [] };
    }

    // Get all lookbook items for this user
    const userLookbookItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Filter by item type and ID
    const matchingItems = userLookbookItems.filter((item) => {
      if (args.itemType === 'look' && args.lookId) {
        return item.itemType === 'look' && item.lookId === args.lookId;
      }
      if (args.itemType === 'item' && args.itemId) {
        return item.itemType === 'item' && item.itemId === args.itemId;
      }
      return false;
    });

    const lookbookIds = [...new Set(matchingItems.map((item) => item.lookbookId))];

    return {
      isSaved: matchingItems.length > 0,
      lookbookIds,
    };
  },
});

/**
 * Get lookbook with cover image URL
 */
export const getLookbookWithCover = query({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.union(
    v.object({
      lookbook: lookbookValidator,
      coverImageUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookbookId: Id<'lookbooks'> }
  ): Promise<{
    lookbook: Doc<'lookbooks'>;
    coverImageUrl: string | null;
  } | null> => {
    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      return null;
    }

    let coverImageUrl: string | null = null;

    // Try custom cover image first
    if (lookbook.coverImageId) {
      coverImageUrl = await ctx.storage.getUrl(lookbook.coverImageId);
    }
    // Fall back to auto cover from first item
    else if (lookbook.autoCoverItemId) {
      const primaryImage = await ctx.db
        .query('item_images')
        .withIndex('by_item_and_primary', (q) =>
          q.eq('itemId', lookbook.autoCoverItemId!).eq('isPrimary', true)
        )
        .unique();

      if (primaryImage) {
        if (primaryImage.storageId) {
          coverImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
        } else if (primaryImage.externalUrl) {
          coverImageUrl = primaryImage.externalUrl;
        }
      }
    }

    return {
      lookbook,
      coverImageUrl,
    };
  },
});

