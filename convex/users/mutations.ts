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
 * 
 * This mutation is IDEMPOTENT - if onboarding is already completed,
 * it will still update the profile data but won't cause errors.
 * This handles cases like localStorage expiring or users signing in
 * from different devices.
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

    // Always update profile data and set onboardingCompleted to true
    // This is idempotent - calling it multiple times has the same effect
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
 * Mark onboarding as complete without requiring all profile data
 * Used when user has images but localStorage expired
 * Only sets the flag if user already has profile data and images
 */
export const markOnboardingComplete = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    _args: Record<string, never>
  ): Promise<{
    success: boolean;
    reason?: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, reason: 'Not authenticated' };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return { success: false, reason: 'User not found' };
    }

    // Already complete
    if (user.onboardingCompleted) {
      return { success: true };
    }

    // Check if user has required profile data
    const hasProfileData = !!user.gender && user.stylePreferences && user.stylePreferences.length > 0;
    if (!hasProfileData) {
      return { success: false, reason: 'Missing profile data' };
    }

    // Check if user has images
    const userImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (!userImages) {
      return { success: false, reason: 'No images uploaded' };
    }

    // All requirements met - mark as complete
    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
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
      role: v.optional(v.union(v.literal('user'), v.literal('admin'), v.literal('seller'))),
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

    // Check if user exists by email FIRST (prevents duplicates)
    let user = email
      ? await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', email))
          .first()
      : null;

    if (!user) {
      // No user with this email - check by workosUserId as fallback
      user = await ctx.db
        .query('users')
        .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', workosUserId))
        .unique();
    }

    if (user) {
      // Update existing user with any missing or changed profile data
      const updates: Partial<{
        workosUserId: string;
        email: string;
        emailVerified: boolean;
        firstName: string;
        lastName: string;
        profileImageUrl: string;
        updatedAt: number;
      }> = {};

      // Link the new WorkOS identity if different
      if (user.workosUserId !== workosUserId) {
        updates.workosUserId = workosUserId;
      }

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

/**
 * Find and merge duplicate users (same email, different records)
 * Keeps the oldest user by _creationTime, migrates all data to it, deletes duplicates
 * 
 * This is a cleanup script meant to be run once to fix existing duplicates.
 * Run via Convex dashboard: npx convex run users/mutations:mergeDuplicateUsers
 */
export const mergeDuplicateUsers = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only logs what would happen
  },
  returns: v.object({
    duplicateEmailsFound: v.number(),
    usersMerged: v.number(),
    usersDeleted: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (
    ctx: MutationCtx,
    args: { dryRun?: boolean }
  ): Promise<{
    duplicateEmailsFound: number;
    usersMerged: number;
    usersDeleted: number;
    errors: Array<string>;
  }> => {
    const dryRun = args.dryRun ?? true; // Default to dry run for safety
    const errors: Array<string> = [];
    let usersMerged = 0;
    let usersDeleted = 0;

    // Get all users
    const allUsers = await ctx.db.query('users').collect();
    
    // Group users by email (lowercase for case-insensitive matching)
    const emailToUsers = new Map<string, Array<Doc<'users'>>>();
    for (const user of allUsers) {
      const email = user.email.toLowerCase();
      const existing = emailToUsers.get(email) || [];
      existing.push(user);
      emailToUsers.set(email, existing);
    }

    // Find emails with duplicates
    const duplicateEmails: Array<string> = [];
    for (const [email, users] of emailToUsers) {
      if (users.length > 1) {
        duplicateEmails.push(email);
      }
    }

    console.log(`Found ${duplicateEmails.length} emails with duplicate accounts`);

    // Process each duplicate group
    for (const email of duplicateEmails) {
      const users = emailToUsers.get(email)!;
      
      // Sort by _creationTime ascending - oldest first
      users.sort((a, b) => a._creationTime - b._creationTime);
      
      const primaryUser = users[0];
      const duplicates = users.slice(1);

      console.log(`Processing email "${email}": keeping user ${primaryUser._id}, merging ${duplicates.length} duplicates`);

      for (const dupUser of duplicates) {
        try {
          // Migrate all related data from duplicate to primary user
          if (!dryRun) {
            // user_images - migrate and dedupe primaries
            const userImages = await ctx.db
              .query('user_images')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            
            // Check if primary user already has a primary image
            const primaryUserImages = await ctx.db
              .query('user_images')
              .withIndex('by_user_and_primary', (q) => q.eq('userId', primaryUser._id).eq('isPrimary', true))
              .first();
            const hasPrimary = !!primaryUserImages;
            
            for (const img of userImages) {
              // If primary user already has a primary, unset this one
              const updates: { userId: Id<'users'>; isPrimary?: boolean; updatedAt?: number } = { 
                userId: primaryUser._id 
              };
              if (hasPrimary && img.isPrimary) {
                updates.isPrimary = false;
                updates.updatedAt = Date.now();
              }
              await ctx.db.patch(img._id, updates);
            }

            // lookbooks
            const lookbooks = await ctx.db
              .query('lookbooks')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const lb of lookbooks) {
              await ctx.db.patch(lb._id, { userId: primaryUser._id });
            }

            // lookbook_items
            const lookbookItems = await ctx.db
              .query('lookbook_items')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const item of lookbookItems) {
              await ctx.db.patch(item._id, { userId: primaryUser._id });
            }

            // threads
            const threads = await ctx.db
              .query('threads')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const thread of threads) {
              await ctx.db.patch(thread._id, { userId: primaryUser._id });
            }

            // messages
            const messages = await ctx.db
              .query('messages')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const msg of messages) {
              await ctx.db.patch(msg._id, { userId: primaryUser._id });
            }

            // look_images
            const lookImages = await ctx.db
              .query('look_images')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const li of lookImages) {
              await ctx.db.patch(li._id, { userId: primaryUser._id });
            }

            // item_try_ons
            const itemTryOns = await ctx.db
              .query('item_try_ons')
              .withIndex('by_user', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const ito of itemTryOns) {
              await ctx.db.patch(ito._id, { userId: primaryUser._id });
            }

            // friendships - requester
            const friendshipsAsRequester = await ctx.db
              .query('friendships')
              .withIndex('by_requester', (q) => q.eq('requesterId', dupUser._id))
              .collect();
            for (const fr of friendshipsAsRequester) {
              // Check if this friendship already exists for primary user
              const existing = await ctx.db
                .query('friendships')
                .withIndex('by_users', (q) => 
                  q.eq('requesterId', primaryUser._id).eq('addresseeId', fr.addresseeId)
                )
                .unique();
              if (!existing) {
                await ctx.db.patch(fr._id, { requesterId: primaryUser._id });
              } else {
                // Duplicate friendship - delete it
                await ctx.db.delete(fr._id);
              }
            }

            // friendships - addressee
            const friendshipsAsAddressee = await ctx.db
              .query('friendships')
              .withIndex('by_addressee', (q) => q.eq('addresseeId', dupUser._id))
              .collect();
            for (const fr of friendshipsAsAddressee) {
              const existing = await ctx.db
                .query('friendships')
                .withIndex('by_users', (q) => 
                  q.eq('requesterId', fr.requesterId).eq('addresseeId', primaryUser._id)
                )
                .unique();
              if (!existing) {
                await ctx.db.patch(fr._id, { addresseeId: primaryUser._id });
              } else {
                await ctx.db.delete(fr._id);
              }
            }

            // direct_messages - sender
            const dmsAsSender = await ctx.db
              .query('direct_messages')
              .withIndex('by_sender', (q) => q.eq('senderId', dupUser._id))
              .collect();
            for (const dm of dmsAsSender) {
              await ctx.db.patch(dm._id, { senderId: primaryUser._id });
            }

            // direct_messages - recipient
            const dmsAsRecipient = await ctx.db
              .query('direct_messages')
              .withIndex('by_recipient', (q) => q.eq('recipientId', dupUser._id))
              .collect();
            for (const dm of dmsAsRecipient) {
              await ctx.db.patch(dm._id, { recipientId: primaryUser._id });
            }

            // user_wrapped
            const wrappedRecords = await ctx.db
              .query('user_wrapped')
              .withIndex('by_user_and_year', (q) => q.eq('userId', dupUser._id))
              .collect();
            for (const wr of wrappedRecords) {
              // Check if primary already has wrapped for this year
              const existing = await ctx.db
                .query('user_wrapped')
                .withIndex('by_user_and_year', (q) => 
                  q.eq('userId', primaryUser._id).eq('year', wr.year)
                )
                .unique();
              if (!existing) {
                await ctx.db.patch(wr._id, { userId: primaryUser._id });
              } else {
                // Primary already has wrapped for this year - delete duplicate
                await ctx.db.delete(wr._id);
              }
            }

            // Transfer any useful data from duplicate to primary
            // (e.g., if duplicate completed onboarding but primary didn't)
            const updates: Partial<Doc<'users'>> = {};
            if (dupUser.onboardingCompleted && !primaryUser.onboardingCompleted) {
              updates.onboardingCompleted = true;
              // Also copy onboarding data
              if (dupUser.gender && !primaryUser.gender) updates.gender = dupUser.gender;
              if (dupUser.age && !primaryUser.age) updates.age = dupUser.age;
              if (dupUser.stylePreferences.length > 0 && primaryUser.stylePreferences.length === 0) {
                updates.stylePreferences = dupUser.stylePreferences;
              }
              if (dupUser.shirtSize && !primaryUser.shirtSize) updates.shirtSize = dupUser.shirtSize;
              if (dupUser.waistSize && !primaryUser.waistSize) updates.waistSize = dupUser.waistSize;
              if (dupUser.height && !primaryUser.height) updates.height = dupUser.height;
              if (dupUser.heightUnit && !primaryUser.heightUnit) updates.heightUnit = dupUser.heightUnit;
              if (dupUser.shoeSize && !primaryUser.shoeSize) updates.shoeSize = dupUser.shoeSize;
              if (dupUser.shoeSizeUnit && !primaryUser.shoeSizeUnit) updates.shoeSizeUnit = dupUser.shoeSizeUnit;
              if (dupUser.country && !primaryUser.country) updates.country = dupUser.country;
              if (dupUser.currency && !primaryUser.currency) updates.currency = dupUser.currency;
              if (dupUser.budgetRange && !primaryUser.budgetRange) updates.budgetRange = dupUser.budgetRange;
            }
            
            // Keep the most recent WorkOS user ID (active auth)
            updates.workosUserId = dupUser.workosUserId;
            updates.updatedAt = Date.now();

            if (Object.keys(updates).length > 0) {
              await ctx.db.patch(primaryUser._id, updates);
            }

            // Delete the duplicate user
            await ctx.db.delete(dupUser._id);
            usersDeleted++;
          }

          usersMerged++;
          console.log(`  Merged duplicate ${dupUser._id} into primary ${primaryUser._id}`);
        } catch (error) {
          const errMsg = `Error merging user ${dupUser._id}: ${error}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    }

    const result = {
      duplicateEmailsFound: duplicateEmails.length,
      usersMerged,
      usersDeleted,
      errors,
    };

    console.log(`Merge complete:`, result);
    if (dryRun) {
      console.log('DRY RUN - no changes were made. Run with dryRun: false to apply changes.');
    }

    return result;
  },
});

