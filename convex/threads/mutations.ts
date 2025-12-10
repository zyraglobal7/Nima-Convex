import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Create a new thread
 */
export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    contextType: v.optional(
      v.union(v.literal('general'), v.literal('look'), v.literal('item'), v.literal('outfit_help'))
    ),
    contextLookId: v.optional(v.id('looks')),
    contextItemId: v.optional(v.id('items')),
  },
  returns: v.id('threads'),
  handler: async (
    ctx: MutationCtx,
    args: {
      title?: string;
      contextType?: 'general' | 'look' | 'item' | 'outfit_help';
      contextLookId?: Id<'looks'>;
      contextItemId?: Id<'items'>;
    }
  ): Promise<Id<'threads'>> => {
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

    // Validate context references if provided
    if (args.contextLookId) {
      const look = await ctx.db.get(args.contextLookId);
      if (!look || !look.isActive) {
        throw new Error('Look not found');
      }
    }

    if (args.contextItemId) {
      const item = await ctx.db.get(args.contextItemId);
      if (!item || !item.isActive) {
        throw new Error('Item not found');
      }
    }

    const now = Date.now();
    const threadId = await ctx.db.insert('threads', {
      userId: user._id,
      title: args.title,
      contextType: args.contextType ?? 'general',
      contextLookId: args.contextLookId,
      contextItemId: args.contextItemId,
      isArchived: false,
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

/**
 * Update thread title
 */
export const updateThreadTitle = mutation({
  args: {
    threadId: v.id('threads'),
    title: v.string(),
  },
  returns: v.id('threads'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      title: string;
    }
  ): Promise<Id<'threads'>> => {
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (thread.userId !== user._id) {
      throw new Error('Not authorized to modify this thread');
    }

    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return args.threadId;
  },
});

/**
 * Archive a thread
 */
export const archiveThread = mutation({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { threadId: Id<'threads'> }): Promise<boolean> => {
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (thread.userId !== user._id) {
      throw new Error('Not authorized to archive this thread');
    }

    await ctx.db.patch(args.threadId, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Unarchive a thread
 */
export const unarchiveThread = mutation({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { threadId: Id<'threads'> }): Promise<boolean> => {
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (thread.userId !== user._id) {
      throw new Error('Not authorized to unarchive this thread');
    }

    await ctx.db.patch(args.threadId, {
      isArchived: false,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Delete a thread and all its messages
 */
export const deleteThread = mutation({
  args: {
    threadId: v.id('threads'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { threadId: Id<'threads'> }): Promise<boolean> => {
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

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Verify ownership
    if (thread.userId !== user._id) {
      throw new Error('Not authorized to delete this thread');
    }

    // Delete all messages in the thread
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);

    return true;
  },
});

/**
 * Update thread metadata (internal - called after message is sent)
 */
export const updateThreadMetadata = internalMutation({
  args: {
    threadId: v.id('threads'),
    incrementMessageCount: v.optional(v.boolean()),
    title: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      incrementMessageCount?: boolean;
      title?: string;
    }
  ): Promise<null> => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const updates: Record<string, unknown> = {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (args.incrementMessageCount) {
      updates.messageCount = thread.messageCount + 1;
    }

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    await ctx.db.patch(args.threadId, updates);
    return null;
  },
});

