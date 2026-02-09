import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Validators
const genderValidator = v.union(v.literal('male'), v.literal('female'), v.literal('unisex'));
const budgetValidator = v.union(v.literal('low'), v.literal('mid'), v.literal('premium'));

// Full look validator - includes generationStatus for workflow tracking
const generationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed')
);

const lookValidator = v.object({
  _id: v.id('looks'),
  _creationTime: v.number(),
  publicId: v.string(),
  itemIds: v.array(v.id('items')),
  totalPrice: v.number(),
  currency: v.string(),
  name: v.optional(v.string()),
  styleTags: v.array(v.string()),
  occasion: v.optional(v.string()),
  season: v.optional(v.string()),
  nimaComment: v.optional(v.string()),
  targetGender: genderValidator,
  targetBudgetRange: v.optional(budgetValidator),
  isActive: v.boolean(),
  isFeatured: v.optional(v.boolean()),
  isPublic: v.optional(v.boolean()), // For user-shareable looks on /explore
  sharedWithFriends: v.optional(v.boolean()), // Share with friends (can be true even if isPublic is false)
  viewCount: v.optional(v.number()),
  saveCount: v.optional(v.number()),
  generationStatus: v.optional(generationStatusValidator),
  status: v.optional(v.union(v.literal('pending'), v.literal('saved'), v.literal('discarded'))),
  createdBy: v.optional(v.union(v.literal('system'), v.literal('user'))),
  creatorUserId: v.optional(v.id('users')),
  creationSource: v.optional(
    v.union(
      v.literal('chat'),
      v.literal('apparel'),
      v.literal('recreated'),
      v.literal('shared'),
      v.literal('system')
    )
  ),
  originalLookId: v.optional(v.id('looks')),
  loveCount: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Item validator for nested items
const itemValidator = v.object({
  _id: v.id('items'),
  _creationTime: v.number(),
  publicId: v.string(),
  sku: v.optional(v.string()),
  name: v.string(),
  brand: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.union(
    v.literal('top'),
    v.literal('bottom'),
    v.literal('dress'),
    v.literal('outfit'),
    v.literal('swimwear'),
    v.literal('outerwear'),
    v.literal('shoes'),
    v.literal('accessory'),
    v.literal('bag'),
    v.literal('jewelry')
  ),
  subcategory: v.optional(v.string()),
  gender: genderValidator,
  price: v.number(),
  currency: v.string(),
  originalPrice: v.optional(v.number()),
  colors: v.array(v.string()),
  sizes: v.array(v.string()),
  material: v.optional(v.string()),
  tags: v.array(v.string()),
  occasion: v.optional(v.array(v.string())),
  season: v.optional(v.array(v.string())),
  sourceStore: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  affiliateUrl: v.optional(v.string()),
  inStock: v.boolean(),
  stockQuantity: v.optional(v.number()),
  isActive: v.boolean(),
  isFeatured: v.optional(v.boolean()),
  sellerId: v.optional(v.id('sellers')),
  viewCount: v.optional(v.number()),
  saveCount: v.optional(v.number()),
  purchaseCount: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Get a single look by ID
 */
export const getLook = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(lookValidator, v.null()),
  handler: async (ctx: QueryCtx, args: { lookId: Id<'looks'> }): Promise<Doc<'looks'> | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
      return null;
    }
    return look;
  },
});

/**
 * Get a look by its public ID
 */
export const getLookByPublicId = query({
  args: {
    publicId: v.string(),
  },
  returns: v.union(lookValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { publicId: string }
  ): Promise<Doc<'looks'> | null> => {
    const look = await ctx.db
      .query('looks')
      .withIndex('by_public_id', (q) => q.eq('publicId', args.publicId))
      .unique();

    if (!look || !look.isActive) {
      return null;
    }
    return look;
  },
});

/**
 * Get a look with all its items
 */
export const getLookWithItems = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(
    v.object({
      look: lookValidator,
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    look: Doc<'looks'>;
    items: Array<{
      item: Doc<'items'>;
      primaryImageUrl: string | null;
    }>;
  } | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
      return null;
    }

    // Fetch all items in the look
    const items = await Promise.all(
      look.itemIds.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        if (!item || !item.isActive) {
          return null;
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
          .unique();

        let primaryImageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            primaryImageUrl = primaryImage.externalUrl;
          }
        }

        return { item, primaryImageUrl };
      })
    );

    // Filter out null items
    const validItems = items.filter(
      (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
    );

    return {
      look,
      items: validItems,
    };
  },
});

/**
 * List looks for the feed with optional filters
 */
export const listLooks = query({
  args: {
    gender: v.optional(genderValidator),
    budgetRange: v.optional(budgetValidator),
    occasion: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    looks: v.array(lookValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      gender?: 'male' | 'female' | 'unisex';
      budgetRange?: 'low' | 'mid' | 'premium';
      occasion?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    looks: Doc<'looks'>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let query;
    if (args.gender) {
      query = ctx.db
        .query('looks')
        .withIndex('by_active_and_gender', (q) => q.eq('isActive', true).eq('targetGender', args.gender!));
    } else if (args.occasion) {
      query = ctx.db
        .query('looks')
        .withIndex('by_occasion', (q) => q.eq('occasion', args.occasion!));
    } else {
      query = ctx.db
        .query('looks')
        .withIndex('by_active_and_featured', (q) => q.eq('isActive', true));
    }

    const results = await query.order('desc').take(limit + 1);

    // Filter for active looks and optionally by budget
    let filteredLooks = results.filter((look) => look.isActive);
    
    if (args.budgetRange) {
      filteredLooks = filteredLooks.filter(
        (look) => !look.targetBudgetRange || look.targetBudgetRange === args.budgetRange
      );
    }

    const hasMore = filteredLooks.length > limit;
    const looks = filteredLooks.slice(0, limit);

    return {
      looks,
      nextCursor: hasMore && looks.length > 0 ? looks[looks.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Get looks for the personalized feed based on user preferences
 */
export const getFeedLooks = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    looks: v.array(
      v.object({
        look: lookValidator,
        matchScore: v.number(),
      })
    ),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    looks: Array<{
      look: Doc<'looks'>;
      matchScore: number;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get current user for personalization (optional)
    const identity = await ctx.auth.getUserIdentity();
    let userPreferences: {
      gender?: string;
      stylePreferences?: string[];
      budgetRange?: string;
    } | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();

      if (user) {
        userPreferences = {
          gender: user.gender,
          stylePreferences: user.stylePreferences,
          budgetRange: user.budgetRange,
        };
      }
    }

    // Get active looks
    const results = await ctx.db
      .query('looks')
      .withIndex('by_active_and_featured', (q) => q.eq('isActive', true))
      .order('desc')
      .take((limit + 1) * 3); // Get more to filter and score

    // Filter and score looks based on user preferences
    const scoredLooks = results
      .filter((look) => look.isActive)
      .map((look) => {
        let matchScore = 50; // Base score

        if (userPreferences) {
          // Gender match
          if (
            userPreferences.gender &&
            (look.targetGender === userPreferences.gender || look.targetGender === 'unisex')
          ) {
            matchScore += 20;
          }

          // Style preference match
          if (userPreferences.stylePreferences && userPreferences.stylePreferences.length > 0) {
            const matchingTags = look.styleTags.filter((tag) =>
              userPreferences.stylePreferences!.includes(tag)
            );
            matchScore += matchingTags.length * 10;
          }

          // Budget match
          if (
            userPreferences.budgetRange &&
            (!look.targetBudgetRange || look.targetBudgetRange === userPreferences.budgetRange)
          ) {
            matchScore += 15;
          }
        }

        // Boost featured looks
        if (look.isFeatured) {
          matchScore += 10;
        }

        return { look, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const hasMore = scoredLooks.length > limit;
    const looks = scoredLooks.slice(0, limit);

    return {
      looks,
      nextCursor: hasMore && looks.length > 0 ? looks[looks.length - 1].look._id : null,
      hasMore,
    };
  },
});

/**
 * Get featured looks
 */
export const getFeaturedLooks = query({
  args: {
    gender: v.optional(genderValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(lookValidator),
  handler: async (
    ctx: QueryCtx,
    args: {
      gender?: 'male' | 'female' | 'unisex';
      limit?: number;
    }
  ): Promise<Doc<'looks'>[]> => {
    const limit = Math.min(args.limit ?? 10, MAX_PAGE_SIZE);

    const looks = await ctx.db
      .query('looks')
      .withIndex('by_active_and_featured', (q) => q.eq('isActive', true).eq('isFeatured', true))
      .order('desc')
      .take(limit * 2);

    let filteredLooks = looks;
    if (args.gender) {
      filteredLooks = looks.filter(
        (look) => look.targetGender === args.gender || look.targetGender === 'unisex'
      );
    }

    return filteredLooks.slice(0, limit);
  },
});

/**
 * Get a look by ID with full details including items and look image
 * Used on the look detail page
 */
export const getLookWithFullDetails = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          imageUrl: v.union(v.string(), v.null()),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    look: Doc<'looks'>;
    lookImage: {
      _id: Id<'look_images'>;
      storageId?: Id<'_storage'>;
      imageUrl: string | null;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    } | null;
    items: Array<{
      item: Doc<'items'>;
      primaryImageUrl: string | null;
    }>;
  } | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
    return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<'users'> | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        userId = user._id;
      }
    }

    // Get look image for this user (if authenticated) or the first one
    let lookImage = null;
    if (userId) {
      lookImage = await ctx.db
        .query('look_images')
        .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', userId!))
        .first();
    }

    // If no user-specific image, get any image for this look
    if (!lookImage) {
      lookImage = await ctx.db
        .query('look_images')
        .withIndex('by_look', (q) => q.eq('lookId', look._id))
        .first();
    }

    let imageUrl: string | null = null;
    if (lookImage?.storageId) {
      imageUrl = await ctx.storage.getUrl(lookImage.storageId);
    }

    // Get items with their images
    const items = await Promise.all(
      look.itemIds.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        if (!item || !item.isActive) {
          return null;
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
          .unique();

        let primaryImageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            primaryImageUrl = primaryImage.externalUrl;
          }
        }

        return { item, primaryImageUrl };
      })
    );

    // Filter out null items
    const validItems = items.filter(
      (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
    );

    return {
      look,
      lookImage: lookImage
        ? {
            _id: lookImage._id,
            storageId: lookImage.storageId,
            imageUrl,
            status: lookImage.status,
          }
        : null,
      items: validItems,
    };
  },
});

/**
 * Get a look with full details by public ID
 * Used on the look detail page when accessed via publicId URL
 */
export const getLookWithFullDetailsByPublicId = query({
  args: {
    publicId: v.string(),
  },
  returns: v.union(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          imageUrl: v.union(v.string(), v.null()),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { publicId: string }
  ): Promise<{
    look: Doc<'looks'>;
    lookImage: {
      _id: Id<'look_images'>;
      storageId?: Id<'_storage'>;
      imageUrl: string | null;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    } | null;
    items: Array<{
      item: Doc<'items'>;
      primaryImageUrl: string | null;
    }>;
  } | null> => {
    const look = await ctx.db
      .query('looks')
      .withIndex('by_public_id', (q) => q.eq('publicId', args.publicId))
      .unique();

    if (!look || !look.isActive) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<'users'> | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        userId = user._id;
      }
    }

    // Get look image for this user (if authenticated) or the first one
    let lookImage = null;
    if (userId) {
      lookImage = await ctx.db
        .query('look_images')
        .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', userId!))
        .first();
    }

    // If no user-specific image, get any image for this look
    if (!lookImage) {
      lookImage = await ctx.db
        .query('look_images')
        .withIndex('by_look', (q) => q.eq('lookId', look._id))
        .first();
    }

    let imageUrl: string | null = null;
    if (lookImage?.storageId) {
      imageUrl = await ctx.storage.getUrl(lookImage.storageId);
    }

    // Get items with their images
    const items = await Promise.all(
      look.itemIds.map(async (itemId) => {
        const item = await ctx.db.get(itemId);
        if (!item || !item.isActive) {
          return null;
        }

        // Get primary image
        const primaryImage = await ctx.db
          .query('item_images')
          .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
          .unique();

        let primaryImageUrl: string | null = null;
        if (primaryImage) {
          if (primaryImage.storageId) {
            primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
          } else if (primaryImage.externalUrl) {
            primaryImageUrl = primaryImage.externalUrl;
          }
        }

        return { item, primaryImageUrl };
      })
    );

    // Filter out null items
    const validItems = items.filter(
      (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
    );

    return {
      look,
      lookImage: lookImage
        ? {
            _id: lookImage._id,
            storageId: lookImage.storageId,
            imageUrl,
            status: lookImage.status,
          }
        : null,
      items: validItems,
    };
  },
});

/**
 * Get looks generated for the current user with their look_images
 * Used on the discover page to show personalized looks
 */
export const getUserGeneratedLooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          imageUrl: v.union(v.string(), v.null()),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        imageUrl: string | null;
        status: 'pending' | 'processing' | 'completed' | 'failed';
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const limit = Math.min(args.limit ?? 10, MAX_PAGE_SIZE);

    // Get looks for this user (including pending ones so they appear immediately after creation)
    // We query by creator only and filter out failed ones
    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) =>
        q.eq('creatorUserId', user._id)
      )
      .filter((q) => q.neq(q.field('generationStatus'), 'failed'))
      .order('desc')
      .take(limit);

    // Fetch look images and items for each look
    const looksWithDetails = await Promise.all(
      userLooks.map(async (look) => {
        // Get look image for this user
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', user._id))
          .first();

        let imageUrl: string | null = null;
        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        // Get items with their images
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item || !item.isActive) {
              return null;
            }

            // Get primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        // Filter out null items
        const validItems = items.filter(
          (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
        );

        return {
          look,
          lookImage: lookImage
            ? {
                _id: lookImage._id,
                storageId: lookImage.storageId,
                imageUrl,
                status: lookImage.status,
              }
            : null,
          items: validItems,
        };
      })
    );

    return looksWithDetails;
  },
});

/**
 * Get user's looks filtered by who created them (system or user)
 * Used on the Profile page My Looks tab with "By Nima" / "By Me" filter
 */
export const getMyLooksByCreator = query({
  args: {
    createdBy: v.union(v.literal('system'), v.literal('user')),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          imageUrl: v.union(v.string(), v.null()),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { createdBy: 'system' | 'user'; limit?: number }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        imageUrl: string | null;
        status: 'pending' | 'processing' | 'completed' | 'failed';
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const limit = Math.min(args.limit ?? 50, MAX_PAGE_SIZE);

    // Get looks for this user filtered by createdBy
    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) =>
        q.eq('creatorUserId', user._id)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('createdBy'), args.createdBy),
          q.neq(q.field('generationStatus'), 'failed')
        )
      )
      .order('desc')
      .take(limit);

    // Fetch look images and items for each look
    const looksWithDetails = await Promise.all(
      userLooks.map(async (look) => {
        // Get look image for this user
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', user._id))
          .first();

        let imageUrl: string | null = null;
        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        // Get items with their images
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item || !item.isActive) {
              return null;
            }

            // Get primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        // Filter out null items
        const validItems = items.filter(
          (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
        );

        return {
          look,
          lookImage: lookImage
            ? {
                _id: lookImage._id,
                storageId: lookImage.storageId,
                imageUrl,
                status: lookImage.status,
              }
            : null,
          items: validItems,
        };
      })
    );

    return looksWithDetails;
  },
});

/**
 * Get public looks from all users for the /explore page
 * Returns looks that users have chosen to share publicly
 * Also includes isFriend status and hasPendingRequest for the add friend button
 */
export const getPublicLooks = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    looks: v.array(
      v.object({
        look: lookValidator,
        lookImage: v.union(
          v.object({
            _id: v.id('look_images'),
            storageId: v.optional(v.id('_storage')),
            imageUrl: v.union(v.string(), v.null()),
            status: v.union(
              v.literal('pending'),
              v.literal('processing'),
              v.literal('completed'),
              v.literal('failed')
            ),
          }),
          v.null()
        ),
        creator: v.union(
          v.object({
            _id: v.id('users'),
            firstName: v.optional(v.string()),
            username: v.optional(v.string()),
            profileImageUrl: v.optional(v.string()),
          }),
          v.null()
        ),
        items: v.array(
          v.object({
            item: itemValidator,
            primaryImageUrl: v.union(v.string(), v.null()),
          })
        ),
        itemCount: v.number(),
        isFriend: v.boolean(),
        hasPendingRequest: v.boolean(),
      })
    ),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    looks: Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        imageUrl: string | null;
        status: 'pending' | 'processing' | 'completed' | 'failed';
      } | null;
      creator: {
        _id: Id<'users'>;
        firstName?: string;
        username?: string;
        profileImageUrl?: string;
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
      itemCount: number;
      isFriend: boolean;
      hasPendingRequest: boolean;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get current user to exclude their own looks and check friendships
    const identity = await ctx.auth.getUserIdentity();
    let currentUserId: Id<'users'> | null = null;
    const friendIds = new Set<string>();
    const pendingRequestIds = new Set<string>();

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        currentUserId = user._id;

        // Get all friends (accepted status)
        const asRequester = await ctx.db
          .query('friendships')
          .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
          .filter((q) => q.eq(q.field('status'), 'accepted'))
          .collect();

        const asAddressee = await ctx.db
          .query('friendships')
          .withIndex('by_addressee', (q) => q.eq('addresseeId', user._id))
          .filter((q) => q.eq(q.field('status'), 'accepted'))
          .collect();

        asRequester.forEach((f) => friendIds.add(f.addresseeId));
        asAddressee.forEach((f) => friendIds.add(f.requesterId));

        // Get pending requests sent by current user
        const pendingRequests = await ctx.db
          .query('friendships')
          .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
          .filter((q) => q.eq(q.field('status'), 'pending'))
          .collect();

        pendingRequests.forEach((f) => pendingRequestIds.add(f.addresseeId));
      }
    }

    // Get public, active looks, excluding current user's own looks
    // Also include friends' looks that are shared with friends
    const publicLooks = await ctx.db
      .query('looks')
      .withIndex('by_public_and_active', (q) => q.eq('isPublic', true).eq('isActive', true))
      .order('desc')
      .collect();

    // Also get friends' looks that are shared with friends (but not necessarily public)
    const friendsLooks: Doc<'looks'>[] = [];
    if (currentUserId && friendIds.size > 0) {
      for (const friendId of friendIds) {
        const friendLooks = await ctx.db
          .query('looks')
          .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', friendId as Id<'users'>))
          .filter((q) =>
            q.and(
              q.eq(q.field('isActive'), true),
              q.eq(q.field('sharedWithFriends'), true),
              q.neq(q.field('isPublic'), true) // Only get non-public ones to avoid duplicates
            )
          )
          .collect();

        friendsLooks.push(...friendLooks);
      }
    }

    // Combine and dedupe looks
    const allLooksMap = new Map<string, Doc<'looks'>>();
    [...publicLooks, ...friendsLooks].forEach((look) => {
      if (!allLooksMap.has(look._id)) {
        allLooksMap.set(look._id, look);
      }
    });

    // Filter out current user's looks and sort by creation time
    const allResults = Array.from(allLooksMap.values())
      .filter((look) => !currentUserId || look.creatorUserId !== currentUserId)
      .sort((a, b) => b.createdAt - a.createdAt);

    const results = allResults.slice(0, limit + 1);

    const hasMore = results.length > limit;
    const looks = results.slice(0, limit);

    // Fetch look images and creator info for each look
    const looksWithDetails = await Promise.all(
      looks.map(async (look) => {
        // Get the first look image (any user's try-on for this look)
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look', (q) => q.eq('lookId', look._id))
          .first();

        let imageUrl: string | null = null;
        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        // Get creator info
        let creator = null;
        let isFriend = false;
        let hasPendingRequest = false;

        if (look.creatorUserId) {
          const user = await ctx.db.get(look.creatorUserId);
          if (user) {
            let profileImageUrl: string | undefined = undefined;
            if (user.profileImageId) {
              profileImageUrl = (await ctx.storage.getUrl(user.profileImageId)) || undefined;
            } else if (user.profileImageUrl) {
              profileImageUrl = user.profileImageUrl;
            }

            creator = {
              _id: user._id,
              firstName: user.firstName,
              username: user.username,
              profileImageUrl,
            };

            // Check if creator is a friend
            isFriend = friendIds.has(look.creatorUserId);
            hasPendingRequest = pendingRequestIds.has(look.creatorUserId);
          }
        }

        // Get items with their images
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item || !item.isActive) {
              return null;
            }

            // Get primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        // Filter out null items
        const validItems = items.filter(
          (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
        );

        return {
          look,
          lookImage: lookImage
            ? {
                _id: lookImage._id,
                storageId: lookImage.storageId,
                imageUrl,
                status: lookImage.status,
              }
            : null,
          creator,
          items: validItems,
          itemCount: validItems.length,
          isFriend,
          hasPendingRequest,
        };
      })
    );

    return {
      looks: looksWithDetails,
      nextCursor: hasMore && looks.length > 0 ? looks[looks.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Get looks from friends
 * Returns looks where:
 * - creatorUserId is in user's friends list
 * - AND (isPublic: true OR sharedWithFriends: true)
 */
export const getFriendsLooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          imageUrl: v.union(v.string(), v.null()),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
        }),
        v.null()
      ),
        creator: v.union(
          v.object({
            _id: v.id('users'),
            firstName: v.optional(v.string()),
            username: v.optional(v.string()),
            profileImageUrl: v.optional(v.string()),
          }),
          v.null()
        ),
        items: v.array(
          v.object({
            item: itemValidator,
            primaryImageUrl: v.union(v.string(), v.null()),
          })
        ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        imageUrl: string | null;
        status: 'pending' | 'processing' | 'completed' | 'failed';
      } | null;
      creator: {
        _id: Id<'users'>;
        firstName?: string;
        username?: string;
        profileImageUrl?: string;
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
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

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get all friends (accepted status)
    const asRequester = await ctx.db
      .query('friendships')
      .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .collect();

    const asAddressee = await ctx.db
      .query('friendships')
      .withIndex('by_addressee', (q) => q.eq('addresseeId', user._id))
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .collect();

    // Collect all friend IDs
    const friendIds = new Set<Id<'users'>>();
    asRequester.forEach((f) => friendIds.add(f.addresseeId));
    asAddressee.forEach((f) => friendIds.add(f.requesterId));

    if (friendIds.size === 0) {
      return [];
    }

    // Get looks from friends that are either public or shared with friends
    const allFriendLooks: Doc<'looks'>[] = [];
    for (const friendId of friendIds) {
      const friendLooks = await ctx.db
        .query('looks')
        .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', friendId))
        .filter((q) =>
          q.and(
            q.eq(q.field('isActive'), true),
            q.or(
              q.eq(q.field('isPublic'), true),
              q.eq(q.field('sharedWithFriends'), true)
            )
          )
        )
        .collect();

      allFriendLooks.push(...friendLooks);
    }

    // Sort by creation time (newest first) and limit
    allFriendLooks.sort((a, b) => b.createdAt - a.createdAt);
    const looks = allFriendLooks.slice(0, limit);

    // Fetch look images and creator info for each look
    const looksWithDetails = await Promise.all(
      looks.map(async (look) => {
        // Get the first look image (any user's try-on for this look)
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look', (q) => q.eq('lookId', look._id))
          .first();

        let imageUrl: string | null = null;
        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        // Get creator info
        let creator = null;
        if (look.creatorUserId) {
          const creatorUser = await ctx.db.get(look.creatorUserId);
          if (creatorUser) {
            let profileImageUrl: string | undefined = undefined;
            if (creatorUser.profileImageId) {
              profileImageUrl = (await ctx.storage.getUrl(creatorUser.profileImageId)) || undefined;
            } else if (creatorUser.profileImageUrl) {
              profileImageUrl = creatorUser.profileImageUrl;
            }

            creator = {
              _id: creatorUser._id,
              firstName: creatorUser.firstName,
              username: creatorUser.username,
              profileImageUrl,
            };
          }
        }

        // Get items with their images
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item || !item.isActive) {
              return null;
            }

            // Get primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        // Filter out null items
        const validItems = items.filter(
          (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
        );

        return {
          look,
          lookImage: lookImage
            ? {
                _id: lookImage._id,
                storageId: lookImage.storageId,
                imageUrl,
                status: lookImage.status,
              }
            : null,
          creator,
          items: validItems,
        };
      })
    );

    return looksWithDetails;
  },
});

/**
 * Get look with share metadata by public ID (for popup when viewing shared look)
 * Returns the look and information about who shared it
 */
export const getLookWithShareMetadataByPublicId = query({
  args: {
    publicId: v.string(),
    sharedByUserId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.object({
      look: lookValidator,
      sharedBy: v.union(
        v.object({
          _id: v.id('users'),
          firstName: v.optional(v.string()),
          username: v.optional(v.string()),
          profileImageUrl: v.optional(v.string()),
        }),
        v.null()
      ),
      areFriends: v.boolean(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { publicId: string; sharedByUserId?: Id<'users'> }
  ): Promise<{
    look: Doc<'looks'>;
    sharedBy: {
      _id: Id<'users'>;
      firstName?: string;
      username?: string;
      profileImageUrl?: string;
    } | null;
    areFriends: boolean;
  } | null> => {
    const look = await ctx.db
      .query('looks')
      .withIndex('by_public_id', (q) => q.eq('publicId', args.publicId))
      .unique();

    if (!look || !look.isActive) {
      return null;
    }

    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    let currentUserId: Id<'users'> | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        currentUserId = user._id;
      }
    }

    // Get sharedBy user info if provided
    let sharedBy = null;
    let areFriends = false;

    if (args.sharedByUserId) {
      const sharedByUser = await ctx.db.get(args.sharedByUserId);
      if (sharedByUser) {
        let profileImageUrl: string | undefined = undefined;
        if (sharedByUser.profileImageId) {
          profileImageUrl = (await ctx.storage.getUrl(sharedByUser.profileImageId)) || undefined;
        } else if (sharedByUser.profileImageUrl) {
          profileImageUrl = sharedByUser.profileImageUrl;
        }

        sharedBy = {
          _id: sharedByUser._id,
          firstName: sharedByUser.firstName,
          username: sharedByUser.username,
          profileImageUrl,
        };

        // Check if they are friends
        if (currentUserId) {
          // Check both directions
          const friendship1 = await ctx.db
            .query('friendships')
            .withIndex('by_users', (q) =>
              q.eq('requesterId', currentUserId!).eq('addresseeId', args.sharedByUserId!)
            )
            .filter((q) => q.eq(q.field('status'), 'accepted'))
            .first();

          if (friendship1) {
            areFriends = true;
          } else {
            const friendship2 = await ctx.db
              .query('friendships')
              .withIndex('by_users', (q) =>
                q.eq('requesterId', args.sharedByUserId!).eq('addresseeId', currentUserId!)
              )
              .filter((q) => q.eq(q.field('status'), 'accepted'))
              .first();

            areFriends = !!friendship2;
          }
        }
      }
    }

    return {
      look,
      sharedBy,
      areFriends,
    };
  },
});

/**
 * Get look with share metadata (for popup when viewing shared look)
 * Returns the look and information about who shared it
 */
export const getLookWithShareMetadata = query({
  args: {
    lookId: v.id('looks'),
    sharedByUserId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.object({
      look: lookValidator,
      sharedBy: v.union(
        v.object({
          _id: v.id('users'),
          firstName: v.optional(v.string()),
          username: v.optional(v.string()),
          profileImageUrl: v.optional(v.string()),
        }),
        v.null()
      ),
      areFriends: v.boolean(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'>; sharedByUserId?: Id<'users'> }
  ): Promise<{
    look: Doc<'looks'>;
    sharedBy: {
      _id: Id<'users'>;
      firstName?: string;
      username?: string;
      profileImageUrl?: string;
    } | null;
    areFriends: boolean;
  } | null> => {
    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
      return null;
    }

    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    let currentUserId: Id<'users'> | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        currentUserId = user._id;
      }
    }

    // Get sharedBy user info if provided
    let sharedBy = null;
    let areFriends = false;

    if (args.sharedByUserId) {
      const sharedByUser = await ctx.db.get(args.sharedByUserId);
      if (sharedByUser) {
        let profileImageUrl: string | undefined = undefined;
        if (sharedByUser.profileImageId) {
          profileImageUrl = (await ctx.storage.getUrl(sharedByUser.profileImageId)) || undefined;
        } else if (sharedByUser.profileImageUrl) {
          profileImageUrl = sharedByUser.profileImageUrl;
        }

        sharedBy = {
          _id: sharedByUser._id,
          firstName: sharedByUser.firstName,
          username: sharedByUser.username,
          profileImageUrl,
        };

        // Check if they are friends
        if (currentUserId) {
          // Check both directions
          const friendship1 = await ctx.db
            .query('friendships')
            .withIndex('by_users', (q) =>
              q.eq('requesterId', currentUserId!).eq('addresseeId', args.sharedByUserId!)
            )
            .filter((q) => q.eq(q.field('status'), 'accepted'))
            .first();

          if (friendship1) {
            areFriends = true;
          } else {
            const friendship2 = await ctx.db
              .query('friendships')
              .withIndex('by_users', (q) =>
                q.eq('requesterId', args.sharedByUserId!).eq('addresseeId', currentUserId!)
              )
              .filter((q) => q.eq(q.field('status'), 'accepted'))
              .first();

            areFriends = !!friendship2;
          }
        }
      }
    }

    return {
      look,
      sharedBy,
      areFriends,
    };
  },
});

/**
 * Get multiple looks by their IDs with full details
 * Used in the fitting room when multiple looks were created from a chat session
 */
export const getMultipleLooksWithDetails = query({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.array(
    v.union(
      v.object({
        look: lookValidator,
        lookImage: v.union(
          v.object({
            _id: v.id('look_images'),
            storageId: v.optional(v.id('_storage')),
            imageUrl: v.union(v.string(), v.null()),
            status: v.union(
              v.literal('pending'),
              v.literal('processing'),
              v.literal('completed'),
              v.literal('failed')
            ),
          }),
          v.null()
        ),
        items: v.array(
          v.object({
            item: itemValidator,
            primaryImageUrl: v.union(v.string(), v.null()),
          })
        ),
      }),
      v.null()
    )
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookIds: Id<'looks'>[] }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        imageUrl: string | null;
        status: 'pending' | 'processing' | 'completed' | 'failed';
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
    } | null>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    let userId: Id<'users'> | null = null;

    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        userId = user._id;
      }
    }

    // Fetch all looks in parallel
    const results = await Promise.all(
      args.lookIds.map(async (lookId) => {
        const look = await ctx.db.get(lookId);
        if (!look || !look.isActive) {
          return null;
        }

        // Get look image for this user (if authenticated) or the first one
        let lookImage = null;
        if (userId) {
          lookImage = await ctx.db
            .query('look_images')
            .withIndex('by_look_and_user', (q) => q.eq('lookId', look._id).eq('userId', userId!))
            .first();
        }

        // If no user-specific image, get any image for this look
        if (!lookImage) {
          lookImage = await ctx.db
            .query('look_images')
            .withIndex('by_look', (q) => q.eq('lookId', look._id))
            .first();
        }

        let imageUrl: string | null = null;
        if (lookImage?.storageId) {
          imageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        // Get items with their images
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item || !item.isActive) {
              return null;
            }

            // Get primary image
            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) => q.eq('itemId', itemId).eq('isPrimary', true))
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        // Filter out null items
        const validItems = items.filter(
          (i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null
        );

        return {
          look,
          lookImage: lookImage
            ? {
                _id: lookImage._id,
                storageId: lookImage.storageId,
                imageUrl,
                status: lookImage.status,
              }
            : null,
          items: validItems,
        };
      })
    );

    return results;
  },
});

/**
 * Get the generation status of a look
 * Used to poll for completion after creating a look
 */
export const getLookGenerationStatus = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.union(
    v.object({
      status: v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      ),
      errorMessage: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { lookId: Id<'looks'> }
  ): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    imageUrl?: string;
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

    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
      return null;
    }

    // Get the look image for this user
    const lookImage = await ctx.db
      .query('look_images')
      .withIndex('by_look_and_user', (q) =>
        q.eq('lookId', args.lookId).eq('userId', user._id)
      )
      .first();

    if (lookImage) {
      let imageUrl: string | undefined;
      if (lookImage.storageId) {
        imageUrl = (await ctx.storage.getUrl(lookImage.storageId)) || undefined;
      }

      return {
        status: lookImage.status,
        errorMessage: lookImage.errorMessage,
        imageUrl,
      };
    }

    // If no look image yet, use the look's generation status
    return {
      status: look.generationStatus || 'pending',
      errorMessage: undefined,
    };
  },
});

// ============================================
// DISCARDED / SAVED LOOKS QUERIES
// ============================================

/**
 * Get discarded looks for the current user
 * Used in the discarded looks page for restoring looks
 */
export const getDiscardedLooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
          imageUrl: v.optional(v.string()),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        imageUrl?: string;
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
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

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get discarded looks for this user
    const looks = await ctx.db
      .query('looks')
      .withIndex('by_user_and_save_status', (q) =>
        q.eq('creatorUserId', user._id).eq('status', 'discarded')
      )
      .order('desc')
      .take(limit);

    // Filter for active looks only
    const activeLooks = looks.filter((look) => look.isActive);

    // Build results with items and images
    const results = await Promise.all(
      activeLooks.map(async (look) => {
        // Get look image
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look_and_user', (q) =>
            q.eq('lookId', look._id).eq('userId', user._id)
          )
          .first();

        let lookImageResult: {
          _id: Id<'look_images'>;
          storageId?: Id<'_storage'>;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          imageUrl?: string;
        } | null = null;

        if (lookImage) {
          let imageUrl: string | undefined;
          if (lookImage.storageId) {
            imageUrl = (await ctx.storage.getUrl(lookImage.storageId)) || undefined;
          }
          lookImageResult = {
            _id: lookImage._id,
            storageId: lookImage.storageId,
            status: lookImage.status,
            imageUrl,
          };
        }

        // Get items
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item) return null;

            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) =>
                q.eq('itemId', itemId).eq('isPrimary', true)
              )
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        return {
          look,
          lookImage: lookImageResult,
          items: items.filter((i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null),
        };
      })
    );

    return results;
  },
});

/**
 * Get saved looks for the current user
 * Used in the lookbooks page to show saved looks as open grid
 */
export const getSavedLooks = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      look: lookValidator,
      lookImage: v.union(
        v.object({
          _id: v.id('look_images'),
          storageId: v.optional(v.id('_storage')),
          status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('failed')
          ),
          imageUrl: v.optional(v.string()),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          item: itemValidator,
          primaryImageUrl: v.union(v.string(), v.null()),
        })
      ),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { limit?: number }
  ): Promise<
    Array<{
      look: Doc<'looks'>;
      lookImage: {
        _id: Id<'look_images'>;
        storageId?: Id<'_storage'>;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        imageUrl?: string;
      } | null;
      items: Array<{
        item: Doc<'items'>;
        primaryImageUrl: string | null;
      }>;
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

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get saved looks for this user
    // Include looks with status 'saved' or undefined (for backward compatibility)
    const looks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', user._id))
      .order('desc')
      .take(limit * 2); // Get extra to filter

    // Filter for active looks that are saved or have no status (backward compatibility)
    const savedLooks = looks.filter(
      (look) => look.isActive && (look.status === 'saved' || look.status === undefined)
    ).slice(0, limit);

    // Build results with items and images
    const results = await Promise.all(
      savedLooks.map(async (look) => {
        // Get look image
        let lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look_and_user', (q) =>
            q.eq('lookId', look._id).eq('userId', user._id)
          )
          .first();
        
        // Failover: If no user-specific image, check for any image for this look (like system looks)
        if (!lookImage) {
          lookImage = await ctx.db
            .query('look_images')
            .withIndex('by_look', (q) => q.eq('lookId', look._id))
            .first();
        }

        let lookImageResult: {
          _id: Id<'look_images'>;
          storageId?: Id<'_storage'>;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          imageUrl?: string;
        } | null = null;

        if (lookImage) {
          let imageUrl: string | undefined;
          if (lookImage.storageId) {
            imageUrl = (await ctx.storage.getUrl(lookImage.storageId)) || undefined;
          }
          lookImageResult = {
            _id: lookImage._id,
            storageId: lookImage.storageId,
            status: lookImage.status,
            imageUrl,
          };
        }

        // Get items
        const items = await Promise.all(
          look.itemIds.map(async (itemId) => {
            const item = await ctx.db.get(itemId);
            if (!item) return null;

            const primaryImage = await ctx.db
              .query('item_images')
              .withIndex('by_item_and_primary', (q) =>
                q.eq('itemId', itemId).eq('isPrimary', true)
              )
              .unique();

            let primaryImageUrl: string | null = null;
            if (primaryImage) {
              if (primaryImage.storageId) {
                primaryImageUrl = await ctx.storage.getUrl(primaryImage.storageId);
              } else if (primaryImage.externalUrl) {
                primaryImageUrl = primaryImage.externalUrl;
              }
            }

            return { item, primaryImageUrl };
          })
        );

        return {
          look,
          lookImage: lookImageResult,
          items: items.filter((i): i is { item: Doc<'items'>; primaryImageUrl: string | null } => i !== null),
        };
      })
    );

    return results;
  },
});