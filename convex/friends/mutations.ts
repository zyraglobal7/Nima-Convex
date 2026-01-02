import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = mutation({
  args: {
    addresseeId: v.id('users'),
  },
  returns: v.object({
    success: v.boolean(),
    friendshipId: v.optional(v.id('friendships')),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { addresseeId: Id<'users'> }
  ): Promise<{
    success: boolean;
    friendshipId?: Id<'friendships'>;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const requester = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!requester) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Prevent self-friend requests
    if (requester._id === args.addresseeId) {
      return {
        success: false,
        error: 'Cannot send friend request to yourself',
      };
    }

    // Rate limiting: max 20 friend requests per day
    const rateLimitTimestamp = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recentRequests = await ctx.db
      .query('friendships')
      .withIndex('by_requester', (q) => q.eq('requesterId', requester._id))
      .filter((q) => q.gt(q.field('createdAt'), rateLimitTimestamp - oneDay))
      .collect();

    if (recentRequests.length >= 20) {
      return {
        success: false,
        error: 'Rate limit exceeded. You can send up to 20 friend requests per day.',
      };
    }

    // Check if addressee exists
    const addressee = await ctx.db.get(args.addresseeId);
    if (!addressee) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', requester._id).eq('addresseeId', args.addresseeId)
      )
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return {
          success: false,
          error: 'You are already friends with this user',
        };
      }
      if (existingFriendship.status === 'pending') {
        return {
          success: false,
          error: 'Friend request already sent',
        };
      }
    }

    // Check reverse direction (if they sent us a request)
    const reverseFriendship = await ctx.db
      .query('friendships')
      .withIndex('by_users', (q) =>
        q.eq('requesterId', args.addresseeId).eq('addresseeId', requester._id)
      )
      .first();

    if (reverseFriendship) {
      if (reverseFriendship.status === 'accepted') {
        return {
          success: false,
          error: 'You are already friends with this user',
        };
      }
      if (reverseFriendship.status === 'pending') {
        // They already sent us a request, auto-accept it
        await ctx.db.patch(reverseFriendship._id, {
          status: 'accepted',
          updatedAt: Date.now(),
        });
        return {
          success: true,
          friendshipId: reverseFriendship._id,
        };
      }
    }

    // Create new friend request
    const now = Date.now();
    const friendshipId = await ctx.db.insert('friendships', {
      requesterId: requester._id,
      addresseeId: args.addresseeId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      friendshipId,
    };
  },
});

/**
 * Accept a friend request
 */
export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id('friendships'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { friendshipId: Id<'friendships'> }
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      return {
        success: false,
        error: 'Friend request not found',
      };
    }

    // Verify user is the addressee (recipient of the request)
    if (friendship.addresseeId !== user._id) {
      return {
        success: false,
        error: 'You can only accept friend requests sent to you',
      };
    }

    // Check if already accepted
    if (friendship.status === 'accepted') {
      return {
        success: false,
        error: 'Friend request already accepted',
      };
    }

    // Accept the request
    await ctx.db.patch(args.friendshipId, {
      status: 'accepted',
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

/**
 * Decline or remove a friend request
 */
export const declineFriendRequest = mutation({
  args: {
    friendshipId: v.id('friendships'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { friendshipId: Id<'friendships'> }
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      return {
        success: false,
        error: 'Friend request not found',
      };
    }

    // Verify user is either requester or addressee
    if (friendship.requesterId !== user._id && friendship.addresseeId !== user._id) {
      return {
        success: false,
        error: 'You can only decline your own friend requests',
      };
    }

    // Delete the friendship record
    await ctx.db.delete(args.friendshipId);

    return {
      success: true,
    };
  },
});

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = mutation({
  args: {
    friendshipId: v.id('friendships'),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { friendshipId: Id<'friendships'> }
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      return {
        success: false,
        error: 'Friendship not found',
      };
    }

    // Verify user is part of this friendship
    if (friendship.requesterId !== user._id && friendship.addresseeId !== user._id) {
      return {
        success: false,
        error: 'You can only remove your own friendships',
      };
    }

    // Verify it's an accepted friendship
    if (friendship.status !== 'accepted') {
      return {
        success: false,
        error: 'Can only remove accepted friendships',
      };
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);

    return {
      success: true,
    };
  },
});

