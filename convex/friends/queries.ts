import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Get all friends for the current user (accepted status)
 */
export const getFriends = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('friendships'),
      _creationTime: v.number(),
      friend: v.object({
        _id: v.id('users'),
        firstName: v.optional(v.string()),
        username: v.optional(v.string()),
        profileImageUrl: v.optional(v.string()),
      }),
      isRequester: v.boolean(), // true if current user sent the request, false if they received it
    })
  ),
  handler: async (
    ctx: QueryCtx
  ): Promise<
    Array<{
      _id: Id<'friendships'>;
      _creationTime: number;
      friend: {
        _id: Id<'users'>;
        firstName?: string;
        username?: string;
        profileImageUrl?: string;
      };
      isRequester: boolean;
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

    // Get friendships where user is requester
    const asRequester = await ctx.db
      .query('friendships')
      .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .collect();

    // Get friendships where user is addressee
    const asAddressee = await ctx.db
      .query('friendships')
      .withIndex('by_addressee', (q) => q.eq('addresseeId', user._id))
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .collect();

    // Combine and get friend user data
    const friends = await Promise.all(
      [
        ...asRequester.map((f) => ({ friendship: f, friendId: f.addresseeId, isRequester: true })),
        ...asAddressee.map((f) => ({ friendship: f, friendId: f.requesterId, isRequester: false })),
      ].map(async ({ friendship, friendId, isRequester }) => {
        const friend = await ctx.db.get(friendId);
        if (!friend) {
          return null;
        }

        return {
          _id: friendship._id,
          _creationTime: friendship._creationTime,
          friend: {
            _id: friend._id,
            firstName: friend.firstName,
            username: friend.username,
            profileImageUrl: friend.profileImageUrl,
          },
          isRequester,
        };
      })
    );

    return friends.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

/**
 * Get pending friend requests (where current user is addressee)
 */
export const getPendingFriendRequests = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('friendships'),
      _creationTime: v.number(),
      requester: v.object({
        _id: v.id('users'),
        firstName: v.optional(v.string()),
        username: v.optional(v.string()),
        profileImageUrl: v.optional(v.string()),
      }),
    })
  ),
  handler: async (
    ctx: QueryCtx
  ): Promise<
    Array<{
      _id: Id<'friendships'>;
      _creationTime: number;
      requester: {
        _id: Id<'users'>;
        firstName?: string;
        username?: string;
        profileImageUrl?: string;
      };
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

    // Get pending requests where user is addressee
    const pendingRequests = await ctx.db
      .query('friendships')
      .withIndex('by_addressee_and_status', (q) =>
        q.eq('addresseeId', user._id).eq('status', 'pending')
      )
      .collect();

    // Get requester user data
    const requestsWithUsers = await Promise.all(
      pendingRequests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        if (!requester) {
          return null;
        }

        return {
          _id: request._id,
          _creationTime: request._creationTime,
          requester: {
            _id: requester._id,
            firstName: requester.firstName,
            username: requester.username,
            profileImageUrl: requester.profileImageUrl,
          },
        };
      })
    );

    return requestsWithUsers.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Check if two users are friends
 */
export const areFriends = query({
  args: {
    userId: v.id('users'),
  },
  returns: v.boolean(),
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!currentUser) {
      return false;
    }

    // Check both directions
    const friendship1 = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', currentUser._id).eq('addresseeId', args.userId)
      )
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .first();

    if (friendship1) {
      return true;
    }

    const friendship2 = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', args.userId).eq('addresseeId', currentUser._id)
      )
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .first();

    return !!friendship2;
  },
});

/**
 * Check if current user has sent a friend request to another user (pending)
 */
export const hasSentFriendRequest = query({
  args: {
    userId: v.id('users'),
  },
  returns: v.boolean(),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!currentUser) {
      return false;
    }

    // Check if current user has sent a pending request to this user
    const pendingRequest = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', currentUser._id).eq('addresseeId', args.userId)
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first();

    return !!pendingRequest;
  },
});

/**
 * Get friend by user ID (if they are friends)
 */
export const getFriend = query({
  args: {
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      firstName: v.optional(v.string()),
      username: v.optional(v.string()),
      profileImageUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<{
    _id: Id<'users'>;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!currentUser) {
      return null;
    }

    // Check if they are friends (check both directions)
    const friendship1 = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', currentUser._id).eq('addresseeId', args.userId)
      )
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .first();

    const friendship2 = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', args.userId).eq('addresseeId', currentUser._id)
      )
      .filter((q) => q.eq(q.field('status'), 'accepted'))
      .first();

    if (!friendship1 && !friendship2) {
      return null;
    }

    // Get the friend user
    const friend = await ctx.db.get(args.userId);
    if (!friend) {
      return null;
    }

    return {
      _id: friend._id,
      firstName: friend.firstName,
      username: friend.username,
      profileImageUrl: friend.profileImageUrl,
    };
  },
});

