import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Send a look to a user via direct message
 */
export const sendDirectMessage = mutation({
  args: {
    recipientId: v.id('users'),
    lookId: v.id('looks'),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.id('direct_messages')),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { recipientId: Id<'users'>; lookId: Id<'looks'> }
  ): Promise<{
    success: boolean;
    messageId?: Id<'direct_messages'>;
    error?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: 'Please sign in to send messages.',
      };
    }

    const sender = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!sender) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    // Prevent sending to yourself
    if (sender._id === args.recipientId) {
      return {
        success: false,
        error: 'You cannot send a message to yourself.',
      };
    }

    // Verify recipient exists
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient || !recipient.isActive) {
      return {
        success: false,
        error: 'Recipient not found.',
      };
    }

    // Verify look exists and sender owns it
    const look = await ctx.db.get(args.lookId);
    if (!look || !look.isActive) {
      return {
        success: false,
        error: 'Look not found.',
      };
    }

    // Check ownership (optional - you might want to allow sharing any look)
    // For now, we'll allow sharing any look, not just your own
    // if (look.creatorUserId !== sender._id) {
    //   return {
    //     success: false,
    //     error: 'You can only share looks you created.',
    //   };
    // }

    // Create the direct message
    const now = Date.now();
    const messageId = await ctx.db.insert('direct_messages', {
      senderId: sender._id,
      recipientId: args.recipientId,
      lookId: args.lookId,
      isRead: false,
      createdAt: now,
    });

    return {
      success: true,
      messageId,
    };
  },
});

/**
 * Mark a direct message as read
 */
export const markDirectMessageAsRead = mutation({
  args: {
    messageId: v.id('direct_messages'),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { messageId: Id<'direct_messages'> }
  ): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false };
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.recipientId !== user._id) {
      return { success: false };
    }

    await ctx.db.patch(args.messageId, {
      isRead: true,
    });

    return { success: true };
  },
});

/**
 * Mark all messages from a specific user as read
 */
export const markConversationAsRead = mutation({
  args: {
    otherUserId: v.id('users'),
  },
  returns: v.object({
    success: v.boolean(),
    count: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { otherUserId: Id<'users'> }
  ): Promise<{ success: boolean; count: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, count: 0 };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, count: 0 };
    }

    // Get all unread messages from this user
    const unreadMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_recipient_and_read', (q) =>
        q.eq('recipientId', user._id).eq('isRead', false)
      )
      .filter((q) => q.eq(q.field('senderId'), args.otherUserId))
      .collect();

    // Mark all as read
    let count = 0;
    for (const message of unreadMessages) {
      await ctx.db.patch(message._id, {
        isRead: true,
      });
      count++;
    }

    return { success: true, count };
  },
});

