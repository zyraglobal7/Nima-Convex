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
  viewCount: v.optional(v.number()),
  saveCount: v.optional(v.number()),
  generationStatus: v.optional(generationStatusValidator),
  createdBy: v.optional(v.union(v.literal('system'), v.literal('user'))),
  creatorUserId: v.optional(v.id('users')),
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
 * Increment view count for a look
 */
export const incrementViewCount = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.null(),
  handler: async (ctx: QueryCtx, args: { lookId: Id<'looks'> }): Promise<null> => {
    // Note: This should ideally be a mutation, but for simplicity
    // we're just reading here. A proper implementation would use
    // a mutation with rate limiting.
    return null;
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
 * Get public looks from all users for the /explore page
 * Returns looks that users have chosen to share publicly
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
        itemCount: v.number(),
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
      itemCount: number;
    }>;
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Get public, active looks
    const results = await ctx.db
      .query('looks')
      .withIndex('by_public_and_active', (q) => q.eq('isPublic', true).eq('isActive', true))
      .order('desc')
      .take(limit + 1);

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
          }
        }

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
          itemCount: look.itemIds.length,
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

