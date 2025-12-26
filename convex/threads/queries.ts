import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types';

// Thread validator
const threadValidator = v.object({
  _id: v.id('threads'),
  _creationTime: v.number(),
  userId: v.id('users'),
  title: v.optional(v.string()),
  contextType: v.optional(
    v.union(v.literal('general'), v.literal('look'), v.literal('item'), v.literal('outfit_help'))
  ),
  contextLookId: v.optional(v.id('looks')),
  contextItemId: v.optional(v.id('items')),
  isArchived: v.optional(v.boolean()),
  lastMessageAt: v.number(),
  messageCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Message validator for preview
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
 * Get a thread by ID
 */
export const getThread = query({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.union(threadValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    args: { threadId: Id<'threads'> }
  ): Promise<Doc<'threads'> | null> => {
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    // Verify ownership
    if (thread.userId !== user._id) {
      return null;
    }

    return thread;
  },
});

/**
 * List threads for the current user
 */
export const listThreads = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    threads: v.array(threadValidator),
    nextCursor: v.union(v.string(), v.null()),
    hasMore: v.boolean(),
  }),
  handler: async (
    ctx: QueryCtx,
    args: {
      includeArchived?: boolean;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    threads: Doc<'threads'>[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const limit = Math.min(args.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let threads;
    if (args.includeArchived) {
      threads = await ctx.db
        .query('threads')
        .withIndex('by_user_and_last_message', (q) => q.eq('userId', user._id))
        .order('desc')
        .take(limit + 1);
    } else {
      threads = await ctx.db
        .query('threads')
        .withIndex('by_user_and_archived', (q) => q.eq('userId', user._id).eq('isArchived', false))
        .order('desc')
        .take(limit + 1);
    }

    const hasMore = threads.length > limit;
    const paginatedThreads = threads.slice(0, limit);

    return {
      threads: paginatedThreads,
      nextCursor: hasMore && paginatedThreads.length > 0 ? paginatedThreads[paginatedThreads.length - 1]._id : null,
      hasMore,
    };
  },
});

/**
 * Get threads with last message preview
 */
export const listThreadsWithPreview = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      thread: threadValidator,
      lastMessage: v.union(messageValidator, v.null()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: {
      includeArchived?: boolean;
      limit?: number;
    }
  ): Promise<
    Array<{
      thread: Doc<'threads'>;
      lastMessage: Doc<'messages'> | null;
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

    let threads;
    if (args.includeArchived) {
      threads = await ctx.db
        .query('threads')
        .withIndex('by_user_and_last_message', (q) => q.eq('userId', user._id))
        .order('desc')
        .take(limit);
    } else {
      threads = await ctx.db
        .query('threads')
        .withIndex('by_user_and_archived', (q) => q.eq('userId', user._id).eq('isArchived', false))
        .order('desc')
        .take(limit);
    }

    // Get last message for each thread
    const threadsWithPreviews = await Promise.all(
      threads.map(async (thread) => {
        const lastMessage = await ctx.db
          .query('messages')
          .withIndex('by_thread', (q) => q.eq('threadId', thread._id))
          .order('desc')
          .first();

        return {
          thread,
          lastMessage,
        };
      })
    );

    return threadsWithPreviews;
  },
});

/**
 * Get the most recent active thread for the current user
 */
export const getMostRecentThread = query({
  args: {},
  returns: v.union(threadValidator, v.null()),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<Doc<'threads'> | null> => {
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

    const thread = await ctx.db
      .query('threads')
      .withIndex('by_user_and_archived', (q) => q.eq('userId', user._id).eq('isArchived', false))
      .order('desc')
      .first();

    return thread;
  },
});

