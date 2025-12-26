import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Message validator
const messageValidator = v.object({
  _id: v.id('messages'),
  _creationTime: v.number(),
  threadId: v.id('threads'),
  userId: v.id('users'),
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
  // Message type for special rendering
  messageType: v.optional(
    v.union(
      v.literal('text'),
      v.literal('fitting-ready'),
      v.literal('no-matches')
    )
  ),
  // Look IDs for fitting-ready messages
  lookIds: v.optional(v.array(v.id('looks'))),
  attachments: v.optional(
    v.array(
      v.object({
        type: v.union(v.literal('image'), v.literal('look'), v.literal('item')),
        storageId: v.optional(v.id('_storage')),
        lookId: v.optional(v.id('looks')),
        itemId: v.optional(v.id('items')),
      })
    )
  ),
  model: v.optional(v.string()),
  tokenCount: v.optional(v.number()),
  status: v.union(v.literal('sent'), v.literal('streaming'), v.literal('error')),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
});

/**
 * Get messages for a thread
 */
export const getMessages = query({
  args: {
    threadId: v.id('threads'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    order: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  returns: v.object({
    messages: v.array(messageValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      threadId: Id<'threads'>;
      limit?: number;
      cursor?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<{
    messages: Doc<'messages'>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const order = args.order ?? 'desc';

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .order(order)
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit);

    return {
      messages: paginatedMessages,
      nextCursor: hasMore && paginatedMessages.length > 0 ? paginatedMessages[paginatedMessages.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Get all messages for a thread (for smaller threads)
 */
export const getAllMessages = query({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.array(messageValidator),
  handler: async (ctx: QueryCtx, args: { threadId: Id<'threads'> }): Promise<Doc<'messages'>[]> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      return [];
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .order('asc')
      .collect();

    return messages;
  },
});

/**
 * Get the latest message in a thread
 */
export const getLatestMessage = query({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.union(messageValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { threadId: Id<'threads'> }
  ): Promise<Doc<'messages'> | null> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      return null;
    }

    const message = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .order('desc')
      .first();

    return message;
  },
});

/**
 * Get message count for a thread
 */
export const getMessageCount = query({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.number(),
  handler: async (ctx: QueryCtx, args: { threadId: Id<'threads'> }): Promise<number> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      return 0;
    }

    // Return cached count from thread
    return thread.messageCount;
  },
});

