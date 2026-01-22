import { mutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

/**
 * Toggle love interaction on a look
 * If already loved, removes the love. If not loved, adds love (and removes dislike if exists)
 */
export const toggleLove = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    isLoved: v.boolean(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
    }
  ): Promise<{
    isLoved: boolean;
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

    // Check if look exists
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      throw new Error('Look not found');
    }

    // Find existing love interaction
    const existingLove = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
      .filter((q) => q.eq(q.field('interactionType'), 'love'))
      .unique();

    if (existingLove) {
      // Remove the love
      await ctx.db.delete(existingLove._id);
      return { isLoved: false };
    } else {
      // Remove any existing dislike first
      const existingDislike = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
        .filter((q) => q.eq(q.field('interactionType'), 'dislike'))
        .unique();

      if (existingDislike) {
        await ctx.db.delete(existingDislike._id);
      }

      // Add love interaction
      await ctx.db.insert('look_interactions', {
        lookId: args.lookId,
        userId: user._id,
        interactionType: 'love',
        seenByOwner: false,
        createdAt: Date.now(),
      });

      return { isLoved: true };
    }
  },
});

/**
 * Toggle dislike interaction on a look
 * If already disliked, removes the dislike. If not disliked, adds dislike (and removes love if exists)
 */
export const toggleDislike = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.object({
    isDisliked: v.boolean(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
    }
  ): Promise<{
    isDisliked: boolean;
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

    // Check if look exists
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      throw new Error('Look not found');
    }

    // Find existing dislike interaction
    const existingDislike = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
      .filter((q) => q.eq(q.field('interactionType'), 'dislike'))
      .unique();

    if (existingDislike) {
      // Remove the dislike
      await ctx.db.delete(existingDislike._id);
      return { isDisliked: false };
    } else {
      // Remove any existing love first
      const existingLove = await ctx.db
        .query('look_interactions')
        .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
        .filter((q) => q.eq(q.field('interactionType'), 'love'))
        .unique();

      if (existingLove) {
        await ctx.db.delete(existingLove._id);
      }

      // Add dislike interaction
      await ctx.db.insert('look_interactions', {
        lookId: args.lookId,
        userId: user._id,
        interactionType: 'dislike',
        seenByOwner: false,
        createdAt: Date.now(),
      });

      return { isDisliked: true };
    }
  },
});

/**
 * Record a save interaction when user saves a look to their lookbook
 * This is called alongside the lookbook save to track saves for analytics
 */
export const recordSave = mutation({
  args: {
    lookId: v.id('looks'),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      lookId: Id<'looks'>;
    }
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

    // Check if look exists
    const look = await ctx.db.get(args.lookId);
    if (!look) {
      throw new Error('Look not found');
    }

    // Check if already saved (don't duplicate save interactions)
    const existingSave = await ctx.db
      .query('look_interactions')
      .withIndex('by_look_and_user', (q) => q.eq('lookId', args.lookId).eq('userId', user._id))
      .filter((q) => q.eq(q.field('interactionType'), 'save'))
      .unique();

    if (!existingSave) {
      // Add save interaction
      await ctx.db.insert('look_interactions', {
        lookId: args.lookId,
        userId: user._id,
        interactionType: 'save',
        seenByOwner: false,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Mark activity notifications as seen
 */
export const markActivityAsSeen = mutation({
  args: {
    interactionIds: v.array(v.id('look_interactions')),
  },
  returns: v.null(),
  handler: async (
    ctx: MutationCtx,
    args: {
      interactionIds: Array<Id<'look_interactions'>>;
    }
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

    // Mark each interaction as seen
    for (const interactionId of args.interactionIds) {
      const interaction = await ctx.db.get(interactionId);
      if (interaction) {
        // Verify user owns the look
        const look = await ctx.db.get(interaction.lookId);
        if (look && look.creatorUserId === user._id) {
          await ctx.db.patch(interactionId, { seenByOwner: true });
        }
      }
    }

    return null;
  },
});

