import { mutation, internalMutation, MutationCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { isValidUsername, getStartOfDayUTC } from '../types';
import { sanitizeName, sanitizeUsername, sanitizePhone, sanitizeText, sanitizeTags } from '../lib/sanitize';

/**
 * Create a new user from WorkOS webhook
 * This is called internally when a user signs up via WorkOS
 */
export const createUser = internalMutation({
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
    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', args.workosUserId))
      .unique();

    if (existingUser) {
      // Update existing user with latest info from WorkOS
      await ctx.db.patch(existingUser._id, {
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
 * Update user from WorkOS webhook
 * Called when user info is updated in WorkOS
 */
export const updateUserFromWorkOS = internalMutation({
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
      return null;
    }

    const updates: Partial<Doc<'users'>> = {
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
 * Deactivate user from WorkOS webhook
 * Called when user is deleted in WorkOS
 */
export const deactivateUser = internalMutation({
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
      return null;
    }

    await ctx.db.patch(user._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

/**
 * Update user profile (authenticated)
 * For updating profile fields like username, name, etc.
 */
export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  returns: v.union(v.id('users'), v.null()),
  handler: async (
    ctx: MutationCtx,
    args: {
      username?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
    }
  ): Promise<Id<'users'> | null> => {
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

    const updates: Partial<Doc<'users'>> = {
      updatedAt: Date.now(),
    };

    // Validate and set username with sanitization
    if (args.username !== undefined) {
      const username = sanitizeUsername(args.username);
      
      if (!isValidUsername(username)) {
        throw new Error('Invalid username format');
      }

      // Check if username is taken by another user
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .unique();

      if (existingUser && existingUser._id !== user._id) {
        throw new Error('Username is already taken');
      }

      updates.username = username;
    }

    // Sanitize name fields
    if (args.firstName !== undefined) updates.firstName = sanitizeName(args.firstName);
    if (args.lastName !== undefined) updates.lastName = sanitizeName(args.lastName);
    if (args.phoneNumber !== undefined) updates.phoneNumber = sanitizePhone(args.phoneNumber);

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

/**
 * Complete onboarding with all collected data
 * Called after user signs up and completes the onboarding wizard
 */
export const completeOnboarding = mutation({
  args: {
    gender: v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say')),
    age: v.string(),
    stylePreferences: v.array(v.string()),
    shirtSize: v.string(),
    waistSize: v.string(),
    height: v.string(),
    heightUnit: v.union(v.literal('cm'), v.literal('ft')),
    shoeSize: v.string(),
    shoeSizeUnit: v.union(v.literal('EU'), v.literal('US'), v.literal('UK')),
    country: v.string(),
    currency: v.string(),
    budgetRange: v.union(v.literal('low'), v.literal('mid'), v.literal('premium')),
  },
  returns: v.id('users'),
  handler: async (
    ctx: MutationCtx,
    args: {
      gender: 'male' | 'female' | 'prefer-not-to-say';
      age: string;
      stylePreferences: string[];
      shirtSize: string;
      waistSize: string;
      height: string;
      heightUnit: 'cm' | 'ft';
      shoeSize: string;
      shoeSizeUnit: 'EU' | 'US' | 'UK';
      country: string;
      currency: string;
      budgetRange: 'low' | 'mid' | 'premium';
    }
  ): Promise<Id<'users'>> => {
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

    // Sanitize text inputs
    await ctx.db.patch(user._id, {
      gender: args.gender,
      age: sanitizeText(args.age, 10),
      stylePreferences: sanitizeTags(args.stylePreferences),
      shirtSize: sanitizeText(args.shirtSize, 10),
      waistSize: sanitizeText(args.waistSize, 10),
      height: sanitizeText(args.height, 10),
      heightUnit: args.heightUnit,
      shoeSize: sanitizeText(args.shoeSize, 10),
      shoeSizeUnit: args.shoeSizeUnit,
      country: sanitizeText(args.country, 100),
      currency: sanitizeText(args.currency, 10),
      budgetRange: args.budgetRange,
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

/**
 * Update style preferences
 * For updating just the style tags
 */
export const updateStylePreferences = mutation({
  args: {
    stylePreferences: v.array(v.string()),
  },
  returns: v.id('users'),
  handler: async (
    ctx: MutationCtx,
    args: { stylePreferences: string[] }
  ): Promise<Id<'users'>> => {
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

    await ctx.db.patch(user._id, {
      stylePreferences: sanitizeTags(args.stylePreferences),
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

/**
 * Update size preferences
 * For updating sizing info
 */
export const updateSizePreferences = mutation({
  args: {
    shirtSize: v.optional(v.string()),
    waistSize: v.optional(v.string()),
    height: v.optional(v.string()),
    heightUnit: v.optional(v.union(v.literal('cm'), v.literal('ft'))),
    shoeSize: v.optional(v.string()),
    shoeSizeUnit: v.optional(v.union(v.literal('EU'), v.literal('US'), v.literal('UK'))),
  },
  returns: v.id('users'),
  handler: async (
    ctx: MutationCtx,
    args: {
      shirtSize?: string;
      waistSize?: string;
      height?: string;
      heightUnit?: 'cm' | 'ft';
      shoeSize?: string;
      shoeSizeUnit?: 'EU' | 'US' | 'UK';
    }
  ): Promise<Id<'users'>> => {
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

    const updates: Partial<Doc<'users'>> = {
      updatedAt: Date.now(),
    };

    if (args.shirtSize !== undefined) updates.shirtSize = args.shirtSize;
    if (args.waistSize !== undefined) updates.waistSize = args.waistSize;
    if (args.height !== undefined) updates.height = args.height;
    if (args.heightUnit !== undefined) updates.heightUnit = args.heightUnit;
    if (args.shoeSize !== undefined) updates.shoeSize = args.shoeSize;
    if (args.shoeSizeUnit !== undefined) updates.shoeSizeUnit = args.shoeSizeUnit;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

/**
 * Update budget preferences
 */
export const updateBudgetPreferences = mutation({
  args: {
    budgetRange: v.union(v.literal('low'), v.literal('mid'), v.literal('premium')),
    currency: v.optional(v.string()),
  },
  returns: v.id('users'),
  handler: async (
    ctx: MutationCtx,
    args: {
      budgetRange: 'low' | 'mid' | 'premium';
      currency?: string;
    }
  ): Promise<Id<'users'>> => {
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

    const updates: Partial<Doc<'users'>> = {
      budgetRange: args.budgetRange,
      updatedAt: Date.now(),
    };

    if (args.currency !== undefined) updates.currency = args.currency;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

/**
 * Increment daily try-on count
 * Called when a user generates a try-on image
 */
export const incrementTryOnCount = internalMutation({
  args: {
    userId: v.id('users'),
  },
  returns: v.object({
    success: v.boolean(),
    remaining: v.number(),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { userId: Id<'users'> }
  ): Promise<{ success: boolean; remaining: number }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const startOfToday = getStartOfDayUTC();
    let currentCount = user.dailyTryOnCount;

    // Reset count if it's a new day
    if (user.dailyTryOnResetAt < startOfToday) {
      currentCount = 0;
    }

    // Get limit based on tier
    const limits: Record<string, number> = {
      free: 20,
      style_pass: 100,
      vip: -1, // Unlimited
    };

    const limit = limits[user.subscriptionTier] ?? 20;
    const isUnlimited = limit === -1;

    // Check if user has remaining tries
    if (!isUnlimited && currentCount >= limit) {
      return {
        success: false,
        remaining: 0,
      };
    }

    // Increment count
    const newCount = currentCount + 1;
    await ctx.db.patch(user._id, {
      dailyTryOnCount: newCount,
      dailyTryOnResetAt: startOfToday,
      updatedAt: Date.now(),
    });

    const remaining = isUnlimited ? -1 : limit - newCount;
    return {
      success: true,
      remaining,
    };
  },
});

/**
 * Get or create user (used after auth callback)
 * Creates user if doesn't exist, returns existing user if it does
 * 
 * NOTE: The WorkOS JWT access token only contains minimal claims (subject, issuer, sid).
 * User profile data (email, name, picture) must be passed from the client,
 * which has access to the full WorkOS user object via useAuth().
 */
export const getOrCreateUser = mutation({
  args: {
    // User profile data from WorkOS client-side user object
    // These are optional - if provided, they take precedence over JWT claims
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
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
    ctx: MutationCtx,
    args: {
      email?: string;
      emailVerified?: boolean;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    }
  ): Promise<Doc<'users'> | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const workosUserId = identity.subject;
    
    // Prioritize client-provided data over JWT claims (which are often empty)
    // The client has access to the full WorkOS user object via useAuth()
    let email = args.email || identity.email || '';
    let emailVerified = args.emailVerified ?? identity.emailVerified ?? false;
    let firstName = args.firstName;
    let lastName = args.lastName;
    let profileImageUrl = args.profileImageUrl;

    // Fall back to identity claims if client data not provided
    if (!firstName) {
      firstName = identity.givenName as string | undefined;
    }
    if (!lastName) {
      lastName = identity.familyName as string | undefined;
    }
    if (!profileImageUrl) {
      profileImageUrl = identity.pictureUrl as string | undefined;
    }

    // Cast identity to access potential custom claims from WorkOS
    const identityAny = identity as Record<string, unknown>;
    
    // WorkOS-specific claims (snake_case) as additional fallback
    if (!firstName && identityAny['first_name']) {
      firstName = identityAny['first_name'] as string;
    }
    if (!lastName && identityAny['last_name']) {
      lastName = identityAny['last_name'] as string;
    }
    if (!profileImageUrl && identityAny['profile_picture_url']) {
      profileImageUrl = identityAny['profile_picture_url'] as string;
    }

    // Try to extract from full 'name' claim if individual parts are missing
    if ((!firstName || !lastName) && identity.name) {
      const nameParts = identity.name.split(' ');
      if (nameParts.length >= 2) {
        if (!firstName) firstName = nameParts[0];
        if (!lastName) lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1 && !firstName) {
        firstName = nameParts[0];
      }
    }

    // Fallback: extract name from email if still missing
    if (!firstName && email) {
      const emailName = email.split('@')[0];
      // Convert email prefix to title case (e.g., "john.doe" -> "John")
      const cleanName = emailName.replace(/[._-]/g, ' ').split(' ')[0];
      firstName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    }

    // Check if user exists
    let user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
      .unique();

    if (user) {
      // Update existing user with any missing or changed profile data
      const updates: Partial<{
        email: string;
        emailVerified: boolean;
        firstName: string;
        lastName: string;
        profileImageUrl: string;
        updatedAt: number;
      }> = {};

      // Update fields that are missing in the database but available now
      if (!user.firstName && firstName) {
        updates.firstName = firstName;
      }
      if (!user.lastName && lastName) {
        updates.lastName = lastName;
      }
      if (!user.profileImageUrl && profileImageUrl) {
        updates.profileImageUrl = profileImageUrl;
      }
      // Always update email if it's now available and was empty or changed
      if (email && (!user.email || user.email !== email)) {
        updates.email = email;
        updates.emailVerified = emailVerified;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = Date.now();
        await ctx.db.patch(user._id, updates);
        user = await ctx.db.get(user._id);
      }

      return user;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      workosUserId,
      email,
      emailVerified,
      firstName,
      lastName,
      profileImageUrl,
      stylePreferences: [],
      subscriptionTier: 'free',
      dailyTryOnCount: 0,
      dailyTryOnResetAt: getStartOfDayUTC(),
      onboardingCompleted: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    user = await ctx.db.get(userId);
    return user;
  },
});

