import { internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { getStartOfDayUTC } from '../types';

/**
 * Handle WorkOS user.created event
 * Creates a new user in the database
 */
export const handleUserCreated = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (
    ctx: MutationCtx,
    args: {
      workosUserId: string;
      email: string;
      emailVerified: boolean;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    }
  ): Promise<Id<'users'>> => {
    // Check if user exists by email FIRST (prevents duplicates)
    let existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();

    if (!existingUser) {
      // No user with this email - check by workosUserId as fallback
      existingUser = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', args.workosUserId))
        .unique();
    }

    if (existingUser) {
      // Update existing user - link the new WorkOS identity if different
      await ctx.db.patch(existingUser._id, {
        workosUserId: args.workosUserId, // Link new auth identity
        email: args.email,
        emailVerified: args.emailVerified,
        firstName: args.firstName,
        lastName: args.lastName,
        profileImageUrl: args.profileImageUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId: args.workosUserId,
      email: args.email,
      emailVerified: args.emailVerified,
      firstName: args.firstName,
      lastName: args.lastName,
      profileImageUrl: args.profileImageUrl,
      stylePreferences: [],
      subscriptionTier: 'free',
      dailyTryOnCount: 0,
      dailyTryOnResetAt: getStartOfDayUTC(),
      onboardingCompleted: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Handle WorkOS user.updated event
 * Updates user info when changed in WorkOS
 */
export const handleUserUpdated = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  returns: v.union(v.id('users'), v.null()),
  handler: async (
    ctx: MutationCtx,
    args: {
      workosUserId: string;
      email?: string;
      emailVerified?: boolean;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    }
  ): Promise<Id<'users'> | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', args.workosUserId))
      .unique();

    if (!user) {
      // User not found - this is expected for new sign-ups
      return null;
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.email !== undefined) updates.email = args.email;
    if (args.emailVerified !== undefined) updates.emailVerified = args.emailVerified;
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.profileImageUrl !== undefined) updates.profileImageUrl = args.profileImageUrl;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

/**
 * Handle WorkOS user.deleted event
 * Deactivates user when deleted in WorkOS
 */
export const handleUserDeleted = internalMutation({
  args: {
    workosUserId: v.string(),
  },
  returns: v.union(v.id('users'), v.null()),
  handler: async (
    ctx: MutationCtx,
    args: { workosUserId: string }
  ): Promise<Id<'users'> | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', args.workosUserId))
      .unique();

    if (!user) {
      // User not found - already deleted or never existed
      return null;
    }

    await ctx.db.patch(user._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

