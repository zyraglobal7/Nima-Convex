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
 * Get lookbook items with full details (looks or items with images)
 */
export const getLookbookItemsWithDetails = query({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.array(
    v.union(
      v.object({
        lookbookItem: lookbookItemValidator,
        type: v.literal('look'),
        look: v.object({
          _id: v.id('looks'),
          publicId: v.string(),
          totalPrice: v.number(),
          currency: v.string(),
          styleTags: v.array(v.string()),
          occasion: v.optional(v.string()),
        }),
        lookImageUrl: v.union(v.string(), v.null()),
      }),
      v.object({
        lookbookItem: lookbookItemValidator,
        type: v.literal('item'),
        item: v.object({
          _id: v.id('items'),
          publicId: v.string(),
          name: v.string(),
          brand: v.optional(v.string()),
          category: v.string(),
          price: v.number(),
          currency: v.string(),
          colors: v.array(v.string()),
        }),
        itemImageUrl: v.union(v.string(), v.null()),
      })
    )
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookbookId: Id<'lookbooks'> }
  ): Promise<
    Array<
      | {
          lookbookItem: Doc<'lookbook_items'>;
          type: 'look';
          look: {
            _id: Id<'looks'>;
            publicId: string;
            totalPrice: number;
            currency: string;
            styleTags: string[];
            occasion?: string;
          };
          lookImageUrl: string | null;
        }
      | {
          lookbookItem: Doc<'lookbook_items'>;
          type: 'item';
          item: {
            _id: Id<'items'>;
            publicId: string;
            name: string;
            brand?: string;
            category: string;
            price: number;
            currency: string;
            colors: string[];
          };
          itemImageUrl: string | null;
        }
    >
  > => {
    // First verify access to the lookbook
    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      return [];
    }

    // Check access
    if (!lookbook.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();

      if (!user || (user._id !== lookbook.userId && !lookbook.collaboratorIds?.includes(user._id))) {
        return [];
      }
    }

    // Get all lookbook items
    const lookbookItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', args.lookbookId))
      .collect();

    // Sort by sortOrder
    lookbookItems.sort((a, b) => a.sortOrder - b.sortOrder);

    // Fetch details for each item
    const itemsWithDetails = await Promise.all(
      lookbookItems.map(async (lookbookItem) => {
        if (lookbookItem.itemType === 'look' && lookbookItem.lookId) {
          const look = await ctx.db.get(lookbookItem.lookId);
          if (!look || !look.isActive) {
            return null;
          }

          // Get look image
          const identity = await ctx.auth.getUserIdentity();
          let lookImageUrl: string | null = null;
          
          if (identity) {
            const user = await ctx.db
              .query('users')
              .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
              .unique();
            
            if (user) {
              const lookImage = await ctx.db
                .query('look_images')
                .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', user._id))
                .first();
              
              if (lookImage?.storageId) {
                lookImageUrl = await ctx.storage.getUrl(lookImage.storageId);
              }
            }
          }

          // If no user-specific image, get any image for this look
          if (!lookImageUrl) {
            const lookImage = await ctx.db
              .query('look_images')
              .withIndex('by_look', (q) => q.eq('lookId', look._id))
              .first();
            
            if (lookImage?.storageId) {
              lookImageUrl = await ctx.storage.getUrl(lookImage.storageId);
            }
          }

          return {
            lookbookItem,
            type: 'look' as const,
            look: {
              _id: look._id,
              publicId: look.publicId,
              totalPrice: look.totalPrice,
              currency: look.currency,
              styleTags: look.styleTags,
              occasion: look.occasion,
            },
            lookImageUrl,
          };
        } else if (lookbookItem.itemType === 'item' && lookbookItem.itemId) {
          const item = await ctx.db.get(lookbookItem.itemId);
          if (!item || !item.isActive) {
            return null;
          }

          // Get item image
          const primaryImage = await ctx.db
            .query('item_images')
            .withIndex('by_item_and_primary', (q) => q.eq('itemId', item._id).eq('isPrimary', true))
            .unique();

          let itemImageUrl: string | null = null;
          if (primaryImage) {
            if (primaryImage.storageId) {
              itemImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
            } else if (primaryImage.externalUrl) {
              itemImageUrl = primaryImage.externalUrl;
            }
          }

          return {
            lookbookItem,
            type: 'item' as const,
            item: {
              _id: item._id,
              publicId: item.publicId,
              name: item.name,
              brand: item.brand,
              category: item.category,
              price: item.price,
              currency: item.currency,
              colors: item.colors,
            },
            itemImageUrl,
          };
        }
        return null;
      })
    );

    // Filter out null items
    return itemsWithDetails.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );
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
 * Check if a specific try-on result is saved in "Tried On Looks"
 */
export const isTryOnSaved = query({
  args: {
    itemTryOnId: v.id('item_try_ons'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: QueryCtx,
    args: { itemTryOnId: Id<'item_try_ons'> }
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

    // Get the try-on to get its storageId
    const tryOn = await ctx.db.get(args.itemTryOnId);
    if (!tryOn || !tryOn.storageId) {
      return false;
    }

    // Find "Tried On Looks" lookbook
    const triedOnLookbook = await ctx.db
      .query('lookbooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('name'), 'Tried On Looks'))
      .first();

    if (!triedOnLookbook) {
      return false;
    }

    // Get all items in this lookbook
    const lookbookItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', triedOnLookbook._id))
      .collect();

    // Check if any of these items are looks that have the same image as the try-on
    // This is a bit inefficient if lookbook is huge, but "Tried On" shouldn't be massive
    // and we only check look items
    for (const item of lookbookItems) {
      if (item.itemType === 'look' && item.lookId) {
        // Check if this look uses the try-on image
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look', (q) => q.eq('lookId', item.lookId!)) // Use '!' since we checked item.lookId
          .filter((q) => q.eq(q.field('storageId'), tryOn.storageId))
          .first();
        
        if (lookImage) {
          return true;
        }
      }
    }

    return false;
  },
});

/**
 * List lookbooks for the current user with cover images and preview thumbnails
 * Returns each lookbook with coverImageUrl and up to 4 item preview image URLs
 */
export const listUserLookbooksWithCovers = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      lookbook: lookbookValidator,
      coverImageUrl: v.union(v.string(), v.null()),
      previewImageUrls: v.array(v.string()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { includeArchived?: boolean }
  ): Promise<
    Array<{
      lookbook: Doc<'lookbooks'>;
      coverImageUrl: string | null;
      previewImageUrls: string[];
    }>
  > => {
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

    let lookbooks: Doc<'lookbooks'>[];
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

    // For each lookbook, resolve cover image and first 4 item preview images
    const results = await Promise.all(
      lookbooks.map(async (lookbook) => {
        let coverImageUrl: string | null = null;
        const previewImageUrls: string[] = [];

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

        // Fetch first 4 items from lookbook for preview grid
        const lookbookItems = await ctx.db
          .query('lookbook_items')
          .withIndex('by_lookbook', (q) => q.eq('lookbookId', lookbook._id))
          .order('asc')
          .take(4);

        // Get images for each item
        for (const lookbookItem of lookbookItems) {
          let imageUrl: string | null = null;

          if (lookbookItem.itemType === 'item' && lookbookItem.itemId) {
            // Get item's primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) =>
                q.eq('itemId', lookbookItem.itemId!).eq('isPrimary', true)
              )
              .unique();

            if (primaryImage) {
              if (primaryImage.storageId) {
                imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                imageUrl = primaryImage.externalUrl;
              }
            }
          } else if (lookbookItem.itemType === 'look' && lookbookItem.lookId) {
            // Get look's generated image from look_images table
            const lookImage = await ctx.db
              .query('look_images')
              .withIndex('by_look', (q) => q.eq('lookId', lookbookItem.lookId!))
              .first();

            if (lookImage?.storageId) {
              imageUrl = await ctx.storage.getUrl(lookImage.storageId);
            }
          }

          if (imageUrl) {
            previewImageUrls.push(imageUrl);
          }
        }

        return {
          lookbook,
          coverImageUrl,
          previewImageUrls,
        };
      })
    );

    return results;
  },
});

/**
 * Get lookbook with cover image URL and item preview images
 */
export const getLookbookWithCover = query({
  args: {
    lookbookId: v.id('lookbooks'),
  },
  returns: v.union(
    v.object({
      lookbook: lookbookValidator,
      coverImageUrl: v.union(v.string(), v.null()),
      itemImageUrls: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookbookId: Id<'lookbooks'> }
  ): Promise<{
    lookbook: Doc<'lookbooks'>;
    coverImageUrl: string | null;
    itemImageUrls: string[];
  } | null> => {
    const lookbook = await ctx.db.get(args.lookbookId);
    if (!lookbook) {
      return null;
    }

    let coverImageUrl: string | null = null;
    const itemImageUrls: string[] = [];

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

    // Fetch first 4 items from lookbook for preview grid
    const lookbookItems = await ctx.db
      .query('lookbook_items')
      .withIndex('by_lookbook', (q) => q.eq('lookbookId', lookbook._id))
      .order('asc')
      .take(4);

    // Get images for each item
    for (const lookbookItem of lookbookItems) {
      let imageUrl: string | null = null;
      
      if (lookbookItem.itemType === 'item' && lookbookItem.itemId) {
        // Get item's primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) =>
            q.eq('itemId', lookbookItem.itemId!).eq('isPrimary', true)
          )
          .unique();

        if (primaryImage) {
          if (primaryImage.storageId) {
            imageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            imageUrl = primaryImage.externalUrl;
          }
        }
      } else if (lookbookItem.itemType === 'look' && lookbookItem.lookId) {
        // Get look's generated image from look_images table
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look', (q) => q.eq('lookId', lookbookItem.lookId!))
          .first();

        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }
      }

      if (imageUrl) {
        itemImageUrls.push(imageUrl);
      }
    }

    return {
      lookbook,
      coverImageUrl,
      itemImageUrls,
    };
  },
});
