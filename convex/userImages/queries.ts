import { query, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';

// Shared validator for user image object (matching updated schema)
const userImageValidator = v.object({
  _id: v.id('user_images'),
  _creationTime: v.number(),
  userId: v.optional(v.id('users')), // Optional to support onboarding uploads
  storageId: v.id('_storage'),
  onboardingToken: v.optional(v.string()), // Token for pre-auth uploads
  filename: v.optional(v.string()),
  contentType: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
  imageType: v.union(
    v.literal('full_body'),
    v.literal('upper_body'),
    v.literal('face'),
    v.literal('other')
  ),
  isPrimary: v.boolean(),
  status: v.union(
    v.literal('onboarding'),
    v.literal('pending'),
    v.literal('processed'),
    v.literal('failed')
  ),
  processedUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

// Return type for user image with URL
type UserImageWithUrl = Doc<'user_images'> & { url: string | null };

/**
 * Get all images for the current user
 */
export const getUserImages = query({
  args: {},
  returns: v.array(userImageValidator),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<UserImageWithUrl[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get all images for this user
    const images = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Resolve URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return {
          ...image,
          url,
        };
      })
    );

    return imagesWithUrls;
  },
});

/**
 * Get the primary image for the current user
 */
export const getPrimaryImage = query({
  args: {},
  returns: v.union(userImageValidator, v.null()),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<UserImageWithUrl | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get primary image (use .first() to handle duplicate primaries gracefully)
    const primaryImage = await ctx.db
      .query('user_images')
      .withIndex('by_user_and_primary', (q) => q.eq('userId', user._id).eq('isPrimary', true))
      .first();

    if (!primaryImage) {
      return null;
    }

    const url = await ctx.storage.getUrl(primaryImage.storageId);
    return {
      ...primaryImage,
      url,
    };
  },
});

/**
 * Get the count of images for the current user
 */
export const getUserImageCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx: QueryCtx, _args: Record<string, never>): Promise<number> => {
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

    const images = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    return images.length;
  },
});

/**
 * Get onboarding images by token
 * Used to show existing images when user returns to onboarding
 * No authentication required - uses onboarding token
 */
export const getOnboardingImages = query({
  args: {
    onboardingToken: v.string(),
  },
  returns: v.array(userImageValidator),
  handler: async (
    ctx: QueryCtx,
    args: { onboardingToken: string }
  ): Promise<UserImageWithUrl[]> => {
    // Validate token format
    if (!args.onboardingToken.startsWith('onb_') || args.onboardingToken.length < 30) {
      return [];
    }

    // Get all images for this onboarding token
    const images = await ctx.db
      .query('user_images')
      .withIndex('by_onboarding_token', (q) => q.eq('onboardingToken', args.onboardingToken))
      .collect();

    // Resolve URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return {
          ...image,
          url,
        };
      })
    );

    return imagesWithUrls;
  },
});

/**
 * Get existing images for the current authenticated user
 * Used to show existing images when authenticated user returns to onboarding
 */
export const getExistingUserImages = query({
  args: {},
  returns: v.array(userImageValidator),
  handler: async (
    ctx: QueryCtx,
    _args: Record<string, never>
  ): Promise<UserImageWithUrl[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_workos_user_id', (q) => q.eq('workosUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get all images for this user
    const images = await ctx.db
      .query('user_images')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Resolve URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return {
          ...image,
          url,
        };
      })
    );

    return imagesWithUrls;
  },
});
