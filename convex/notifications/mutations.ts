import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Save or update an Expo push notification token for a user
 * Called from the client when the app registers for push notifications
 */
export const savePushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { token: string; platform: 'ios' | 'android' | 'web' }
  ): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Check if this token already exists for this user
    const existingToken = await ctx.db
      .query('push_tokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    const now = Date.now();

    if (existingToken) {
      // Update existing token
      await ctx.db.patch(existingToken._id, {
        userId: user._id,
        platform: args.platform,
        updatedAt: now,
      });
    } else {
      // Create new token
      await ctx.db.insert('push_tokens', {
        userId: user._id,
        token: args.token,
        platform: args.platform,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

/**
 * Remove a push token (called when user logs out or token becomes invalid)
 */
export const removePushToken = mutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: { token: string }
  ): Promise<null> => {
    const existingToken = await ctx.db
      .query('push_tokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (existingToken) {
      await ctx.db.delete(existingToken._id);
    }

    return null;
  },
});

/**
 * Get all push tokens for a user (internal, for sending notifications)
 */
export const getUserPushTokens = internalMutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.array(v.string()),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'> }
  ): Promise<string[]> => {
    const tokens = await ctx.db
      .query('push_tokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return tokens.map((t) => t.token);
  },
});

