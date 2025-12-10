import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { isValidUsername } from '../types';

/**
 * Get the current authenticated user
 * Returns the user document for the authenticated user, or null if not authenticated
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      workosUserId: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      profileImageId: v.optional(v.id('_storage')),
      profileImageUrl: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
      age: v.optional(v.string()),
      stylePreferences: v.array(v.string()),
      shirtSize: v.optional(v.string()),
      waistSize: v.optional(v.string()),
      height: v.optional(v.string()),
      heightUnit: v.optional(v.union(v.literal('cm'), v.literal('ft'))),
      shoeSize: v.optional(v.string()),
      shoeSizeUnit: v.optional(v.union(v.literal('EU'), v.literal('US'), v.literal('UK'))),
      country: v.optional(v.string()),
      currency: v.optional(v.string()),
      budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
      phoneNumber: v.optional(v.string()),
      phoneVerified: v.optional(v.boolean()),
      subscriptionTier: v.union(v.literal('free'), v.literal('style_pass'), v.literal('vip')),
      dailyTryOnCount: v.number(),
      dailyTryOnResetAt: v.number(),
      onboardingCompleted: v.boolean(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<Doc<'users'> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // The subject is the WorkOS user ID
    const workosUserId = identity.subject;

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
      .unique();

    return user;
  },
});

/**
 * Get a user by their Convex ID
 */
export const getUser = query({
  args: {
    userId: v.id('users'),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      workosUserId: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      profileImageId: v.optional(v.id('_storage')),
      profileImageUrl: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
      age: v.optional(v.string()),
      stylePreferences: v.array(v.string()),
      shirtSize: v.optional(v.string()),
      waistSize: v.optional(v.string()),
      height: v.optional(v.string()),
      heightUnit: v.optional(v.union(v.literal('cm'), v.literal('ft'))),
      shoeSize: v.optional(v.string()),
      shoeSizeUnit: v.optional(v.union(v.literal('EU'), v.literal('US'), v.literal('UK'))),
      country: v.optional(v.string()),
      currency: v.optional(v.string()),
      budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
      phoneNumber: v.optional(v.string()),
      phoneVerified: v.optional(v.boolean()),
      subscriptionTier: v.union(v.literal('free'), v.literal('style_pass'), v.literal('vip')),
      dailyTryOnCount: v.number(),
      dailyTryOnResetAt: v.number(),
      onboardingCompleted: v.boolean(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<Doc<'users'> | null> => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get a user by their WorkOS user ID
 * Used internally for webhook processing and auth flow
 */
export const getUserByWorkosId = query({
  args: {
    workosUserId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      workosUserId: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      profileImageId: v.optional(v.id('_storage')),
      profileImageUrl: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
      ),
      age: v.optional(v.string()),
      stylePreferences: v.array(v.string()),
      shirtSize: v.optional(v.string()),
      waistSize: v.optional(v.string()),
      height: v.optional(v.string()),
      heightUnit: v.optional(v.union(v.literal('cm'), v.literal('ft'))),
      shoeSize: v.optional(v.string()),
      shoeSizeUnit: v.optional(v.union(v.literal('EU'), v.literal('US'), v.literal('UK'))),
      country: v.optional(v.string()),
      currency: v.optional(v.string()),
      budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
      phoneNumber: v.optional(v.string()),
      phoneVerified: v.optional(v.boolean()),
      subscriptionTier: v.union(v.literal('free'), v.literal('style_pass'), v.literal('vip')),
      dailyTryOnCount: v.number(),
      dailyTryOnResetAt: v.number(),
      onboardingCompleted: v.boolean(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { workosUserId: string }
  ): Promise<Doc<'users'> | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', args.workosUserId))
      .unique();

    return user;
  },
});

/**
 * Check if a username is available
 * Returns validation status and availability
 */
export const checkUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  returns: v.object({
    available: v.boolean(),
    valid: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (
    ctx: QueryCtx,
    args: { username: string }
  ): Promise<{
    available: boolean;
    valid: boolean;
    message?: string;
  }> => {
    const username = args.username.toLowerCase().trim();

    // Validate username format
    if (!isValidUsername(username)) {
      return {
        available: false,
        valid: false,
        message:
          'Username must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, and underscores',
      };
    }

    // Check reserved usernames
    const reservedUsernames = [
      'admin',
      'nima',
      'support',
      'help',
      'api',
      'www',
      'app',
      'mail',
      'email',
      'system',
      'root',
      'user',
      'users',
      'account',
      'settings',
      'profile',
      'login',
      'logout',
      'signup',
      'signin',
      'register',
    ];

    if (reservedUsernames.includes(username)) {
      return {
        available: false,
        valid: true,
        message: 'This username is reserved',
      };
    }

    // Check if username is taken
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique();

    if (existingUser) {
      return {
        available: false,
        valid: true,
        message: 'This username is already taken',
      };
    }

    return {
      available: true,
      valid: true,
    };
  },
});

/**
 * Get the current user's profile image URL
 * Resolves either the storage ID or external URL
 */
export const getCurrentUserProfileImage = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<string | null> => {
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

    // If we have a storage ID, get the URL
    if (user.profileImageId) {
      const url = await ctx.storage.getUrl(user.profileImageId);
      return url;
    }

    // Fall back to external URL
    return user.profileImageUrl ?? null;
  },
});

