import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { MAX_MESSAGE_LENGTH } from '../types';
import { internal } from '../_generated/api';

// Attachment validator
const attachmentValidator = v.object({
  type: v.union(v.literal('image'), v.literal('look'), v.literal('item')),
  storageId: v.optional(v.id('_storage')),
  lookId: v.optional(v.id('looks')),
  itemId: v.optional(v.id('items')),
});

/**
 * Send a message in a thread
 */
export const sendMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  returns: v.id('messages'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      content: string;
      attachments?: Array<{
        type: 'image' | 'look' | 'item';
        storageId?: Id<'_storage'>;
        lookId?: Id<'looks'>;
        itemId?: Id<'items'>;
      }>;
    }
  ): Promise<Id<'messages'>> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error('Thread not found or access denied');
    }

    // Validate content length
    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
    }

    // Validate attachments if provided
    if (args.attachments) {
      for (const attachment of args.attachments) {
        if (attachment.type === 'look' && attachment.lookId) {
          const look = await ctx.db.get(attachment.lookId);
          if (!look || !look.isActive) {
            throw new Error('Look attachment not found');
          }
        }
        if (attachment.type === 'item' && attachment.itemId) {
          const item = await ctx.db.get(attachment.itemId);
          if (!item || !item.isActive) {
            throw new Error('Item attachment not found');
          }
        }
        if (attachment.type === 'image' && attachment.storageId) {
          const metadata = await ctx.db.system.get(attachment.storageId);
          if (!metadata) {
            throw new Error('Image attachment not found');
          }
        }
      }
    }

    // Create the message
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: user._id,
      role: 'user',
      content: args.content,
      attachments: args.attachments,
      status: 'sent',
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.runMutation(internal.threads.mutations.updateThreadMetadata, {
      threadId: args.threadId,
      incrementMessageCount: true,
    });

    return messageId;
  },
});

/**
 * Save an assistant message (client-callable - for saving AI responses)
 * User must own the thread to save a message
 */
export const saveAssistantMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.id('messages'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      content: string;
      model?: string;
    }
  ): Promise<Id<'messages'>> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error('Thread not found or access denied');
    }

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: user._id,
      role: 'assistant',
      content: args.content,
      model: args.model,
      status: 'sent',
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.runMutation(internal.threads.mutations.updateThreadMetadata, {
      threadId: args.threadId,
      incrementMessageCount: true,
    });

    return messageId;
  },
});

/**
 * Create an assistant message (internal - called from AI action)
 */
export const createAssistantMessage = internalMutation({
  args: {
    threadId: v.id('threads'),
    userId: v.id('users'),
    content: v.string(),
    attachments: v.optional(v.array(attachmentValidator)),
    model: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
    status: v.optional(v.union(v.literal('sent'), v.literal('streaming'), v.literal('error'))),
  },
  returns: v.id('messages'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      userId: Id<'users'>;
      content: string;
      attachments?: Array<{
        type: 'image' | 'look' | 'item';
        storageId?: Id<'_storage'>;
        lookId?: Id<'looks'>;
        itemId?: Id<'items'>;
      }>;
      model?: string;
      tokenCount?: number;
      status?: 'sent' | 'streaming' | 'error';
    }
  ): Promise<Id<'messages'>> => {
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: args.userId,
      role: 'assistant',
      content: args.content,
      attachments: args.attachments,
      model: args.model,
      tokenCount: args.tokenCount,
      status: args.status ?? 'sent',
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.runMutation(internal.threads.mutations.updateThreadMetadata, {
      threadId: args.threadId,
      incrementMessageCount: true,
    });

    return messageId;
  },
});

/**
 * Update a message (internal - for streaming updates)
 */
export const updateMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    content: v.optional(v.string()),
    status: v.optional(v.union(v.literal('sent'), v.literal('streaming'), v.literal('error'))),
    errorMessage: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      messageId: Id<'messages'>;
      content?: string;
      status?: 'sent' | 'streaming' | 'error';
      errorMessage?: string;
      tokenCount?: number;
    }
  ): Promise<null> => {
    const updates: Record<string, unknown> = {};

    if (args.content !== undefined) updates.content = args.content;
    if (args.status !== undefined) updates.status = args.status;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    if (args.tokenCount !== undefined) updates.tokenCount = args.tokenCount;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.messageId, updates);
    }

    return null;
  },
});

/**
 * Delete a message (user can only delete their own messages)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id('messages'),
  },
  returns: v.boolean(),
  handler: async (ctx: MutationCtx, args: { messageId: Id<'messages'> }): Promise<boolean> => {
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

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify thread ownership (user can delete any message in their thread)
    const thread = await ctx.db.get(message.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error('Not authorized to delete this message');
    }

    await ctx.db.delete(args.messageId);

    // Update thread message count
    await ctx.db.patch(thread._id, {
      messageCount: Math.max(0, thread.messageCount - 1),
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Start a new conversation with an initial message
 * Creates a thread and sends the first message in one operation
 */
export const startConversation = mutation({
  args: {
    content: v.string(),
    contextType: v.optional(
      v.union(v.literal('general'), v.literal('look'), v.literal('item'), v.literal('outfit_help'))
    ),
    contextLookId: v.optional(v.id('looks')),
    contextItemId: v.optional(v.id('items')),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  returns: v.object({
    threadId: v.id('threads'),
    messageId: v.id('messages'),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      content: string;
      contextType?: 'general' | 'look' | 'item' | 'outfit_help';
      contextLookId?: Id<'looks'>;
      contextItemId?: Id<'items'>;
      attachments?: Array<{
        type: 'image' | 'look' | 'item';
        storageId?: Id<'_storage'>;
        lookId?: Id<'looks'>;
        itemId?: Id<'items'>;
      }>;
    }
  ): Promise<{
    threadId: Id<'threads'>;
    messageId: Id<'messages'>;
  }> => {
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

    // Validate content length
    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
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

    // Generate a title from the first message (first 50 chars)
    const title = args.content.substring(0, 50) + (args.content.length > 50 ? '...' : '');

    // Create the thread
    const threadId = await ctx.db.insert('threads', {
      userId: user._id,
      title,
      contextType: args.contextType ?? 'general',
      contextLookId: args.contextLookId,
      contextItemId: args.contextItemId,
      isArchived: false,
      lastMessageAt: now,
      messageCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Create the first message
    const messageId = await ctx.db.insert('messages', {
      threadId,
      userId: user._id,
      role: 'user',
      content: args.content,
      attachments: args.attachments,
      status: 'sent',
      createdAt: now,
    });

    return {
      threadId,
      messageId,
    };
  },
});

/**
 * Save a fitting-ready message with look IDs
 * Called when looks are successfully created and images generated
 */
export const saveFittingReadyMessage = mutation({
  args: {
    threadId: v.id('threads'),
    lookIds: v.array(v.id('looks')),
    content: v.optional(v.string()),
  },
  returns: v.id('messages'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      lookIds: Id<'looks'>[];
      content?: string;
    }
  ): Promise<Id<'messages'>> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error('Thread not found or access denied');
    }

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: user._id,
      role: 'assistant',
      content: args.content || `Found ${args.lookIds.length} perfect looks for you!`,
      messageType: 'fitting-ready',
      lookIds: args.lookIds,
      status: 'sent',
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.runMutation(internal.threads.mutations.updateThreadMetadata, {
      threadId: args.threadId,
      incrementMessageCount: true,
    });

    return messageId;
  },
});

/**
 * Save a no-matches message
 * Called when no matching items are found for the user's request
 */
export const saveNoMatchesMessage = mutation({
  args: {
    threadId: v.id('threads'),
    occasion: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.id('messages'),
  handler: async (
    ctx: MutationCtx,
    args: {
      threadId: Id<'threads'>;
      occasion?: string;
      content?: string;
    }
  ): Promise<Id<'messages'>> => {
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

    // Verify thread access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error('Thread not found or access denied');
    }

    const defaultContent = `Oops! I couldn't find enough items in our collection that match your request${args.occasion ? ` for "${args.occasion}"` : ''} right now. 😅

Don't worry though! Here's what you can try:
• Ask for a different occasion (like "casual brunch" or "office meeting")
• Check out the Discover page - I've already created some looks for you there!
• Try being more general (like "casual" instead of "outdoor camping")

We're always adding new items, so check back soon! ✨`;

    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId: user._id,
      role: 'assistant',
      content: args.content || defaultContent,
      messageType: 'no-matches',
      status: 'sent',
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.runMutation(internal.threads.mutations.updateThreadMetadata, {
      threadId: args.threadId,
      incrementMessageCount: true,
    });

    return messageId;
  },
});

