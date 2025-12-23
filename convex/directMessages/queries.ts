import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';

/**
 * Get all conversations for the current user
 * Returns list of users they've exchanged messages with, with latest message info
 */
export const getConversations = query({
  args: {},
  returns: v.array(
    v.object({
      otherUser: v.object({
        _id: v.id('users'),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        username: v.optional(v.string()),
        profileImageUrl: v.optional(v.string()),
      }),
      lastMessage: v.union(
        v.object({
          lookId: v.id('looks'),
          lookPublicId: v.string(),
          createdAt: v.number(),
          isRead: v.boolean(),
          sentByMe: v.boolean(),
        }),
        v.null()
      ),
      unreadCount: v.number(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<
    Array<{
      otherUser: {
        _id: Id<'users'>;
        firstName?: string;
        lastName?: string;
        username?: string;
        profileImageUrl?: string;
      };
      lastMessage: {
        lookId: Id<'looks'>;
        lookPublicId: string;
        createdAt: number;
        isRead: boolean;
        sentByMe: boolean;
      } | null;
      unreadCount: number;
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

    // Get all messages where user is sender or recipient
    const sentMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_sender', (q) => q.eq('senderId', user._id))
      .collect();

    const receivedMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_recipient', (q) => q.eq('recipientId', user._id))
      .collect();

    // Group by other user ID
    const conversationMap = new Map<
      Id<'users'>,
      {
        messages: Array<Doc<'direct_messages'>>;
        unreadCount: number;
      }
    >();

    // Process sent messages
    for (const message of sentMessages) {
      const otherUserId = message.recipientId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, { messages: [], unreadCount: 0 });
      }
      conversationMap.get(otherUserId)!.messages.push(message);
    }

    // Process received messages
    for (const message of receivedMessages) {
      const otherUserId = message.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, { messages: [], unreadCount: 0 });
      }
      const conv = conversationMap.get(otherUserId)!;
      conv.messages.push(message);
      if (!message.isRead) {
        conv.unreadCount++;
      }
    }

    // Build result with user info and latest message
    const conversations = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherUserId, conv]) => {
        // Get other user info
        const otherUser = await ctx.db.get(otherUserId);
        if (!otherUser) {
          return null;
        }

        // Get profile image URL
        let profileImageUrl: string | undefined = undefined;
        if (otherUser.profileImageId) {
          const url = await ctx.storage.getUrl(otherUser.profileImageId);
          profileImageUrl = url ?? undefined;
        } else if (otherUser.profileImageUrl) {
          profileImageUrl = otherUser.profileImageUrl;
        }

        // Sort messages by createdAt and get latest
        const sortedMessages = conv.messages.sort((a, b) => b.createdAt - a.createdAt);
        const lastMessage = sortedMessages[0];

        // Get look info for last message
        let lastMessageData = null;
        if (lastMessage) {
          const look = await ctx.db.get(lastMessage.lookId);
          if (look) {
            lastMessageData = {
              lookId: look._id,
              lookPublicId: look.publicId,
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.isRead,
              sentByMe: lastMessage.senderId === user._id,
            };
          }
        }

        return {
          otherUser: {
            _id: otherUser._id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            username: otherUser.username,
            profileImageUrl,
          },
          lastMessage: lastMessageData,
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Filter out nulls and sort by last message time
    const validConversations = conversations.filter(
      (c): c is NonNullable<typeof conversations[0]> => c !== null
    );

    // Sort by last message time (most recent first)
    validConversations.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || 0;
      const timeB = b.lastMessage?.createdAt || 0;
      return timeB - timeA;
    });

    return validConversations;
  },
});

/**
 * Get conversation messages between current user and another user
 */
export const getConversationMessages = query({
  args: {
    otherUserId: v.id('users'),
  },
  returns: v.array(
    v.object({
      _id: v.id('direct_messages'),
      lookId: v.id('looks'),
      lookPublicId: v.string(),
      lookName: v.optional(v.string()),
      lookImageUrl: v.union(v.string(), v.null()),
      sentByMe: v.boolean(),
      createdAt: v.number(),
      isRead: v.boolean(),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { otherUserId: Id<'users'> }
  ): Promise<
    Array<{
      _id: Id<'direct_messages'>;
      lookId: Id<'looks'>;
      lookPublicId: string;
      lookName?: string;
      lookImageUrl: string | null;
      sentByMe: boolean;
      createdAt: number;
      isRead: boolean;
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

    // Get all messages between these two users
    const sentMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_sender', (q) => q.eq('senderId', user._id))
      .filter((q) => q.eq(q.field('recipientId'), args.otherUserId))
      .collect();

    const receivedMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_recipient', (q) => q.eq('recipientId', user._id))
      .filter((q) => q.eq(q.field('senderId'), args.otherUserId))
      .collect();

    const allMessages = [...sentMessages, ...receivedMessages];

    // Get look details for each message
    const messagesWithDetails = await Promise.all(
      allMessages.map(async (message) => {
        const look = await ctx.db.get(message.lookId);
        if (!look) {
          return null;
        }

        // Get look image
        const lookImage = await ctx.db
          .query('look_images')
          .withIndex('by_look', (q) => q.eq('lookId', look._id))
          .first();

        let lookImageUrl: string | null = null;
        if (lookImage?.storageId) {
          lookImageUrl = await ctx.storage.getUrl(lookImage.storageId);
        }

        return {
          _id: message._id,
          lookId: look._id,
          lookPublicId: look.publicId,
          lookName: look.name,
          lookImageUrl,
          sentByMe: message.senderId === user._id,
          createdAt: message.createdAt,
          isRead: message.isRead,
        };
      })
    );

    // Filter out nulls and sort by time
    const validMessages = messagesWithDetails.filter(
      (m): m is NonNullable<typeof messagesWithDetails[0]> => m !== null
    );

    validMessages.sort((a, b) => a.createdAt - b.createdAt); // Oldest first

    return validMessages;
  },
});

/**
 * Get unread message count for current user
 */
export const getUnreadMessageCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return 0;
    }

    const unreadMessages = await ctx.db
      .query('direct_messages')
      .withIndex('by_recipient_and_read', (q) =>
        q.eq('recipientId', user._id).eq('isRead', false)
      )
      .collect();

    return unreadMessages.length;
  },
});

