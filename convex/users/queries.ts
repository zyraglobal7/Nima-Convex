import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Id, Doc } from '../_generated/dataModel';
import { isValidUsername } from '../types';

/**
 * Get the onboarding state for the current user
 * Returns whether user has profile data and images, plus missing fields
 * Used to determine if user needs to complete onboarding steps
 */
export const getOnboardingState = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    hasUser: v.boolean(),
    hasProfileData: v.boolean(),
    hasImages: v.boolean(),
    imageCount: v.number(),
    onboardingCompleted: v.boolean(),
    missingFields: v.array(v.string()),
  }),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<{
    isAuthenticated: boolean;
    hasUser: boolean;
    hasProfileData: boolean;
    hasImages: boolean;
    imageCount: number;
    onboardingCompleted: boolean;
    missingFields: string[];
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        isAuthenticated: false,
        hasUser: false,
        hasProfileData: false,
        hasImages: false,
        imageCount: 0,
        onboardingCompleted: false,
        missingFields: [],
      };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return {
        isAuthenticated: true,
        hasUser: false,
        hasProfileData: false,
        hasImages: false,
        imageCount: 0,
        onboardingCompleted: false,
        missingFields: [],
      };
    }

    // Check which profile fields are missing
    const missingFields: string[] = [];
    if (!user.gender) missingFields.push('gender');
    if (!user.stylePreferences || user.stylePreferences.length === 0) missingFields.push('stylePreferences');
    if (!user.shirtSize) missingFields.push('shirtSize');
    if (!user.waistSize) missingFields.push('waistSize');
    if (!user.height) missingFields.push('height');
    if (!user.shoeSize) missingFields.push('shoeSize');
    if (!user.country) missingFields.push('country');
    if (!user.budgetRange) missingFields.push('budgetRange');

    // Profile is complete if we have at least gender and style preferences
    const hasProfileData = !!user.gender && user.stylePreferences && user.stylePreferences.length > 0;

    // Count images linked to this user
    const userImages = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const imageCount = userImages.length;
    const hasImages = imageCount > 0;

    return {
      isAuthenticated: true,
      hasUser: true,
      hasProfileData,
      hasImages,
      imageCount,
      onboardingCompleted: user.onboardingCompleted,
      missingFields,
    };
  },
});

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
      role: v.optional(v.union(v.literal('user'), v.literal('admin'), v.literal('seller'))),
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
      role: v.optional(v.union(v.literal('user'), v.literal('admin'), v.literal('seller'))),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'> }
  ): Promise<Doc<'users'> | null> => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Resolve profile image URL if we have a storage ID
    let profileImageUrl = user.profileImageUrl;
    if (user.profileImageId && !profileImageUrl) {
      const url = await ctx.storage.getUrl(user.profileImageId);
      profileImageUrl = url ?? undefined;
    }

    return {
      ...user,
      profileImageUrl,
    };
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
      role: v.optional(v.union(v.literal('user'), v.literal('admin'), v.literal('seller'))),
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

/**
 * Search users by username, email, first name, or last name
 * Supports partial matching for better discoverability
 * Used for finding friends
 */
export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.string(),
      profileImageUrl: v.optional(v.string()),
    })
  ),
  handler: async (
    ctx: QueryCtx,
    args: { query: string; limit?: number }
  ): Promise<
    Array<{
      _id: Id<'users'>;
      _creationTime: number;
      username?: string;
      firstName?: string;
      lastName?: string;
      email: string;
      profileImageUrl?: string;
    }>
  > => {
    const searchTerm = args.query.toLowerCase().trim();
    const limit = Math.min(args.limit ?? 10, 20);

    console.log(`[SEARCH_USERS] Starting search with term: "${searchTerm}"`);

    if (searchTerm.length < 2) {
      console.log(`[SEARCH_USERS] Search term too short (${searchTerm.length} chars), returning empty`);
      return [];
    }

    const userMap = new Map<Id<'users'>, Doc<'users'>>();

    // Step 1: Try exact matches first (most relevant)
    console.log(`[SEARCH_USERS] Step 1: Checking exact matches...`);
    
    // Exact username match
    if (searchTerm.length >= 2) {
      try {
        const usernameResults = await ctx.db
          .query('users')
          .withIndex('by_username', (q) => q.eq('username', searchTerm))
          .filter((q) => q.eq(q.field('isActive'), true))
          .take(limit);
        
        console.log(`[SEARCH_USERS] Found ${usernameResults.length} exact username matches`);
        usernameResults.forEach((user) => {
          userMap.set(user._id, user);
        });
      } catch (error) {
        console.error(`[SEARCH_USERS] Error in exact username search:`, error);
      }
    }

    // Exact email match
    try {
      const emailResults = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', searchTerm))
        .filter((q) => q.eq(q.field('isActive'), true))
        .take(limit);
      
      console.log(`[SEARCH_USERS] Found ${emailResults.length} exact email matches`);
      emailResults.forEach((user) => {
        userMap.set(user._id, user);
      });
    } catch (error) {
      console.error(`[SEARCH_USERS] Error in exact email search:`, error);
    }

    // Step 2: If we don't have enough results, do partial matching
    if (userMap.size < limit) {
      console.log(`[SEARCH_USERS] Step 2: Only ${userMap.size} exact matches, doing partial search...`);
      
      try {
        // Query all active users (with a reasonable limit for performance)
        // We'll filter in memory for partial matches
        const allUsers = await ctx.db
          .query('users')
          .filter((q) => q.eq(q.field('isActive'), true))
          .take(100); // Limit to first 100 active users for performance
        
        console.log(`[SEARCH_USERS] Checking ${allUsers.length} active users for partial matches...`);
        
        let partialMatchCount = 0;
        for (const user of allUsers) {
          // Skip if already in results
          if (userMap.has(user._id)) {
            continue;
          }

          // Check if search term matches any field (case-insensitive partial match)
          const matchesUsername = user.username?.toLowerCase().includes(searchTerm);
          const matchesEmail = user.email.toLowerCase().includes(searchTerm);
          const matchesFirstName = user.firstName?.toLowerCase().includes(searchTerm);
          const matchesLastName = user.lastName?.toLowerCase().includes(searchTerm);
          const matchesFullName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm)
            : false;

          if (matchesUsername || matchesEmail || matchesFirstName || matchesLastName || matchesFullName) {
            userMap.set(user._id, user);
            partialMatchCount++;
            
            // Stop if we've reached the limit
            if (userMap.size >= limit) {
              break;
            }
          }
        }
        
        console.log(`[SEARCH_USERS] Found ${partialMatchCount} additional partial matches`);
      } catch (error) {
        console.error(`[SEARCH_USERS] Error in partial search:`, error);
      }
    }

    // Convert to array and format results
    const results = Array.from(userMap.values())
      .slice(0, limit)
      .map((user) => {
        let profileImageUrl: string | undefined = undefined;
        if (user.profileImageId) {
          // Note: We can't await in map, so we'll return the ID and resolve URLs in component
          // Or we could use Promise.all, but for simplicity, we'll return the external URL if available
          profileImageUrl = user.profileImageUrl;
        } else if (user.profileImageUrl) {
          profileImageUrl = user.profileImageUrl;
        }

        return {
          _id: user._id,
          _creationTime: user._creationTime,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImageUrl,
        };
      });

    console.log(`[SEARCH_USERS] Returning ${results.length} results for search term: "${searchTerm}"`);
    if (results.length > 0) {
      console.log(`[SEARCH_USERS] Sample results:`, results.slice(0, 3).map(r => ({
        email: r.email,
        username: r.username,
        name: `${r.firstName} ${r.lastName}`.trim() || 'N/A'
      })));
    }

    return results;
  },
});

