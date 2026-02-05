import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

/**
 * Get interaction counts for a look (loves, saves)
 * Dislikes are not returned as they are private
 */
export const getLookInteractionCounts = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    loveCount: v.number(),
    saveCount: v.number(),
    dislikeCount: v.number(), // Only visible to owner
    isOwner: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      lookId: Id<'looks'>;
    }
  ): Promise<{
    loveCount: number;
    saveCount: number;
    dislikeCount: number;
    isOwner: boolean;
  }> => {
    // Get current user if authenticated
    let currentUserId: Id<'users'> | null = null;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
        .unique();
      if (user) {
        currentUserId = user._id;
      }
    }

    // Get the look to check ownership
    const look = await ctx.db.get(args.lookId);
    const isOwner = look?.creatorUserId === currentUserId;

    // Count loves
    const loves = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_type', (q) => q.eq('lookId', args.lookId).eq('interactionType', 'love'))
      .collect();

    // Count saves
    const saves = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_type', (q) => q.eq('lookId', args.lookId).eq('interactionType', 'save'))
      .collect();

    // Count dislikes (only return if owner)
    let dislikeCount = 0;
    if (isOwner) {
      const dislikes = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_type', (q) => q.eq('lookId', args.lookId).eq('interactionType', 'dislike'))
        .collect();
      dislikeCount = dislikes.length;
    }

    return {
      loveCount: loves.length,
      saveCount: saves.length,
      dislikeCount,
      isOwner,
    };
  },
});

/**
 * Get the current user's interaction with a specific look
 */
export const getUserInteractionForLook = query({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    isLoved: v.boolean(),
    isDisliked: v.boolean(),
    isSaved: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      lookId: Id<'looks'>;
    }
  ): Promise<{
    isLoved: boolean;
    isDisliked: boolean;
    isSaved: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isLoved: false, isDisliked: false, isSaved: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { isLoved: false, isDisliked: false, isSaved: false };
    }

    // Get all interactions for this user and look
    const interactions = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
      .collect();

    const isLoved = interactions.some((i) => i.interactionType === 'love');
    const isDisliked = interactions.some((i) => i.interactionType === 'dislike');
    const isSaved = interactions.some((i) => i.interactionType === 'save');

    return { isLoved, isDisliked, isSaved };
  },
});

/**
 * Activity notification item shape
 */
const activityNotificationValidator = v.object({
  _id: v.id('look_interactions'),
  interactionType: v.union(
    v.literal('love'),
    v.literal('dislike'),
    v.literal('save'),
    v.literal('recreate')
  ),
  createdAt: v.number(),
  seenByOwner: v.boolean(),
  look: v.object({
    _id: v.id('looks'),
    publicId: v.string(),
    occasion: v.optional(v.string()),
  }),
  user: v.object({
    _id: v.id('users'),
    firstName: v.optional(v.string()),
    username: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  }),
});

/**
 * Get activity notifications for the current user's looks
 * Returns interactions from other users on looks created by the current user
 */
export const getActivityNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(activityNotificationValidator),
  handler: async (
    ctx: QueryCtx,
    args: {
      limit?: number;
    }
  ): Promise<Array<{
    _id: Id<'look_interactions'>;
    interactionType: 'love' | 'dislike' | 'save' | 'recreate';
    createdAt: number;
    seenByOwner: boolean;
    look: {
      _id: Id<'looks'>;
      publicId: string;
      occasion?: string;
    };
    user: {
      _id: Id<'users'>;
      firstName?: string;
      username?: string;
      profileImageUrl?: string;
    };
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    // Get all looks created by the current user
    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', currentUser._id))
      .collect();

    const lookIds = userLooks.map((l) => l._id);
    if (lookIds.length === 0) {
      return [];
    }

    // Get all interactions on user's looks (excluding their own interactions)
    // We need to query each look and collect interactions
    const allInteractions: Array<Doc<'look_interactions'>> = [];
    
    for (const lookId of lookIds) {
      const interactions = await ctx.db
        .query('look_interactions')
        .withIndex('by_look', (q) => q.eq('lookId', lookId))
        .order('desc')
        .collect();
      
      // Filter out self-interactions and dislikes (we don't notify about dislikes)
      const filteredInteractions = interactions.filter(
        (i) => i.userId !== currentUser._id && i.interactionType !== 'dislike'
      );
      allInteractions.push(...filteredInteractions);
    }

    // Sort by createdAt descending and limit
    allInteractions.sort((a, b) => b.createdAt - a.createdAt);
    const limitedInteractions = allInteractions.slice(0, args.limit ?? 50);

    // Enrich with look and user data
    const notifications: Array<{
      _id: Id<'look_interactions'>;
      interactionType: 'love' | 'dislike' | 'save' | 'recreate';
      createdAt: number;
      seenByOwner: boolean;
      look: {
        _id: Id<'looks'>;
        publicId: string;
        occasion?: string;
      };
      user: {
        _id: Id<'users'>;
        firstName?: string;
        username?: string;
        profileImageUrl?: string;
      };
    }> = [];

    for (const interaction of limitedInteractions) {
      const look = userLooks.find((l) => l._id === interaction.lookId);
      const user = await ctx.db.get(interaction.userId);

      if (look && user) {
        // Get profile image URL
        let profileImageUrl = user.profileImageUrl;
        if (!profileImageUrl && user.profileImageId) {
          profileImageUrl = await ctx.storage.getUrl(user.profileImageId) ?? undefined;
        }

        notifications.push({
          _id: interaction._id,
          interactionType: interaction.interactionType,
          createdAt: interaction.createdAt,
          seenByOwner: interaction.seenByOwner ?? false,
          look: {
            _id: look._id,
            publicId: look.publicId,
            occasion: look.occasion,
          },
          user: {
            _id: user._id,
            firstName: user.firstName,
            username: user.username,
            profileImageUrl,
          },
        });
      }
    }

    return notifications;
  },
});

/**
 * Get count of unseen activity notifications
 */
export const getUnreadActivityCount = query({
  args: {},
  returns: v.number(),
  handler: async (
    ctx: QueryCtx,
    args: Record<string, never>
  ): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!currentUser) {
      return 0;
    }

    // Get all looks created by the current user
    const userLooks = await ctx.db
      .query('looks')
      .withIndex('by_creator_and_status', (q) => q.eq('creatorUserId', currentUser._id))
      .collect();

    const lookIds = userLooks.map((l) => l._id);
    if (lookIds.length === 0) {
      return 0;
    }

    // Count unseen interactions on user's looks
    let unreadCount = 0;
    
    for (const lookId of lookIds) {
      const interactions = await ctx.db
        .query('look_interactions')
        .withIndex('by_look', (q) => q.eq('lookId', lookId))
        .filter((q) => 
          q.and(
            q.neq(q.field('userId'), currentUser._id),
            q.neq(q.field('interactionType'), 'dislike'),
            q.or(
              q.eq(q.field('seenByOwner'), false),
              q.eq(q.field('seenByOwner'), undefined)
            )
          )
        )
        .collect();
      
      unreadCount += interactions.length;
    }

    return unreadCount;
  },
});

/**
 * Get interaction counts for multiple looks at once (for cards display)
 */
export const getBatchLookInteractionCounts = query({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.record(v.string(), v.object({
    loveCount: v.number(),
    saveCount: v.number(),
  })),
  handler: async (
    ctx: QueryCtx,
    args: {
      lookIds: Array<Id<'looks'>>;
    }
  ): Promise<Record<string, { loveCount: number; saveCount: number }>> => {
    const result: Record<string, { loveCount: number; saveCount: number }> = {};

    for (const lookId of args.lookIds) {
      // Count loves
      const loves = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_type', (q) => q.eq('lookId', lookId).eq('interactionType', 'love'))
        .collect();

      // Count saves
      const saves = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_type', (q) => q.eq('lookId', lookId).eq('interactionType', 'save'))
        .collect();

      result[lookId] = {
        loveCount: loves.length,
        saveCount: saves.length,
      };
    }

    return result;
  },
});

/**
 * Get the current user's love status for multiple looks at once
 */
export const getBatchUserLoveStatus = query({
  args: {
    lookIds: v.array(v.id('looks')),
  },
  returns: v.record(v.string(), v.boolean()),
  handler: async (
    ctx: QueryCtx,
    args: {
      lookIds: Array<Id<'looks'>>;
    }
  ): Promise<Record<string, boolean>> => {
    const result: Record<string, boolean> = {};

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return all false if not authenticated
      for (const lookId of args.lookIds) {
        result[lookId] = false;
      }
      return result;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      for (const lookId of args.lookIds) {
        result[lookId] = false;
      }
      return result;
    }

    for (const lookId of args.lookIds) {
      const love = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_user', (q) => q.eq('lookId', lookId).eq('userId', user._id))
        .filter((q) => q.eq(q.field('interactionType'), 'love'))
        .unique();

      result[lookId] = love !== null;
    }

    return result;
  },
});

